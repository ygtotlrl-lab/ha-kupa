// app/screens/month.js — מסך החודש ותהליך הרישום
import { MSG_DELETE, MSG_FILL_ALL, dayNoon, dayToday, readNum } from '../../core/util.js';
import { idEq } from '../../core/sync.js';
import { MIRROR } from '../../core/mirror.js';
import { ask, closeModal, dragDef, dragOrder, esc, openModal, toast, uiNoDialog } from '../../core/ui.js';
import { hebYearLabelFull, hebrewDate } from '../../core/hebrew.js';
import { CAT_LIST, EPS, METHOD_DEFAULT, MSG_BACK, MSG_DELETED, MSG_DEL_POST, MSG_DEL_PRE,
         MSG_EMPTY_PRE, MSG_NEED_AMOUNT, MSG_NEED_DESC, MSG_ORDERS_TITLE, MSG_SUM_INCOME,
         MSG_SUM_TZEDAKAH, MSG_UNDO, SRC_DEFAULT } from '../constants.js';
import { shell, view } from '../state.js';
import { chainOf, compCardHTML, detailRowHTML, footHTML, iconFor, kKill, kLive, kQ,
         kSortDescriptions, kSortEntries, localPut, lookupRows, money, monthByKey, monthGreg,
         monthRows, pushSoon, splitHTML } from '../domain.js';

function monthScreenHTML() {
  var m = monthByKey(view.monthKey);
  if (!m) return '<div class="card"><div class="empty">' +
             '<div class="skel"></div><div class="skel"></div></div></div>' + footHTML();
  var c = chainOf(view.monthKey, true) || {};
  var rows = kSortEntries(monthRows(view.monthKey));

  var h = '<div class="mrow">' +
       '<button class="mnav" data-act="month-prev" aria-label="חודש קודם">›</button>' +
       '<span class="mid"><span class="mname">' + esc(m.name) + '</span>' +
       '<span class="myear">' + esc(hebYearLabelFull(m.year)) + '</span>' +
       '<span class="mgreg">' + esc(monthGreg(m.key)) + '</span></span>' +
       '<button class="mnav" data-act="month-next" aria-label="חודש הבא">‹</button>' +
       '</div>';

  h += compCardHTML('חומש', '', c.chumashDue, c.chumash, c.chumashCarry,
                    c.tzedakah, c.balance);
  h += compCardHTML('פלעדזש', 'peach', c.pledgeDue, c.pledge, c.pledgeCarry,
                    c.tzedakah, c.pledgeBalance);

  h += '<div class="inc">' + esc(MSG_SUM_INCOME) +
       '<b>' + esc(money(c.income || 0)) + '</b></div>' +
       '<div class="inc">' + esc(MSG_SUM_TZEDAKAH) +
       '<b>' + esc(money(c.tzedakah || 0)) + '</b></div>' +
       '<div class="inc sub">' + splitHTML(c) + '</div>';

  var dated = rows.filter(function (r) { return r.source !== 'standing'; });
  var std = rows.filter(function (r) { return r.source === 'standing'; });
  if (!rows.length) {
    h += '<div class="card"><div class="empty">' + esc(MSG_EMPTY_PRE + m.name) + '</div></div>';
  } else {
    h += '<div class="card"><h2>פירוט</h2>' +
         (dated.length ? '<ul class="det">' + dated.map(detailRowHTML).join('') + '</ul>' : '') +
         // כותרת משנה ולא כותרת כרטיס — הוראות הקבע הן המשך אותה רשימה.
         (std.length ? '<div class="subhd">' + esc(MSG_ORDERS_TITLE) + '</div>' +
                       '<ul class="det">' + std.map(detailRowHTML).join('') + '</ul>' : '') +
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

function lookupList(kind, dflt) {
  var l = lookupRows(kind).map(function (r) { return r.label; });
  return l.length ? l : dflt;
}

// ברירות המחדל מתממשות לשורות בפעולת המשתמש הראשונה ולא ברינדור — עריכה וגרירה דורשות מזהה, וכתיבה ברינדור הייתה כותבת במכשיר שרק קורא.
// המזהה נגזר ממקום הפריט בזריעה — <kind>:<תווית ברירת המחדל> — ושני מכשירים ריקים שזורעים מגיעים לאותה שורה; התווית עצמה ניתנת לעריכה.
function lookupSeed(kind, dflt) {
  if (lookupRows(kind).length) return;
  for (var i = 0; i < dflt.length; i++)
    localPut('k_lookups', { client_id: kind + ':' + dflt[i], kind: kind, label: dflt[i],
                            sort: i + 1, updated_at: Date.now(), deleted: false });
  pushSoon();
}

// הסדר נכתב מחדש לכל השורות — שתי שורות באותו sort הן סדר שאיש לא הכריע, והמיזוג מקבע אותו.
// הקלט הוא הסדר הסופי שב-DOM ולא צמד «מאיפה לאן», וסדר שאינו מכיל בדיוק את כל השורות נדחה.
function lookupReorder(kind, ids) {
  var rows = lookupRows(kind), by = {}, out = [], i, changed = false;
  for (i = 0; i < rows.length; i++) by[String(rows[i].client_id)] = rows[i];
  for (i = 0; i < ids.length; i++) if (by[String(ids[i])]) out.push(by[String(ids[i])]);
  if (out.length !== rows.length) return false;
  for (i = 0; i < out.length; i++) if (+out[i].sort !== i + 1) changed = true;
  if (!changed) return false;
  for (i = 0; i < out.length; i++) {
    out[i].sort = i + 1;
    out[i].updated_at = Date.now();
    localPut('k_lookups', out[i]);
  }
  pushSoon();
  return true;
}

function lookupDragApply(list, kind) {
  if (lookupReorder(kind, dragOrder(list, kind, 'data-id'))) shell.kRender();
}
dragDef('method', lookupDragApply);
dragDef('source', lookupDragApply);

function descSuggest(q, type) {
  var seen = {}, l = kLive(MIRROR.k_entries), i, d;
  for (i = 0; i < l.length; i++) {
    // פירוטי הכנסה וצדקה הם שני אוצרות מילים — רשימה מעורבת מציעה את מה שאינו שייך.
    if (type && l[i].type !== type) continue;
    d = (l[i].description || '').trim();
    if (!d) continue;
    seen[d] = (seen[d] || 0) + 1;
  }
  return kSortDescriptions(Object.keys(seen)
    .filter(function (d) { return !q || d.indexOf(q) === 0; }), seen)
    .slice(0, 5);
}

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
    '<div class="fhd"><span class="fic">' + iconFor(meta.ic) + '</span>' +
    '<h2>' + esc(meta.lab) + '</h2></div>';

  if (key === 'amount') {
    h += '<div class="fld"><label for="f-amount">סכום</label>' +
      '<input id="f-amount" type="text" inputmode="decimal" autocomplete="off" ' +
      'value="' + esc(d.amount === null ? '' : String(d.amount)) + '"></div>';
  } else if (key === 'desc') {
    h += '<div class="fld"><label for="f-desc">פירוט</label>' +
      '<input id="f-desc" type="text" autocomplete="off" value="' + esc(d.description) + '">' +
      '<div class="acbox" id="f-ac">' +
      descSuggest('', view.flow === 'income' ? 'income' : 'tzedakah').map(function (s) {
        return '<button type="button" data-act="flow-ac" data-v="' + esc(s) + '">' +
               esc(s) + '</button>';
      }).join('') + '</div></div>';
  } else if (key === 'source' || key === 'method') {
    var list = key === 'source' ? lookupList('source', SRC_DEFAULT)
                                : lookupList('method', METHOD_DEFAULT);
    h += '<div class="opts">' +
      list.map(function (x) {
        return '<button type="button" class="opt' + (d.method === x ? ' on' : '') +
               '" data-act="flow-pick" data-k="method" data-v="' + esc(x) + '">' +
               esc(x) + '</button>';
      }).join('') + '</div>';
  } else if (key === 'category') {
    h += '<div class="opts">' + CAT_LIST.map(function (x) {
      return '<button type="button" class="opt' + (d.category === x ? ' on' : '') +
             '" data-act="flow-pick" data-k="category" data-v="' + esc(x) + '">' +
             esc(x) + '</button>';
    }).join('') + '</div>';
  } else if (key === 'date') {
    h += '<div class="fld"><label for="f-date">תאריך</label>' +
      '<input id="f-date" type="date" value="' + esc(d.entry_date) + '">' +
      '<div class="sml" id="f-hdate">' + esc(hebLabel(d.entry_date)) + '</div></div>';
  }
  // הכפתורים בתוך היקף ה-data-ks ולא בתחתית המיכל — ksKey מחפש רק בתוך ההיקף, וכפתור מחוצה לו אינו עונה למקש.
  return h + '<div class="frow">' +
    '<button class="btn ghost" data-act="flow-back" data-kesc>' + esc(MSG_BACK) + '</button>' +
    '<button class="btn" data-act="flow-next" data-ksave>' +
    esc(view.step === flowSteps().length - 1 ? 'אישור' : 'המשך') + '</button></div></div>';
}

// openModal מחליף את התוכן ואינו סוגר את המיכל; המיקוד מוחזר לשדה הראשון — שדה שנבנה מחדש מאבד אותו.
function flowOpen() {
  openModal('', flowBodyHTML(), '');
  var el = kQ('#modal-body input');
  if (el) el.focus();
}

// עוגן בצהריים מקומיים — חצות נופל ליום הקודם במעבר לשעון חורף.
function hebLabel(iso) {
  if (!iso) return '';
  return hebrewDate(dayNoon(iso));
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
  } else if (key === 'desc') {
    el = kQ('#f-desc'); view.draft.description = el ? el.value.trim() : '';
  } else if (key === 'date') {
    el = kQ('#f-date'); if (el && el.value) view.draft.entry_date = el.value;
  }
}

function flowValid() {
  var key = flowSteps()[view.step], d = view.draft;
  if (key === 'amount') {
    if (d.amount === null) return MSG_NEED_AMOUNT;
    // בהכנסה מותר סכום שלילי — הוא קיזוז; בצדקה הוא חייב להיות גדול מאפס.
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

export { entryById, entryDelete, entryUndo, flowCollect, flowOpen, flowStart, flowSteps,
         flowValid, lookupSeed, monthScreenHTML };
