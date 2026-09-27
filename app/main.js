// app/main.js — העלייה, מפת הפעולות והניווט
import { MSG_DELETE, MSG_SAVED_LOCAL, appConfigure, getDeviceId, readNum, uniqHas,
         withTimeout } from '../core/util.js';
import { ctxEpoch, ctxStale, eraKeys, eraKick, idEq, newClientId, pendAlertDismiss,
         pendBoot, pendCount, pendHas, plBoot, pushDirty, rtyBoot, runSave, sbWatch,
         tombBoot } from '../core/sync.js';
import { hwBoot, lsBoot, lsClearHorizons, lsRemove } from '../core/storage.js';
import { MIRROR, mirrorBoot, mirrorKey, mirrorTables } from '../core/mirror.js';
import { bkBoot } from '../core/backup.js';
import { actRun, closeAsk, closeModal, esc, ksKey, modalBackdrop, modalEsc, openModal,
         shellBare, swApply, swHideUpdate, toast, uiNoDialog } from '../core/ui.js';
import { hebYearLabelFull } from '../core/hebrew.js';
import { CAT_LIST, EPS, KV_TABLE, K_PUSHED_KEY, METHOD_DEFAULT, MSG_ADD_INCOME,
         MSG_ADD_TZEDAKAH, MSG_EDIT, MSG_NEED_AMOUNT, MSG_NEED_DESC, MSG_NEED_LABEL,
         MSG_ORDER_NEW, MSG_PLEDGE_EDIT, MSG_WAY_DUP, MSG_WAY_NEW, PUSH_TABLES,
         SRC_DEFAULT, SUPABASE_ANON_KEY, SUPABASE_URL, TABLES,
         TABS } from './constants.js';
import { S, shell, view } from './state.js';
import { _kLoadPushed, _kMarkPushed, assetIcon, brandHTML, hwHorizonDate, iconFor,
         kDirtyRows, kLive, kPendKey, kPendKeyOf, kQ, kRowTs, kStripRows, kSyncNow,
         kSyncPull, kTableMeta, localPut, lookupRows, monthByKey, nextMonthOf,
         nowMonthKey, orderById, pledgeOfYear, prevMonthOf, pushSoon,
         soEnsureThroughNow } from './domain.js';
import { archiveScreenHTML } from './screens/archive.js';
import { doneScreenHTML } from './screens/done.js';
import { entryById, entryDelete, entryUndo, flowCollect, flowOpen, flowStart, flowSteps,
         flowValid, lookupReorder, lookupSeed,
         monthScreenHTML } from './screens/month.js';
import { lookupById, lookupFootHTML, lookupFormHTML, orderFormHTML, orderNewVersion,
         orderRead, orderValid, settingsScreenHTML } from './screens/settings.js';
import { coinWire, slideScreenHTML } from './screens/slide.js';

// ── החיווט ──
// החיווט נמסר בשומרי קריאה — ה-CFG מוגדרים בהמשך, והשומר קורא אותם בזמן הקריאה ולא בזמן המסירה.
appConfigure({
  get BK_CFG() { return BK_CFG; },
  get DEV_CFG() { return DEV_CFG; },
  get DOM_ACTIONS() { return DOM_ACTIONS; },
  get ERA_CFG() { return ERA_CFG; },
  get HW_CFG() { return HW_CFG; },
  get LS_CFG() { return LS_CFG; },
  get MIRROR_CFG() { return MIRROR_CFG; },
  get PEND_CFG() { return PEND_CFG; },
  get PL_CFG() { return PL_CFG; },
  get PUSH_CFG() { return PUSH_CFG; },
  get RTY_CFG() { return RTY_CFG; },
  get saveRefresh() { return saveRefresh; }
});

var MIRROR_CFG = {
  prefix: self.APP.prefix + 'mirror_',
  app:    self.APP.prefix,
  tables: function () { return TABLES.map(function (m) { return m.t; }); },
  // ריק ומוצהר — שדה חסר נקרא «לא נשאל», וריק נקרא «נמדד ואין».
  noPush: [],
  empty:  function () { return []; },
  ts:     function (r) { return kRowTs(r); },
  clean:  function (t, rows) { return kStripRows(t, rows); },
  fail:   function (where, e) { console.error('[mirror] ' + where, e); },
};

// פריט בלי ts זורק בפינוי.
var LS_CFG = {
  cachePrefix: self.APP.id + '-',
  logKey: 'k_ls_log',
  hzPrefix: 'k_ls_hz_',
  dismissKey: 'k_sw_dismissed',
  // מפתח שאינו במרשם נמחק בעלייה.
  keys: function () {
    return [LS_CFG.logKey, LS_CFG.dismissKey, DEV_CFG.key, PEND_CFG.key,
            BK_CFG.flagKey, BK_CFG.logQueueKey, K_PUSHED_KEY]
      .concat(eraKeys(), mirrorTables().map(mirrorKey));
  },

  // חלון הפינוי נגזר מסוג האפליקציה — אין מספר ימים באף רשומה.
  appType: { type: 'annual', why: 'החישוב שלה נפרש על שנה — ⚠️ הפלעדזש הוא החלטה לשנה עברית, ⛔ וכל חודש בה נושא אותו' },
  // ריק ומוצהר — כל מראה כאן היא הנתון עצמו ולא מטמון מהירות.
  wholeKeys: [],
  // oldRecords ריק ומוצהר — כל טבלה שגדלה כאן נדרשת במלואה.
  // שדה חסר נקרא «לא נשאל», וריק נקרא «נמדד ואין».
  oldRecords: [],
  // יתרת החומש עוברת מחודש לחודש מהחודש הראשון — רשומה שפונתה היא יתרה שגויה, בכל אורך חלון.
  fullHistory: [
    { t: 'k_entries',      calc: 'chainAll' },
    { t: 'k_so_instances', calc: 'chainAll' }
  ],
  // טבלה שגדלה ואינה בפינוי ממלאת אחסון של origin משותף — לכן כאן רק טבלה קבועה בגודלה, עם נימוקה.
  fixedSize: [
    { t: 'k_pledges',         why: 'פלעדזש — שורה לשנה עברית, ⛔ ואינה גדלה בתוך השנה' },
    { t: 'k_standing_orders', why: 'הוראות קבע — שורה להוראה, ⛔ והמופעים שלהן בטבלה משלהם' },
    { t: 'k_lookups',         why: 'אופני הכנסה וצדקה — פריטים שנערכים בהגדרות' },
    { t: KV_TABLE,            why: 'הגדרות — שורה למפתח, ⛔ והמפתחות קבועים' }
  ],
};

var DEV_CFG = { key: 'k_device_id' };

var BK_CFG = {
  client: function () { return S.sb; },
  flagKey: 'k_last_backup',
  logQueueKey: 'k_log_queue',
  prefix: '',
  device: function () { try { return getDeviceId(); } catch (e) { return null; } },
  // אין כניסה ולכן אין שם משתמש — המכשיר הוא הזהות היחידה, ושדה מומצא היה עדות שאיש לא מסר.
  user: function () { return null; },
  secrets: [],
  sources: function () {
    return [
      { kind: 'table', name: 'k_pledges',         order: 'hebrew_year', ts: 'updated_at' },
      { kind: 'table', name: 'k_standing_orders', order: 'client_id', ts: 'updated_at' },
      { kind: 'table', name: 'k_so_instances',    order: 'client_id', ts: 'updated_at' },
      { kind: 'table', name: 'k_entries',         order: 'client_id', ts: 'updated_at' },
      { kind: 'table', name: 'k_lookups',         order: 'client_id', ts: 'updated_at' },
      { kind: 'table', name: KV_TABLE,             order: 'key' }
    ];
  }
};

var PEND_CFG = {
  app: 'kupa', key: 'k_pending',
  // סימון שקידומתו אינה כאן יורד בעלייה — אין לו כותב ואין שורה שתידחף ותוריד אותו.
  marks: function () { return PUSH_TABLES.map(function (t) { return kPendKeyOf(t, ''); }); },
  redraw: function () { try { kRender(); } catch (e) { } }
};

var RTY_CFG = {
  flush:   function () { return kSyncNow(); },
  pending: function () { try { return pendCount() > 0; } catch (e) { return false; } },
};

var PL_CFG = {
  every:  3000,
  // אין כניסה — הפולינג פעיל כל עוד הלשונית גלויה, ותנאי של משתמש מחובר לא היה מתקיים כאן לעולם.
  active: function () { return document.visibilityState !== 'hidden'; },
  seen:   function () { return S._kSeenTs; },
  note:   function (ts) { S._kSeenTs = ts; },
  ok:     function () { S._lastSeenOk = Date.now(); },
  pull:   function () { return kSyncNow(); },
  client: function () { return S.sb; },
  table:  function () { return KV_TABLE; },
};

var PUSH_CFG = {
  tables: PUSH_TABLES,
  chunk:  500,
  delay:  400,
  dirty:  function (t) { S._kPushEp = ctxEpoch(); return kDirtyRows(t); },
  key:    function (t, row) { return kPendKey(t, row); },
  send:   function (t, rows) {
    var m = kTableMeta(t);
    return withTimeout(S.sb.from(t).upsert(rows, { onConflict: m.key }));
  },
  mark:   function (t) { if (!ctxStale(S._kPushEp)) _kMarkPushed(t); },
  run:    function () { kSyncNow(); },
};

var HW_CFG = {
  enabled: true,
  // אין כניסה ואין תפקיד — החלון החם פתוח למי שמחזיק את המכשיר.
  admin: function () { return true; },
  specs: [{
    key: mirrorKey('k_entries'),
    label: 'רישומי חודשים שנסגרו',
    inWindow: function (r) {
      var d = r && r.entry_date;
      if (!d) return true;
      return d >= hwHorizonDate();
    },
    idOf: function (r) { return r && r.client_id; },
    ts: function (r) { return kRowTs(r); },
    isPending: function (r) { return pendHas(kPendKey('k_entries', r)); },
    fetch: function () {
      return withTimeout(S.sb.from('k_entries').select('*'))
        .then(function (r) {
          return (r && !r.error && Array.isArray(r.data)) ? { ok: true, rows: r.data }
                                                          : { ok: false, rows: [] };
        }, function () { return { ok: false, rows: [] }; });
    }
  }]
};

var ERA_CFG = {
  prefix: self.APP.prefix,
  client: function () { return S.sb; },
  table:  function () { return KV_TABLE; },
  // גם אופק הפינוי נמחק — אופק ששרד מסנן את מה שהמשיכה מחזירה, והמכשיר היה נשאר ריק.
  wipe:   function () {
    mirrorTables().forEach(function (t) { MIRROR[t] = MIRROR_CFG.empty(); lsRemove(mirrorKey(t)); });
    lsClearHorizons();
  },
  // הדחיפה היא ראיה טרייה ולא זיכרון — מכשיר נקי מקבל ok עם still ריק.
  push:   function () { return pushDirty(null); },
  refresh: function () { return kSyncNow(); }
};

function saveRefresh() { kRender(); }

document.title = self.APP.name;

// ── הסרגל ──
function tabbarHTML() {
  return '<div class="in">' + TABS.map(function (t) {
    return '<button class="tab-btn' + (view.screen === t.k ? ' on' : '') +
           '" data-act="tab-go" data-id="' + esc(t.k) + '">' +
           '<span class="ti">' + iconFor(t.ic) + '</span>' + esc(t.lab) + '</button>';
  }).join('') + '</div>';
}

// ── הרינדור ──
function kRender() {
  var root = kQ('#view');
  if (!root) { uiNoDialog('kRender', 'view'); return; }
  var fab = kQ('#fab'), tb = kQ('#tabbar'), hd = kQ('#masthead');
  if (view.screen === 'month') root.innerHTML = monthScreenHTML();
  else if (view.screen === 'slide') root.innerHTML = slideScreenHTML();
  else if (view.screen === 'done') root.innerHTML = doneScreenHTML();
  else if (view.screen === 'archive') root.innerHTML = archiveScreenHTML();
  else if (view.screen === 'settings') root.innerHTML = settingsScreenHTML();
  var onMonth = view.screen === 'month';
  // אין סרגל בזרימה — ניווט באמצעה מאבד את הטיוטה.
  var onTab = TABS.some(function (t) { return t.k === view.screen; });
  if (fab) fab.classList.toggle('hidden', !onMonth);
  if (hd) {
    hd.classList.toggle('hidden', !onTab);
    hd.innerHTML = onTab ? brandHTML() : '';
  }
  if (tb) {
    tb.classList.toggle('hidden', !onTab);
    tb.innerHTML = tabbarHTML();
  }
  if (view.screen === 'slide') coinWire();
  shellBare(false);
}

// ── מפת הפעולות ──
// מטפל שממתין לכתיבה מחזיר את ההבטחה — הניתוב מנטרל את הכפתור עד שהסתיימה.
var DOM_ACTIONS = {
  // שני כפתורים מתויגים ולא ask — ask נותן «ביטול» לצד השני, ומי שלוחץ אינו יודע שבחר הכנסה.
  'add-open': function () {
    openModal('', '<div class="pick">' +
      '<button class="pk" data-act="add-income">' +
      '<span class="pi">' + assetIcon('asset-wallet') + '</span>' +
      esc(MSG_ADD_INCOME) + '</button>' +
      '<button class="pk" data-act="add-tzedakah">' +
      '<span class="pi">' + assetIcon('asset-kupa') + '</span>' +
      esc(MSG_ADD_TZEDAKAH) + '</button></div>', '');
  },
  // הדיאלוג אינו נסגר בין הבחירה לשלב הראשון — הוא מתחלף במקומו, ומסך הבית נשאר ברקע.
  'add-income':   function () { flowStart('income'); },
  'add-tzedakah': function () { flowStart('tzedakah'); },
  'month-prev': function () {
    var p = prevMonthOf(view.monthKey);
    if (p) { view.monthKey = p.key; view.screen = 'month'; kRender(); }
  },
  'month-next': function () {
    var nx = nextMonthOf(view.monthKey);
    if (nx) { view.monthKey = nx.key; view.screen = 'month'; kRender(); }
  },
  // «בית» חוזר לחודש של היום — חודש שנפתח מהארכיון אינו הבית.
  'tab-go': function (el) {
    view.screen = el.dataset.id;
    if (view.screen === 'month') view.monthKey = nowMonthKey() || null;
    kRender();
  },
  'arch-month': function (el) {
    var m = monthByKey(el.dataset.id);
    if (m) { view.monthKey = m.key; view.screen = 'month'; kRender(); }
  },
  'flow-next': function () {
    flowCollect();
    var bad = flowValid();
    if (bad) { toast(bad, 4000, 'bad'); return; }
    if (view.step === flowSteps().length - 1) {
      closeModal();
      view.screen = 'slide';
      kRender();
      return;
    }
    view.step++;
    flowOpen();
  },
  // החזרה מהשלב הראשון פותחת את בורר הסוג ולא סוגרת הכול — הדיאלוג מתחלף בשני הכיוונים.
  'flow-back': function () {
    if (view.screen === 'slide') { view.screen = 'month'; kRender(); flowOpen(); return; }
    if (view.step === 0) { view.flow = null; DOM_ACTIONS['add-open'](); return; }
    view.step--;
    flowOpen();
  },
  'flow-pick': function (el) { view.draft[el.dataset.k] = el.dataset.v; flowOpen(); },
  'flow-ac': function (el) {
    var f = kQ('#f-desc');
    if (!f) { uiNoDialog('flow-ac', 'f-desc'); return; }
    f.value = el.dataset.v;
  },
  // הרקע ו-Escape עונים «לא», והכפתורים הם המסלול היחיד שעונה «כן».
  'ask-yes': function () { closeAsk(true); },
  'ask-no':  function () { closeAsk(false); },
  'modal-close': function () { closeModal(); },
  'ls-alert-close':      function () { var el = document.getElementById('ls-alert'); if (el) el.remove(); },
  'pend-alert-ok':       function () { pendAlertDismiss(); },
  // לחיצה על תנועה פותחת עורך ולא מוחקת — מסלול שמחיקתו היא הלחיצה היחידה מוחק על טעות.
  'entry-menu': function (el) {
    var r = entryById(el.dataset.id);
    if (!r) { uiNoDialog('entry-menu', el.dataset.id); return; }
    openModal(MSG_EDIT + ' · ' + r.description,
      '<div class="ksave">' +
      '<div class="fld"><label for="e-amt">סכום</label>' +
      '<input id="e-amt" type="text" inputmode="decimal" autocomplete="off" value="' +
      esc(r.amount) + '"></div>' +
      '<div class="fld"><label for="e-desc">פירוט</label>' +
      '<input id="e-desc" type="text" autocomplete="off" value="' +
      esc(r.description || '') + '"></div>' +
      '<div class="fld"><label for="e-date">תאריך</label>' +
      '<input id="e-date" type="date" value="' + esc(r.entry_date || '') + '"></div></div>',
      '<button class="btn ghost" data-act="entry-del" data-id="' + esc(r.client_id) +
      '">' + esc(MSG_DELETE) + '</button>' +
      '<button class="btn" data-act="entry-save" data-id="' + esc(r.client_id) +
      '" data-ksave>שמור</button>');
  },
  'entry-save': function (el) {
    var a = kQ('#e-amt'), ds = kQ('#e-desc'), dt = kQ('#e-date');
    if (!a || !ds || !dt) { uiNoDialog('entry-save', 'e-amt'); return; }
    var r = entryById(el.dataset.id);
    if (!r) { uiNoDialog('entry-save', el.dataset.id); return; }
    var v = readNum(a, null), txt = ds.value.trim(), day = dt.value;
    if (v === null || (r.type !== 'income' && v <= EPS) || Math.abs(v) <= EPS) {
      toast(MSG_NEED_AMOUNT, 4000, 'bad'); return;
    }
    if (!txt) { toast(MSG_NEED_DESC, 4000, 'bad'); return; }
    return runSave(function () {
      r.amount = v; r.description = txt;
      if (day) r.entry_date = day;
      r.updated_at = Date.now();
      localPut('k_entries', r);
      pushSoon();
      closeModal();
      kRender();
      return Promise.resolve();
    }, MSG_SAVED_LOCAL);
  },
  'entry-del': function (el) { return entryDelete(el.dataset.id); },
  'entry-undo': function () { entryUndo(); },
  'order-add': function () {
    openModal(MSG_ORDER_NEW, orderFormHTML(null),
      '<button class="btn" data-act="order-new" data-ksave>שמור</button>');
  },
  'order-new': function () {
    var p = orderRead(), bad = orderValid(p);
    if (bad) { toast(bad, 4000, 'bad'); return; }
    return runSave(function () {
      localPut('k_standing_orders', {
        client_id: newClientId(), name: p.name, amount: p.amount,
        day_of_month: p.day_of_month, method: p.method, category: CAT_LIST[0],
        active: true, valid_from_month: view.monthKey, valid_to_month: null,
        supersedes_id: null, updated_at: Date.now(), deleted: false
      });
      pushSoon();
      closeModal();
      kRender();
      return Promise.resolve();
    }, MSG_SAVED_LOCAL);
  },
  'order-edit': function (el) {
    var o = orderById(el.dataset.id);
    if (!o) { uiNoDialog('order-edit', el.dataset.id); return; }
    openModal(MSG_EDIT + ' · ' + o.name, orderFormHTML(o),
      '<button class="btn" data-act="order-save" data-id="' + esc(o.client_id) +
      '" data-ksave>שמור</button>');
  },
  'order-save': function (el) {
    var o = orderById(el.dataset.id);
    if (!o) { uiNoDialog('order-save', el.dataset.id); return; }
    var p = orderRead(), bad = orderValid(p);
    if (bad) { toast(bad, 4000, 'bad'); return; }
    return runSave(function () {
      orderNewVersion(o, p, view.monthKey);
      pushSoon();
      closeModal();
      kRender();
      return Promise.resolve();
    }, MSG_SAVED_LOCAL);
  },
  // היעד נשמר לשנה ולא לחודש — שורה לחודש הייתה טבלת תקופות, שנשברת בכל תקופה שלא הוזנה.
  'pledge-edit': function (el) {
    var y = String(el.dataset.id || '');
    if (!y) { uiNoDialog('pledge-edit', 'year'); return; }
    openModal(MSG_PLEDGE_EDIT + hebYearLabelFull(y),
      '<div class="ksave"><div class="fld"><label for="p-amt">סכום</label>' +
      '<input id="p-amt" type="text" inputmode="decimal" autocomplete="off" value="' +
      esc(pledgeOfYear(y)) + '"></div></div>',
      '<button class="btn" data-act="pledge-save" data-id="' + esc(y) +
      '" data-ksave>שמור</button>');
  },
  'pledge-save': function (el) {
    var inp = kQ('#p-amt'), y = String(el.dataset.id || '');
    if (!inp) { uiNoDialog('pledge-save', 'p-amt'); return; }
    var v = readNum(inp, null);
    if (v === null || v < 0) { toast(MSG_NEED_AMOUNT, 4000, 'bad'); return; }
    return runSave(function () {
      var l = kLive(MIRROR.k_pledges), i, row = null;
      for (i = 0; i < l.length; i++) if (String(l[i].hebrew_year) === y) { row = l[i]; break; }
      if (!row) row = { client_id: newClientId(), hebrew_year: y, deleted: false };
      row.pledge = v;
      row.updated_at = Date.now();
      localPut('k_pledges', row);
      pushSoon();
      closeModal();
      kRender();
      return Promise.resolve();
    }, MSG_SAVED_LOCAL);
  },
  // הפתיחה זורעת את ברירות המחדל — הרשימה שנראתה עד כה היא נפילה-חזרה בלי מזהים, ועריכה וגרירה דורשות שורה.
  // שנה אחת פתוחה בכל פעם — שתי שנים פתוחות הן הרשימה הארוכה שהקיבוץ בא למנוע.
  'arch-year': function (el) {
    view.archYear = view.archYear === el.dataset.id ? null : el.dataset.id;
    kRender();
  },
  'look-toggle': function (el) {
    var k = el.dataset.id;
    view.lookOpen = view.lookOpen === k ? null : k;
    if (view.lookOpen) lookupSeed(k, k === 'source' ? SRC_DEFAULT : METHOD_DEFAULT);
    kRender();
  },
  'look-add': function (el) {
    var k = el.dataset.id;
    openModal(MSG_WAY_NEW, lookupFormHTML(null), lookupFootHTML(null, k));
  },
  'look-edit': function (el) {
    var r = lookupById(el.dataset.id);
    if (!r) { uiNoDialog('look-edit', el.dataset.id); return; }
    openModal(MSG_EDIT + ' · ' + r.label, lookupFormHTML(r), lookupFootHTML(r, r.kind));
  },
  'look-save': function (el) {
    var inp = kQ('#l-label');
    if (!inp) { uiNoDialog('look-save', 'l-label'); return; }
    var txt = inp.value.trim(), id = el.dataset.id, kind = el.dataset.k;
    if (!txt) { toast(MSG_NEED_LABEL, 4000, 'bad'); return; }
    // השורה שנערכת מוחרגת מהבדיקה — אחרת היא מתנגשת בעצמה.
    var others = lookupRows(kind).filter(function (x) { return !idEq(x.client_id, id); })
      .map(function (x) { return x.label; });
    if (uniqHas(others, txt)) { toast(MSG_WAY_DUP, 4000, 'bad'); return; }
    return runSave(function () {
      var r = id ? lookupById(id) : null;
      if (r) { r.label = txt; }
      else r = { client_id: newClientId(), kind: kind, label: txt,
                 sort: lookupRows(kind).length + 1, deleted: false };
      r.updated_at = Date.now();
      localPut('k_lookups', r);
      pushSoon();
      closeModal();
      kRender();
      return Promise.resolve();
    }, MSG_SAVED_LOCAL);
  },
  'done-close': function () { view.screen = 'month'; view.flow = null; kRender(); },
  'sw-apply': function (el) { swApply(el); },
  'sw-dismiss': function () { swHideUpdate(); }
};

// ── המאזינים הגלובליים ──
// מאזין אחד לכל אירוע, בהאצלה מ-document — המסכים נבנים מחדש בכל רינדור, ומאזין שנקשר לאלמנט מת איתו.
document.addEventListener('click', function (e) {
  if (modalBackdrop(e)) return;
  // לחיצה על ידית הגרירה היא סופה של גרירה, ולא בחירה בשורה — אינה פותחת את העורך.
  if (e.target.closest('.grip')) return;
  var el = e.target.closest('[data-act]');
  if (!el) return;
  var fn = DOM_ACTIONS[el.dataset.act];
  if (!fn) return;
  if (el.tagName === 'A') return;
  e.preventDefault();
  actRun(el, fn);
});

document.addEventListener('keydown', function (e) {
  if (ksKey(e)) return;
  modalEsc(e);
});

// גרירה על אירועי מצביע ולא HTML5 — dragstart, dragover ו-drop אינם נורים במגע.
// הגרירה מתחילה מהידית בלבד — שורה שכולה נגררת חוטפת את הגלילה, ו-touch-action על כל השורה נועל את הדף.
var DRAG = { el: null, list: null, kind: null, moved: false };

document.addEventListener('pointerdown', function (e) {
  var g = e.target.closest && e.target.closest('.det.drag > li .grip');
  if (!g) return;
  var li = g.closest('li');
  DRAG.el = li; DRAG.list = li.parentNode;
  DRAG.kind = DRAG.list.dataset.kind; DRAG.moved = false;
  li.classList.add('dragging');
  // בלי לכידת המצביע אצבע שיוצאת מגבול האלמנט מפסיקה לשדר, והגרירה נתקעת.
  try { g.setPointerCapture(e.pointerId); } catch (e1) {}
  e.preventDefault();
});

document.addEventListener('pointermove', function (e) {
  if (!DRAG.el) return;
  e.preventDefault();
  var over = document.elementFromPoint(e.clientX, e.clientY);
  var li = over && over.closest ? over.closest('.det.drag > li') : null;
  if (!li || li === DRAG.el || li.parentNode !== DRAG.list) return;
  DRAG.moved = true;
  // ההזזה בעץ בזמן הגרירה היא המשוב היחיד; החצי התחתון של שורת היעד מכניס אחריה.
  var r = li.getBoundingClientRect();
  DRAG.list.insertBefore(DRAG.el, e.clientY > r.top + r.height / 2 ? li.nextSibling : li);
});

document.addEventListener('pointerup', function () {
  if (!DRAG.el) return;
  var el = DRAG.el, list = DRAG.list, kind = DRAG.kind, moved = DRAG.moved;
  DRAG.el = null; DRAG.list = null; DRAG.kind = null; DRAG.moved = false;
  el.classList.remove('dragging');
  if (!moved) return;
  var ids = [].slice.call(list.children).map(function (x) { return x.dataset.id; });
  if (lookupReorder(kind, ids)) kRender();
});

// ── העלייה ──
function kBoot() {
  shell.kRender = kRender;
  S.sb = sbWatch(window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY));
  lsBoot();
  _kLoadPushed();
  mirrorBoot();
  // הפתיחה בחודש של היום ולא בחודש האחרון שיש לו נתונים — חודש ריק נפתח ריק.
  view.monthKey = nowMonthKey() || null;
  kRender();
  pendBoot();
  tombBoot();
  try { eraKick(); } catch (e) { console.warn('[era] eraKick', e); }
  bkBoot();
  hwBoot();
  rtyBoot();
  plBoot();
  kSyncPull().then(function () {
    var made = soEnsureThroughNow(), i;
    for (i = 0; i < made.length; i++) localPut('k_so_instances', made[i]);
    if (made.length) pushSoon();
    kRender();
  });
}

kBoot();

window.bootOk();
