// app/config.js — התצורה, שמות הטבלאות והמחרוזות
import { appConfigure, getDeviceId, withTimeout } from '../core/util.js';
import { ctxEpoch, ctxStale, eraKeys, pendCount, pendHas, pushDirty } from '../core/sync.js';
import { lsClearHorizons, lsRemove } from '../core/storage.js';
import { MIRROR, mirrorKey, mirrorTables } from '../core/mirror.js';
import { S } from './state.js';
import { K_PUSHED_KEY, _kMarkPushed, hwHorizonDate, kDirtyRows, kPendKey, kPendKeyOf,
         kRowTs, kStripRows, kSyncNow, kTableMeta, saveRefresh } from './domain.js';
import { DOM_ACTIONS, kRender } from './main.js';

// התצורה נמסרת בשומרי קריאה — חלקה מוגדר בהמשך, והשומר קורא אותה בזמן הקריאה ולא בזמן המסירה.
appConfigure({
  get BK_CFG() { return BK_CFG; },
  get DATA_ERA() { return DATA_ERA; },
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
  get TOAST_DEFAULT_MS() { return TOAST_DEFAULT_MS; },
  get saveRefresh() { return saveRefresh; }
});

var SUPABASE_URL = self.APP.supabase.url;

var SUPABASE_ANON_KEY = self.APP.supabase.key;

var EPS = 0.005;

// ── הודעות ──
var MSG_OPENER = 'אין עוד מלבדו!';

var MSG_CLOSER = 'יחי אדוננו מורנו ורבינו מלך המשיח לעולם ועד';

var MSG_TZ_BLESS = 'גדולה צדקה שמקרבת את הגאולה';

var MSG_NEED_AMOUNT = '⚠️ הסכום חסר — נא להזין סכום לרישום';

var MSG_NEED_DESC = '⚠️ נא למלא פירוט';

var MSG_SLIDE_KUPA = 'החלק את המטבע לקופה';

var MSG_SLIDE_WALLET = 'החלק את המטבע לארנק';

var MSG_SLIDE_SUB = 'לאישור הפעולה';

var MSG_DEL_PRE = 'למחוק את «';

var MSG_DEL_POST = '»?';

var MSG_UNDO = 'בטל';

var MSG_DELETED = 'נמחק';

var MSG_EMPTY_PRE = 'חודש טוב! עוד לא נרשם כלום ב-';

var MSG_SUM_INCOME = 'הכנסות החודש';

var MSG_SUM_TZEDAKAH = 'צדקה החודש';

var MSG_SUM_SELF = 'אישית · ';

var MSG_SUM_OTHERS = 'לאחרים · ';

// כותרת אחידה בשני הרכיבים — שני ניסוחים לאותו מספר נקראים כשני מושגים.
var MSG_LEFT_SUM = 'סכום שנשאר: ';

var MSG_PART_MONTH = 'החודש ';

var MSG_PART_CARRY = 'יתרה ';

var MSG_ADD_INCOME = 'הכנסה';

var MSG_ADD_TZEDAKAH = 'צדקה';

var MSG_ORDERS_TITLE = 'הוראות קבע';

var MSG_SETTINGS_TITLE = 'הגדרות';

var MSG_BACK = 'חזרה';

var MSG_EDIT = 'עריכה';

var MSG_ORDER_NEW = 'הוראת קבע חדשה';

var MSG_ORDER_FROM = 'חודש תחילת פעילות';

var MSG_WAY_INCOME = 'אופני הכנסה';

var MSG_WAY_TZEDAKAH = 'אופני צדקה';

var MSG_WAY_NEW = 'אופן חדש';

var MSG_WAY_LABEL = 'שם האופן';

var MSG_NEED_LABEL = '⚠️ נא למלא שם לאופן';

var MSG_NO_ORDERS = 'עוד לא נרשמה הוראת קבע';

var MSG_ARCH_EMPTY = 'אין כאן עדיין כלום';

var MSG_WAY_DUP = '⚠️ אופן בשם הזה כבר קיים';

var MSG_PLEDGE_EDIT = 'יעד הפלעדזש · ';

var MSG_NEED_DAY = '⚠️ יום החיוב חסר — נא להזין מספר בין 1 ל-30';

// ── תצורה ──
// טבלה שנכתבת מקומית ואינה ב-PUSH_TABLES — שורותיה אינן עולות לעולם; והאב לפני הבן, אחרת הבן נקרא כיתום.
var KV_TABLE = 'k_settings';

var PUSH_TABLES = ['k_pledges', 'k_standing_orders',
                   'k_so_instances', 'k_entries', 'k_lookups', KV_TABLE];

// ── מטא-הטבלאות ──
// שם, מפתח ועמודת התנגשות במקום אחד — שם שנכתב פעמיים מתפצל ביום שאחד האתרים נערך.
var TABLES = [
  { t: 'k_pledges',         key: 'hebrew_year' },
  { t: 'k_standing_orders', key: 'client_id' },
  { t: 'k_so_instances',   key: 'client_id' },
  { t: 'k_entries',        key: 'client_id' },
  { t: 'k_lookups',        key: 'client_id' },
  { t: KV_TABLE,           key: 'key' }
];

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

var TOAST_DEFAULT_MS = 2600;

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

// ── ERA_CFG ──
// העידן עולה רק בשינוי צורת שורה — שורה ישנה שנדחפת נושאת מפתח שאין לו עמודה, נופלת ב-42703 וחוסמת את התור
var DATA_ERA = 3;

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

export { EPS, KV_TABLE, MSG_ADD_INCOME, MSG_ADD_TZEDAKAH, MSG_ARCH_EMPTY, MSG_BACK,
         MSG_CLOSER, MSG_DELETED, MSG_DEL_POST, MSG_DEL_PRE, MSG_EDIT, MSG_EMPTY_PRE,
         MSG_LEFT_SUM, MSG_NEED_AMOUNT, MSG_NEED_DAY, MSG_NEED_DESC, MSG_NEED_LABEL,
         MSG_NO_ORDERS, MSG_OPENER, MSG_ORDERS_TITLE, MSG_ORDER_FROM, MSG_ORDER_NEW,
         MSG_PART_CARRY, MSG_PART_MONTH, MSG_PLEDGE_EDIT, MSG_SETTINGS_TITLE,
         MSG_SLIDE_KUPA, MSG_SLIDE_SUB, MSG_SLIDE_WALLET, MSG_SUM_INCOME,
         MSG_SUM_OTHERS, MSG_SUM_SELF, MSG_SUM_TZEDAKAH, MSG_TZ_BLESS, MSG_UNDO,
         MSG_WAY_DUP, MSG_WAY_INCOME, MSG_WAY_LABEL, MSG_WAY_NEW, MSG_WAY_TZEDAKAH,
         PUSH_TABLES, SUPABASE_ANON_KEY, SUPABASE_URL, TABLES };
