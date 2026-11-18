// app/screens/month.js — מסך החודש ותהליך הרישום
import { MSG_DELETE, MSG_FILL_ALL, dayIso, dayNoon, dayToday, readNum } from '../../core/util.js';
import { idEq } from '../../core/sync.js';
import { MIRROR } from '../../core/mirror.js';
import { ask, closeModal, comboDef, comboHTML, dragDef, methodGridHTML, methodIcon, esc, lookupDragApply, lookupList, openModal, toast,
         uiNoDialog } from '../../core/ui.js';
import { hebDayLabel, hebIsLeap, hebMonthNames, hebToGreg, hebYearInfo, hebYearLabelFull } from '../../core/hebrew.js';
import { CAT_LIST, EPS, GREG_MONTHS, METHOD_DEFAULT, MSG_BACK, MSG_DEDUCT_CHK, MSG_DELETED, MSG_DEL_POST, MSG_DEL_PRE,
         MSG_EMPTY_PRE, MSG_NEED_AMOUNT, MSG_NEED_DESC, MSG_ORDERS_TITLE, MSG_SUM_INCOME,
         MSG_SEC_INCOME, MSG_SEC_TZEDAKAH, MSG_SUM_TZEDAKAH, MSG_UNDO, SRC_DEFAULT } from '../constants.js';
import { shell, view } from '../state.js';
import { icon } from '../icons.js';
import { chainOf, compCardHTML, detailRowHTML, footHTML, kHeb, kKill, kLive, kQ,
         kSortDescriptions, kSortEntries, localPut, money, monthByKey, monthGreg,
         monthRows, pushSoon, signed, splitHTML } from '../domain.js';

function monthScreenHTML() {
  var m = monthByKey(view.monthKey);
  if (!m) return '<div class="card"><div class="empty">' +
             '<div class="skel"></div><div class="skel"></div></div></div>' + footHTML();
  var c = chainOf(view.monthKey, true) || {};
  var rows = kSortEntries(monthRows(view.monthKey));

  // החץ קו דק בתוך עיגול רך, ופונה החוצה — לחודש שעוברים אליו; אזור המגע גדול מהעיגול
  var chev = function (name) { return '<span class="mnav-dot">' + icon(name) + '</span>'; };
  var h = '<div class="mrow">' +
       '<button class="mnav" data-act="month-prev" aria-label="חודש קודם">' + chev('prev') + '</button>' +
       '<span class="mid"><span class="mname">' + esc(m.name) + '</span>' +
       '<span class="myear">' + esc(hebYearLabelFull(m.year)) + '</span>' +
       '<span class="mgreg">' + esc(monthGreg(m.key)) + '</span></span>' +
       '<button class="mnav" data-act="month-next" aria-label="חודש הבא">' + chev('next') + '</button>' +
       '</div>';

  h += compCardHTML('חומש', '', c.chumashDue, c.chumash, c.chumashCarry,
                    c.tzedakah, c.balance);
  h += compCardHTML('פלעדזש', 'peach', c.pledgeDue, c.pledge, c.pledgeCarry,
                    c.tzedakah, c.pledgeBalance);

  h += '<div class="inc">' + esc(MSG_SUM_INCOME) +
       '<b>' + signed(c.income || 0) + '</b></div>' +
       '<div class="inc">' + esc(MSG_SUM_TZEDAKAH) +
       '<b>' + esc(money(c.tzedakah || 0)) + '</b></div>' +
       '<div class="inc sub">' + splitHTML(c) + '</div>';

  // שלושה חלקים באותו כרטיס, כל אחד מהחדש לישן — הכנסות · צדקה · הוראות קבע; חלק ריק אינו מוצג.
  var inc = rows.filter(function (r) { return r.source !== 'standing' && r.type === 'income'; });
  var tz = rows.filter(function (r) { return r.source !== 'standing' && r.type !== 'income'; });
  var std = rows.filter(function (r) { return r.source === 'standing'; });
  var part = function (title, list) {
    return list.length ? '<div class="subhd">' + esc(title) + '</div>' +
                         '<ul class="det">' + list.map(detailRowHTML).join('') + '</ul>' : '';
  };
  if (!rows.length) {
    h += '<div class="card"><div class="empty">' + esc(MSG_EMPTY_PRE + m.name) + '</div></div>';
  } else {
    h += '<div class="card"><h2>פירוט</h2>' +
         part(MSG_SEC_INCOME, inc) + part(MSG_SEC_TZEDAKAH, tz) + part(MSG_ORDERS_TITLE, std) +
         '</div>';
  }
  // הביטול הוא כפתור על המסך ולא טקסט בטוסט — טוסט אינו אתר לחיצה.
  if (UNDO.row)
    h += '<button class="btn ghost" data-act="entry-undo">' + esc(MSG_UNDO) + '</button>';
  return h + footHTML();
}

// ── שני תהליכי הרישום ──
// אין לקרוא שדה מה-DOM אחרי מעבר מסך — האלמנט כבר אינו שם; הטיוטה מחזיקה את הערך.
var FLOW_TZ = ['amount', 'desc', 'source', 'category', 'date'];

var FLOW_INC = ['amount', 'desc', 'method', 'date'];

dragDef('method', lookupDragApply);
dragDef('source', lookupDragApply);

// הפירוטים הנרשמים ביותר בסוג הזה — הכנסה וצדקה הם שני אוצרות מילים, ורשימה מעורבת מציעה את מה שאינו שייך.
// חמישה בפתיחה, ו«עוד אפשרויות» — עד שלושים; ההקלדה מסננת ברכיב המשותף.
var DESC_SHOW = 5, DESC_MORE = 30;
function descSuggest(type) {
  var seen = {}, l = kLive(MIRROR.k_entries), i, d;
  for (i = 0; i < l.length; i++) {
    if (type && l[i].type !== type) continue;
    d = (l[i].description || '').trim();
    if (!d) continue;
    seen[d] = (seen[d] || 0) + 1;
  }
  return kSortDescriptions(Object.keys(seen), seen);
}
comboDef('desc', {
  items: function () {
    return descSuggest(view.flow === 'income' ? 'income' : 'tzedakah')
      .map(function (x) { return { value: x, label: x }; });
  },
  max: DESC_SHOW, more: DESC_MORE, hl: true
});

function flowSteps() { return view.flow === 'income' ? FLOW_INC : FLOW_TZ; }

var STEP_META = {
  amount:   { lab: 'סכום',    ic: 'amount' },
  desc:     { lab: 'פירוט',   ic: 'desc' },
  source:   { lab: 'אופן',    ic: 'method' },
  method:   { lab: 'אופן',    ic: 'method' },
  category: { lab: 'קטגוריה', ic: 'category' },
  date:     { lab: 'תאריך',   ic: 'date' }
};

// הזרימה בדיאלוג שמתחלף במקומו, כדי שמסך הבית יישאר ברקע; מסך גרירת המטבע נשאר מסך מלא — הוא האישור עצמו.
function flowBodyHTML() {
  var steps = flowSteps(), key = steps[view.step], d = view.draft;
  var meta = STEP_META[key] || STEP_META.amount;
  var h = '<div data-ks>' +
    '<div class="fhd"><span class="fic">' + icon(meta.ic) + '</span>' +
    '<h2>' + esc(meta.lab) + '</h2></div>';

  if (key === 'amount') {
    h += '<div class="fld"><label for="f-amount">סכום</label>' +
      '<input id="f-amount" type="text" inputmode="decimal" autocomplete="off" ' +
      'value="' + esc(d.amount === null ? '' : String(Math.abs(d.amount))) + '"></div>';
    // במקלדת המספרים אין מינוס — הסימון הוא שהופך את הסכום לניכוי.
    if (view.flow === 'income') h += deductChkHTML('f-deduct', d.amount !== null && d.amount < 0);
  } else if (key === 'desc') {
    h += '<div class="fld"><label for="f-desc">פירוט</label>' +
      comboHTML('desc', { id: 'f-desc-box', qid: 'f-desc', label: 'פירוט', placeholder: 'פירוט',
        picked: d.description ? { value: d.description, label: d.description } : null }) + '</div>';
  } else if (key === 'source' || key === 'method') {
    var list = key === 'source' ? lookupList('source', SRC_DEFAULT)
                                : lookupList('method', METHOD_DEFAULT);
    // הרשת של הליבה — עיגול ובו אייקון האמצעי, והשם מתחתיו; הערך בשדה הנסתר f-method.
    h += '<input type="hidden" id="f-method" value="' + esc(d.method) + '">' +
      methodGridHTML({ target: 'f-method', list: list, cur: d.method, label: STEP_META[key].lab,
        ico: function (l) { return icon(methodIcon(l)); } });
  } else if (key === 'category') {
    h += '<div class="opts">' + CAT_LIST.map(function (x) {
      return '<button type="button" class="opt' + (d.category === x ? ' on' : '') +
             '" data-act="flow-pick" data-k="category" data-v="' + esc(x) + '">' +
             esc(x) + '</button>';
    }).join('') + '</div>';
  } else if (key === 'date') {
    h += datePairHTML('f', d.entry_date);
  }
  // הכפתורים בתוך היקף ה-data-ks ולא בתחתית המיכל — ksKey מחפש רק בתוך ההיקף, וכפתור מחוצה לו אינו עונה למקש.
  return h + '<div class="frow">' +
    '<button class="btn ghost" data-act="flow-back" data-kesc>' + esc(MSG_BACK) + '</button>' +
    '<button class="btn" data-act="flow-next" data-ksave data-noguard>' +
    esc(view.step === flowSteps().length - 1 ? 'אישור' : 'המשך') + '</button></div></div>';
}

function deductChkHTML(id, on) {
  return '<label class="fld chk"><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') +
         '><span>' + esc(MSG_DEDUCT_CHK) + '</span></label>';
}

// הסכום מוקלד בלי סימן, והסימון קובע אותו — מינוס שהוקלד ביד אינו נספר פעמיים.
function deductAmount(v, chk) {
  if (v === null) return null;
  return chk && chk.checked ? -Math.abs(v) : Math.abs(v);
}

// openModal מחליף את התוכן ואינו סוגר את המיכל; המיקוד מוחזר לשדה הראשון — שדה שנבנה מחדש מאבד אותו.
function flowOpen() {
  openModal('', flowBodyHTML(), '');
  var el = kQ('#modal-body input');
  if (el) el.focus();
}

// ── בורר התאריך הכפול ──
// שני בוררים לאותו יום, בצורה אחת — לועזי ועברי: כפתור בצורת השדה, ובלחיצה שלושה גלגלים (יום · חודש · שנה).
// הצורה אחת בטלפון ובמחשב: בורר המערכת נראה אחרת בכל מכשיר. הערך שנשמר — <px>-date, השדה הנסתר, ב-ISO.
var DP_H = 40;
var DP_YEARS = { g: [1900, 2100], h: [5660, 5860] };

function datePairHTML(px, iso) {
  return '<input type="hidden" id="' + px + '-date" value="' + esc(iso || '') + '">' +
    dpFieldHTML(px, 'g', 'תאריך לועזי', gregFull(iso)) + dpFieldHTML(px, 'h', 'תאריך עברי', hebFull(iso));
}

function dpFieldHTML(px, cal, lab, txt) {
  return '<div class="fld"><label for="' + px + '-' + cal + 'btn">' + lab + '</label>' +
    '<button type="button" class="dp-trg" id="' + px + '-' + cal + 'btn" data-act="dp-open" data-px="' + px + '" data-cal="' + cal + '">' +
    '<span id="' + px + '-' + cal + 'lbl">' + esc(txt) + '</span>' + icon('date') + '</button>' +
    '<div class="dp-pop" id="' + px + '-' + cal + 'pop" hidden></div></div>';
}

function gregFull(iso) {
  var d = iso ? dayNoon(iso) : null;
  return d ? d.getDate() + ' ב' + GREG_MONTHS[d.getMonth()] + ' ' + d.getFullYear() : '';
}

function hebFull(iso) {
  var h = kHeb(iso);
  return h ? hebDayLabel(h.day) + ' ' + h.monthName + ' ' + hebYearLabelFull(h.year) : '';
}

// העמודות של לוח אחד ביום הנבחר — [תוויות, אינדקס הנבחר] לכל גלגל, מימין לשמאל: יום · חודש · שנה.
function dpCols(cal, iso) {
  var i, days = [], years = [], r = DP_YEARS[cal], d, h, info;
  if (cal === 'g') {
    d = dayNoon(iso);
    for (i = 1; i <= new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); i++) days.push(String(i));
    for (i = r[0]; i <= r[1]; i++) years.push(String(i));
    return { y: d.getFullYear(), cols: [[days, d.getDate() - 1], [GREG_MONTHS, d.getMonth()], [years, d.getFullYear() - r[0]]] };
  }
  h = kHeb(iso); info = hebYearInfo(h.year);
  for (i = 1; i <= info.ml[h.monthIndex]; i++) days.push(hebDayLabel(i));
  for (i = r[0]; i <= r[1]; i++) years.push(hebYearLabelFull(i));
  return { y: h.year, cols: [[days, h.day - 1], [hebMonthNames(h.year), h.monthIndex], [years, h.year - r[0]]] };
}

function dpDraw(px, cal) {
  var pop = kQ('#' + px + '-' + cal + 'pop'), iso = (kQ('#' + px + '-date') || {}).value || dayToday(), c, cols;
  if (!pop) return;
  c = dpCols(cal, iso);
  pop.dataset.y = c.y;
  pop.innerHTML = c.cols.map(function (col, k) {
    return '<div class="dp-col" data-dpcol="' + k + '" data-px="' + px + '" data-cal="' + cal + '"><div class="dp-pad"></div>' +
      col[0].map(function (t, n) {
        return '<div class="dp-it' + (n === col[1] ? ' on' : '') + '" data-act="dp-pick" data-n="' + n + '">' + esc(t) + '</div>';
      }).join('') + '<div class="dp-pad"></div></div>';
  }).join('');
  cols = pop.querySelectorAll('.dp-col');
  c.cols.forEach(function (col, k) { cols[k].scrollTop = col[1] * DP_H; });
}

// לחיצה פותחת את הבורר וסוגרת את השני; לחיצה שנייה סוגרת.
function dpOpen(el) {
  var px = el.dataset.px, cal = el.dataset.cal, pop = kQ('#' + px + '-' + cal + 'pop'), other = kQ('#' + px + '-' + (cal === 'g' ? 'h' : 'g') + 'pop');
  if (!pop) return;
  if (other) other.hidden = true;
  if (!pop.hidden) { pop.hidden = true; return; }
  pop.hidden = false;
  dpDraw(px, cal);
}

function dpPick(el) {
  var col = el.closest('.dp-col');
  if (col) col.scrollTo({ top: (+el.dataset.n) * DP_H, behavior: 'smooth' });
}

// הגלגל נעצר — היום נבנה משלושת הגלגלים; יום שאינו בחודש וחודש שאינו בשנה נעצרים באחרון שקיים.
var _dpT = {};
function dpScroll(e) {
  var col = e.target && e.target.closest ? e.target.closest('[data-dpcol]') : null, key;
  if (!col) return;
  key = col.dataset.px + col.dataset.cal + col.dataset.dpcol;
  clearTimeout(_dpT[key]);
  _dpT[key] = setTimeout(function () { dpSettle(col); }, 140);
}

function dpSettle(col) {
  var px = col.dataset.px, cal = col.dataset.cal, pop = col.parentElement, cols = pop.querySelectorAll('.dp-col');
  var n = [0, 1, 2].map(function (k) { return Math.round(cols[k].scrollTop / DP_H); });
  var r = DP_YEARS[cal], y = r[0] + n[2], m = n[1], d = n[0] + 1, py = +pop.dataset.y, info, g, iso, inp = kQ('#' + px + '-date');
  if (cal === 'g') {
    d = Math.min(d, new Date(y, m + 1, 0).getDate());
    iso = dayIso(dayNoon(y, m, d));
  } else {
    // מעבר בין שנה רגילה למעוברת — אדר נשאר אדר, והחודשים שאחריו נשארים בשמם.
    if (hebIsLeap(py) && !hebIsLeap(y) && m >= 6) m -= 1;
    else if (!hebIsLeap(py) && hebIsLeap(y) && m >= 5) m += 1;
    info = hebYearInfo(y);
    if (!info) return;
    m = Math.min(m, info.ml.length - 1); d = Math.min(d, info.ml[m]);
    g = hebToGreg(y, m, d);
    if (!g) return;
    iso = dayIso(g);
  }
  if (!inp || inp.value === iso) return;
  inp.value = iso;
  inp.dispatchEvent(new Event('change', { bubbles: true }));
  kQ('#' + px + '-glbl').textContent = gregFull(iso);
  kQ('#' + px + '-hlbl').textContent = hebFull(iso);
  dpDraw(px, cal);
}

function flowStart(kind) {
  view.flow = kind;
  view.step = 0;
  view.draft = { amount: null, description: '', method: '', category: '',
                 entry_date: dayToday() };
  flowOpen();
}

function flowCollect() {
  var steps = flowSteps(), key = steps[view.step], el;
  if (key === 'amount') {
    el = kQ('#f-amount');
    view.draft.amount = el ? readNum(el, null) : null;
    if (view.flow === 'income') view.draft.amount = deductAmount(view.draft.amount, kQ('#f-deduct'));
  } else if (key === 'desc') {
    el = kQ('#f-desc'); view.draft.description = el ? el.value.trim() : '';
  } else if (key === 'source' || key === 'method') {
    el = kQ('#f-method'); view.draft.method = el ? el.value : '';
  } else if (key === 'date') {
    el = kQ('#f-date'); if (el && el.value) view.draft.entry_date = el.value;
  }
}

function flowValid() {
  var key = flowSteps()[view.step], d = view.draft;
  if (key === 'amount') {
    if (d.amount === null) return MSG_NEED_AMOUNT;
    // בהכנסה מותר סכום שלילי — הוא ניכוי הוצאה; בצדקה הוא חייב להיות גדול מאפס.
    if (view.flow !== 'income' && d.amount <= EPS) return MSG_NEED_AMOUNT;
    if (view.flow === 'income' && Math.abs(d.amount) <= EPS) return MSG_NEED_AMOUNT;
    return '';
  }
  if (key === 'desc') return d.description ? '' : MSG_NEED_DESC;
  if (key === 'source' || key === 'method') return d.method ? '' : MSG_FILL_ALL;
  if (key === 'category') return d.category ? '' : MSG_FILL_ALL;
  return '';
}

// ── עריכה ומחיקה רכה ──
var UNDO = { row: null, timer: null };

function entryById(id) {
  var l = kLive(MIRROR.k_entries), i;
  for (i = 0; i < l.length; i++) if (idEq(l[i].client_id, id)) return l[i];
  return null;
}

function entryDelete(id) {
  var r = entryById(id);
  closeModal();
  if (!r) { uiNoDialog('entryDelete', id); return Promise.resolve(); }
  return ask(MSG_DELETE, MSG_DEL_PRE + r.description + ' ' + money(r.amount) + MSG_DEL_POST,
             MSG_DELETE).then(function (yes) {
    if (!yes) return;
    var copy = JSON.parse(JSON.stringify(r));
    kKill('k_entries', r);
    UNDO.row = copy;
    if (UNDO.timer) clearTimeout(UNDO.timer);
    UNDO.timer = setTimeout(function () { UNDO.row = null; pushSoon(); }, 5000);
    shell.kRender();
    toast(MSG_DELETED + ' · ' + MSG_UNDO, 5000, 'good');
  });
}

function entryUndo() {
  if (!UNDO.row) return;
  var r = UNDO.row;
  r.deleted = false; r.deleted_at = null; r.deleted_by = null; r.updated_at = Date.now();
  localPut('k_entries', r);
  UNDO.row = null;
  if (UNDO.timer) clearTimeout(UNDO.timer);
  pushSoon();
  shell.kRender();
}

export { datePairHTML, dpOpen, dpPick, dpScroll, deductAmount, deductChkHTML, entryById, entryDelete, entryUndo, flowCollect, flowOpen, flowStart, flowSteps,
         flowValid, monthScreenHTML };
