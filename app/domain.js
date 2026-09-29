// app/domain.js — החישוב, התקופה, הוראות הקבע והסנכרון
import { HE_COLLATOR, dayNoon, dayToday, withTimeout } from '../core/util.js';
import { ctxEpoch, ctxStale, idEq, mergeCore, pendHas, pendMark, pushDirty,
         schedulePush, tombInherit, tombKill } from '../core/sync.js';
import { hwNoteCloud, lsGet, lsSet } from '../core/storage.js';
import { MIRROR, mirrorSave } from '../core/mirror.js';
import { logAction } from '../core/backup.js';
import { esc } from '../core/ui.js';
import { bar } from '../core/chart.js';
import { hebDate, hebMonthNames, hebYearLabelFull } from '../core/hebrew.js';
import { ARCH_FIRST, EPS, KV_TABLE, K_CAT_SELF, K_PUSHED_KEY, MSG_ADD_INCOME, MSG_CLOSER,
         MSG_LEFT_SUM, MSG_OPENER, MSG_PART_CARRY, MSG_PART_MONTH, MSG_SUM_OTHERS,
         MSG_SUM_SELF, PUSH_TABLES, TABLES } from './constants.js';
import { S, shell, view } from './state.js';

// ── ליבת החישוב ──
// אין .rpc וקריאה למסד — חישוב בשרת שובר אופליין.
// שתי היתרות מעבירות זכות וחובה; הפלעדזש מתאפס בראש השנה העברית והחומש אינו מתאפס.
var K_CHUMASH_RATE = 0.2;

function kSum(a) { var s = 0, i; for (i = 0; i < a.length; i++) s += a[i]; return s; }

function kLive(rows) { return rows.filter(function (r) { return !r.deleted; }); }

function kIncome(rows) {
  return kSum(kLive(rows).filter(function (r) { return r.type === 'income'; })
    .map(function (r) { return +r.amount || 0; }));
}

function kTzedakah(rows) {
  return kSum(kLive(rows).filter(function (r) { return r.type === 'tzedakah'; })
    .map(function (r) { return +r.amount || 0; }));
}

function kChumash(income) { return income * K_CHUMASH_RATE; }

function kSelfPct(rows) {
  var tz = kTzedakah(rows);
  if (!tz) return 0;
  var self = kSum(kLive(rows).filter(function (r) {
    return r.type === 'tzedakah' && r.category === K_CAT_SELF;
  }).map(function (r) { return +r.amount || 0; }));
  return self / tz * 100;
}

// חודש בודד אינו יודע מה קדם לו — שתי היתרות מצטברות לאורך כל החודשים.
// היתרה עוברת הלאה תמיד, בשני החישובים — אין תנאי שעוצר אותה בחודש כלשהו.
function kChain(months, opts) {
  var pledgeOf = opts.pledgeOf;
  var balance = opts.opening || 0;
  var pBalance = 0;
  var prevYear = null;
  var out = [], i, m;
  for (i = 0; i < months.length; i++) {
    m = months[i];
    var income = kIncome(m.rows);
    var tzedakah = kTzedakah(m.rows);
    var chumash = kChumash(income);
    var pledge = pledgeOf(m.year);
    // יתרה חיובית היא זכות ומקטינה את החובה, ושלילית היא חוב ומגדילה אותה.
    var prevBalance = balance;
    var chumashCarry = -prevBalance;
    var chumashDue = chumash + chumashCarry;
    var chumashLeft = chumashDue - tzedakah;
    balance = -chumashLeft;

    // אותה צורה כחומש, בשני הבדלים: היתרה מתאפסת בראש השנה, והסכום החודשי נקבע פעם בשנה.
    var yearTurn = prevYear !== null && String(m.year) !== prevYear;
    var pledgeOpen = yearTurn ? 0 : pBalance;
    var pledgeCarry = -pledgeOpen;
    var pledgeDue = pledge + pledgeCarry;
    var pledgeLeft = pledgeDue - tzedakah;
    pBalance = -pledgeLeft;
    prevYear = String(m.year);

    out.push({ key: m.key, year: m.year, income: income, tzedakah: tzedakah,
               chumash: chumash, pledge: pledge, prevBalance: prevBalance,
               balance: balance, chumashCarry: chumashCarry, chumashDue: chumashDue,
               chumashLeft: chumashLeft, pledgeOpen: pledgeOpen,
               pledgeBalance: -pledgeLeft, pledgeCarry: pledgeCarry,
               pledgeDue: pledgeDue, pledgeLeft: pledgeLeft,
               selfPct: kSelfPct(m.rows) });
  }
  return out;
}

function kTableMeta(t) {
  var i;
  for (i = 0; i < TABLES.length; i++) if (TABLES[i].t === t) return TABLES[i];
  return { t: t, key: 'client_id' };
}

function kRowTs(r) { return (r && +r.updated_at) || 0; }

// המפתח נגזר מהמטא — טבלת ההגדרות ממופתחת ב-key, ומפתח מוקלד היה מסמן שורה שהמיזוג אינו מוצא.
function kPendKey(t, r) { return kPendKeyOf(t, r && r[kTableMeta(t).key]); }

// ההגדרות מסומנות setting:<מפתח> בלי שם הטבלה — זה הסימון המשותף, ולא מה שנבדל.
function kPendKeyOf(t, k) { return (t === KV_TABLE ? 'setting' : t) + ':' + k; }

function kStripRows(t, rows) { return rows; }

function _kLoadPushed() {
  try { S._kPushedAt = JSON.parse(lsGet(K_PUSHED_KEY) || '{}') || {}; } catch (e) { S._kPushedAt = {}; }
}

function _kMarkPushed(t) {
  S._kPushedAt[t] = Date.now();
  lsSet(K_PUSHED_KEY, JSON.stringify(S._kPushedAt));
}

// האופק אינו ראיה עננית — הפינוי נעשה מול העד, והחלון אומר רק מה מוצג.
function hwHorizonDate() {
  var t = dayToday();
  return (+t.slice(0, 4) - 1) + t.slice(4);
}

// ── משיכה, מיזוג ודחיפה ──
// כשל מחזיר «אין ראיה» — מיזוג מול מערך ריק מוחק את מה שלא הספיק לעלות.
function pullTable(t) {
  return withTimeout(S.sb.from(t).select('*')).then(function (r) {
    if (!r || r.error || !Array.isArray(r.data)) return { ok: false, rows: [] };
    return { ok: true, rows: r.data };
  }, function () { return { ok: false, rows: [] }; });
}

function mergeTable(t, remote) {
  var m = kTableMeta(t);
  var merged = mergeCore(MIRROR[t] || [], remote, { key: m.key, isPending: function (k) {
    return pendHas(kPendKeyOf(t, k));
  } });
  MIRROR[t] = merged;
  mirrorSave(t);
  return merged;
}

function kSyncPull() {
  if (!S.sb) return Promise.resolve(false);
  if (S._syncBusy) return Promise.resolve(false);
  S._syncBusy = true;
  var ep = ctxEpoch();
  return Promise.all(PUSH_TABLES.map(pullTable)).then(function (res) {
    if (ctxStale(ep)) return false;
    var any = false, i;
    for (i = 0; i < PUSH_TABLES.length; i++) {
      if (!res[i].ok) continue;
      any = true;
      mergeTable(PUSH_TABLES[i], res[i].rows);
    }
    if (any) hwNoteCloud();
    if (any && !S._kPullLogged) { S._kPullLogged = true; kSyncLog('pull', null, null); }
    return any;
  }).then(function (any) {
    S._syncBusy = false;
    if (any) shell.kRender();
    return any;
  }, function (e) {
    S._syncBusy = false;
    console.error('[sync] משיכה נכשלה', e);
    return false;
  });
}

// אין לרשום כל מחזור סנכרון — הבדיקה המחזורית רצה כל שלוש שניות, ו-sh_sync_log היא insert בלבד ואי-אפשר לדלל אותה.
// אין כניסה — user_name נרשם null, והמכשיר הוא שמזהה את הרישום.
function kSyncLog(action, key, recordCount, details) {
  try { logAction(action, key, recordCount, details); } catch (e) { }
}

function kSyncNow() {
  return kSyncPull().then(function () { return pushDirty(); })
    .then(function (r) { if (r && r.n) kSyncLog('push', null, r.n); return r; });
}

function pushSoon() { schedulePush(); }

var kQ = function (s) { return document.querySelector(s); };

// מפריד אלפים, ו-₪ אחרי המספר עם רווח.
var NUM_FMT = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 });

function money(n) { return NUM_FMT.format(Math.round(n)) + ' ₪'; }

// הוראות הקבע בתחתית, ומעליהן התאריכים מהחדש לישן ובתוך תאריך סדר הא״ב — ואין קיבוץ לפי סוג.
function kSortEntries(list) {
  return list.slice().sort(function (a, b) {
    var sa = a.source === 'standing' ? 1 : 0, sb = b.source === 'standing' ? 1 : 0;
    if (sa !== sb) return sa - sb;
    var d = String(b.entry_date || '').localeCompare(String(a.entry_date || ''));
    if (!sa && d !== 0) return d;
    var n = HE_COLLATOR.compare(String(a.description || ''), String(b.description || ''));
    return n !== 0 ? n : String(a.client_id).localeCompare(String(b.client_id));
  });
}

// ── התקופה ──
// המפתח YYYY-NN מרופד לשתי ספרות — בלי הריפוד ההשוואה הלקסיקוגרפית מסדרת את החודש העשירי לפני השני.
function kPad2(n) { return (n < 10 ? '0' : '') + n; }

// העוגן בצהריים מקומיים — חצות נופל ליום הקודם במעבר לשעון חורף.
function kHeb(iso) {
  var h;
  if (!iso) return null;
  try { h = hebDate(dayNoon(String(iso))); } catch (e) { return null; }
  return (h && h.ok) ? h : null;
}

function yearOf(iso) { var h = kHeb(iso); return h ? String(h.year) : ''; }

function monthKeyOf(iso) {
  var h = kHeb(iso);
  return h ? yearOf(iso) + '-' + kPad2(h.monthIndex + 1) : '';
}

function keyYear(k) { return String(k || '').slice(0, 4); }

function keyOrdinal(k) { return +String(k || '').slice(5) || 0; }

// התווית מטבלת השמות של אותה שנה — שנה מעוברת נושאת אדר א ואדר ב נפרדים, ומיפוי שקורס אותם מאחד כ-60 יום.
function monthLabel(k) {
  var y = +keyYear(k), i = keyOrdinal(k) - 1, names;
  if (!y || i < 0) return '';
  try { names = hebMonthNames(y); } catch (e) { return ''; }
  return names[i] || '';
}

// חשבון על מספר יום שלם ולא על מילישניות — חיבור של 24 שעות חוצה גבול שעון-קיץ ונופל ליום הקודם.
function kDayNum(y, m, d) { return Math.floor(Date.UTC(y, m, d) / 86400000); }

function kIsoOfDay(n) {
  var d = new Date(n * 86400000);
  return d.getUTCFullYear() + '-' + kPad2(d.getUTCMonth() + 1) + '-' + kPad2(d.getUTCDate());
}

function kAddDays(iso, n) {
  var p = String(iso).slice(0, 10).split('-');
  return kIsoOfDay(kDayNum(+p[0], +p[1] - 1, +p[2]) + n);
}

function kScale(iso) { var h = kHeb(iso); return h ? h.year * 100 + h.monthIndex + 1 : 0; }

// המנוע ממפה לועזי לעברי בכיוון אחד, והסולם «שנה×100 + חודש» מונוטוני — ולכן ראש החודש נמצא בחיפוש בינארי.
// התוצאה במטמון — כל חישוב הוא כתריסר גזירות.
var _kMonthStart = {};

function monthStart(k) {
  var y = +keyYear(k), ord = keyOrdinal(k), want, lo, hi, mid, out = '';
  if (_kMonthStart[k] !== undefined) return _kMonthStart[k];
  if (y && ord) {
    want = y * 100 + ord;
    lo = kDayNum(y - 3762, 0, 1);
    hi = kDayNum(y - 3760, 11, 31);
    if (kScale(kIsoOfDay(lo)) < want && kScale(kIsoOfDay(hi)) >= want) {
      while (hi - lo > 1) {
        mid = Math.floor((lo + hi) / 2);
        if (kScale(kIsoOfDay(mid)) >= want) hi = mid; else lo = mid;
      }
      if (kScale(kIsoOfDay(hi)) === want) out = kIsoOfDay(hi);
    }
  }
  _kMonthStart[k] = out;
  return out;
}

// חודש ריק הוא חודש — דילוג עליו מסתיר מהמשתמש לאן הגיע.
function prevMonthOf(k) {
  var s = monthStart(k);
  return s ? monthByKey(monthKeyOf(kAddDays(s, -1))) : null;
}

function nextMonthOf(k) {
  var s = monthStart(k);
  return s ? monthByKey(monthKeyOf(kAddDays(s, 31))) : null;
}

function monthByKey(k) {
  var y = +keyYear(k), ord = keyOrdinal(k);
  if (!y || !ord) return null;
  return { key: String(k), year: String(y), ordinal: ord,
           name: monthLabel(k), start: monthStart(k) };
}

// החודש הנוכחי נכנס תמיד — בלעדיו התקנה טרייה נפתחת למסך שלד.
// withView מוצהר בכל קריאה — הארכיון אינו צריך את החודש שמוצג, וניווט לחודש ריק היה מוסיף אותו לארכיון.
function monthsWithData(withView) {
  var seen = {}, out = [], l, i, k;
  l = kLive(MIRROR.k_entries);
  for (i = 0; i < l.length; i++) { k = monthKeyOf(l[i].entry_date); if (k) seen[k] = true; }
  l = kLive(MIRROR.k_so_instances);
  for (i = 0; i < l.length; i++) { k = String(l[i].due_heb_month || ''); if (k) seen[k] = true; }
  k = nowMonthKey();
  if (k) seen[k] = true;
  // החודש שמוצג נכנס לשרשרת — אחרת חודש מחוץ לטווח נפתח באפסים גם כשלשנה שלו יש יעד.
  if (withView && view.monthKey) seen[view.monthKey] = true;
  for (i in seen) if (Object.prototype.hasOwnProperty.call(seen, i)) out.push(i);
  return out.sort();
}

// השרשרת רצה על כל חודש שבטווח — חודש ריק צורך את העודף שנשאר מקודמו.
// התקרה חמישים שנה — מפתח פגום היה פותח לולאה בלי סוף.
function monthsSorted(withView) {
  var have = monthsWithData(withView), out = [], k, last, n, guard = 0;
  if (!have.length) return out;
  k = have[0]; last = have[have.length - 1];
  while (k && k <= last && guard++ < 650) {
    out.push(monthByKey(k));
    n = nextMonthOf(k);
    k = n ? n.key : '';
  }
  return out;
}

function entriesOfMonth(k) {
  return kLive(MIRROR.k_entries).filter(function (r) { return monthKeyOf(r.entry_date) === k; });
}

// מופע ממתין נספר בצדקה מיד — אחרת ה«חסר» שגוי מתחילת החודש ועד יום החיוב.
function instancesOfMonth(k) {
  return kLive(MIRROR.k_so_instances).filter(function (r) { return String(r.due_heb_month || '') === k; });
}

// הוראה נספרת גם בלי מופע שמור — המופע נכתב רק עד החודש הנוכחי, וכתיבה בניווט הייתה יוצרת שורות לעתיד.
// הוראה שכבר יש לה מופע אינה נוספת שוב.
function orderRowsPending(k, m) {
  var os = ordersLive(), have = instancesOfMonth(k), out = [], i, j, o, dup;
  for (i = 0; i < os.length; i++) {
    o = os[i];
    if (!orderAppliesTo(o, m)) continue;
    dup = false;
    for (j = 0; j < have.length; j++)
      if (idEq(have[j].standing_order_client_id, o.client_id)) { dup = true; break; }
    if (dup) continue;
    out.push({ client_id: o.client_id, order_id: o.client_id, type: 'tzedakah',
               amount: +o.amount || 0, description: o.name, entry_date: soDate(k, o),
               category: o.category, method: o.method,
               source: 'standing', deleted: false });
  }
  return out;
}

function instanceRows(k) {
  var m = monthByKey(k);
  return instancesOfMonth(k).map(function (r) {
    var o2 = orderById(r.standing_order_client_id);
    return { client_id: r.client_id, order_id: o2 ? o2.client_id : '', type: 'tzedakah',
             amount: +r.amount || 0,
             description: o2 ? o2.name : '', entry_date: soDate(k, o2),
             category: o2 ? o2.category : '', method: o2 ? o2.method : '',
             source: 'standing', deleted: false };
  }).concat(m ? orderRowsPending(k, m) : []);
}

function monthRows(k) { return entriesOfMonth(k).concat(instanceRows(k)); }

// שנה בלי שורה היא אפס ולא כשל — התקנה טרייה אינה נושאת אף שורה.
function pledgeOfYear(y) {
  var l = kLive(MIRROR.k_pledges), i;
  for (i = 0; i < l.length; i++) if (l[i].pledge_heb_year === Number(y)) return +l[i].pledge || 0;
  return 0;
}

function openingBalance() {
  var l = kLive(MIRROR.k_pledges).slice().sort(function (a, b) {
    return a.pledge_heb_year - b.pledge_heb_year;
  });
  return l.length ? (+l[0].chumash_opening_balance || 0) : 0;
}

// החודש הנוכחי הוא הגבול שמעבר לו הפלעדזש אינו נושא יתרה — חודש שלא נסגר אין לו מה להוריש.
function nowMonthKey() { return monthKeyOf(dayToday()); }

function chainAll(withView) {
  var ms = monthsSorted(withView).map(function (m) {
    return { key: m.key, year: m.year, rows: monthRows(m.key) };
  });
  return kChain(ms, { pledgeOf: pledgeOfYear, opening: openingBalance() });
}

function chainOf(k, withView) {
  var c = chainAll(withView), i;
  for (i = 0; i < c.length; i++) if (idEq(c[i].key, k)) return c[i];
  return null;
}

// ── הוראות קבע ──
function ordersLive() {
  return kLive(MIRROR.k_standing_orders).filter(function (o) { return o.active !== false; });
}

function orderById(id) {
  var l = kLive(MIRROR.k_standing_orders), i;
  for (i = 0; i < l.length; i++) if (idEq(l[i].client_id, id)) return l[i];
  return null;
}

// גרסה שנפתחה בעריכת מופע מקבלת «תוקף עד» החודש הקודם, והחדשה מתחילה מהחודש הנוכחי — מופעים קודמים אינם משתנים.
function orderAppliesTo(o, m) {
  var key = m.key;
  if (o.valid_from_heb_month && key < o.valid_from_heb_month) return false;
  if (o.valid_to_heb_month && key > o.valid_to_heb_month) return false;
  return true;
}

// day_of_month הוא יום עברי, וראש החודש בא מהמנוע.
function soDate(monthKey, o) {
  var s = monthStart(monthKey);
  if (!s) return '';
  return o ? kAddDays(s, Math.max(1, +o.day_of_month || 1) - 1) : s;
}

// פעם אחת לכל צמד הוראה וחודש — ריצה שנייה אינה משנה דבר.
// המזהה נגזר מהצמד — שני מכשירים שעולים יחד כותבים את אותה שורה ולא שתיים.
function soEnsureInstances(monthKey) {
  var m = monthByKey(monthKey);
  if (!m) return [];
  var made = [], os = ordersLive(), i, o, has;
  for (i = 0; i < os.length; i++) {
    o = os[i];
    if (!orderAppliesTo(o, m)) continue;
    has = instancesOfMonth(monthKey).some(function (x) {
      return idEq(x.standing_order_client_id, o.client_id);
    });
    if (has) continue;
    made.push({ client_id: o.client_id + ':' + monthKey, standing_order_client_id: o.client_id,
                due_heb_month: monthKey, amount: +o.amount || 0,
                updated_at: Date.now(), deleted: false });
  }
  return made;
}

// הכתיבה נגזרת מהשעון ולא מהחודש שמוצג — ניווט שכותב מופעים יוצר שורות שאיש לא ביקש.
// חודש עבר שהמכשיר לא עלה בו מקבל מופעים למפרע; העתיד נגזר בתצוגה ואינו נכתב.
function soEnsureThroughNow() {
  var now = nowMonthKey(), k = ARCH_FIRST, made = [], n, guard = 0;
  while (now && k && k <= now && guard++ < 650) {
    made = made.concat(soEnsureInstances(k));
    n = nextMonthOf(k);
    k = n ? n.key : '';
  }
  return made;
}

// לפני יום החיוב המופע הוא צפי — נספר בחישוב ומסומן ככזה, גם בחודש הנוכחי.
function soIsForecast(r) {
  return r.source === 'standing' && String(r.entry_date || '') > dayToday();
}

// ── רינדור ──
// שתי השורות נצמדות לתחתית המסך ולא לסוף התוכן.
// אין כפתור חזרה — הגישה לשלושת המסכים היא משורת הניווט.
function footHTML() {
  return '<div class="foot">' +
    '<div class="closer">' + esc(MSG_CLOSER) + '</div>' +
    '<div class="opener">' + esc(MSG_OPENER) + '</div></div>';
}

// הלוגו הוא הנכס שהמחולל מייצר — ציור שני של המאסטר היה מקור אמת שני.
function brandHTML() {
  return '<img src="icons/icon-192.b77bc564.png" alt="" width="40" height="40">';
}

// טווח התאריכים הלועזי נגזר מראש החודש ומראש הבא, בצורה יום.חודש.
function gregShort(iso) {
  var t = String(iso || '');
  return t ? (+t.slice(8, 10)) + '.' + (+t.slice(5, 7)) : '';
}

function monthGreg(k) {
  var a = monthStart(k), nx = nextMonthOf(k), b = nx ? monthStart(nx.key) : '';
  if (!a) return '';
  return gregShort(a) + ' – ' + (b ? gregShort(kAddDays(b, -1)) : '');
}

// תווית השנה מהמנוע המשותף — צורה שנייה כאן הייתה מקור אמת שני לתצוגה.
function monthTitle(m) {
  return m.name + ' ' + hebYearLabelFull(m.year);
}

// הציורים מוטמעים בקוד ולא בקבצים — הם נצבעים מאסימוני הערכה, וקובץ חיצוני אינו יורש משתני CSS.
// והם בקוד ולא ב-DOM — הקליפה נושאת מבנה בלבד, ונכס שנקרא מה-DOM אינו נראה לסורק.
var K_ASSETS = {
  'asset-kupa': `<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<g stroke="var(--purple-6)" stroke-width="5" stroke-linejoin="round" stroke-linecap="round">
<rect x="34" y="204" width="172" height="18" rx="5" fill="var(--purple-4)"/>
<rect x="44" y="40" width="152" height="166" rx="10" fill="var(--purple-3)"/>
<rect x="86" y="30" width="68" height="14" rx="7" fill="var(--purple-7)"/>
<rect x="70" y="96" width="100" height="70" rx="10" fill="var(--peach-1)"/>
</g>
<text x="120" y="144" text-anchor="middle" font-size="36" font-weight="500"
      fill="var(--purple-7)">צדקה</text>
</svg>`,
  'asset-wallet': `<svg viewBox="0 0 300 240" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<g stroke="var(--purple-6)" stroke-width="5" stroke-linejoin="round" stroke-linecap="round">
<rect x="34" y="56" width="232" height="150" rx="18" fill="var(--purple-5)"/>
<rect x="46" y="66" width="208" height="26" rx="8" fill="var(--purple-7)"/>
<path d="M92 70 h116 v22 h-116 z" fill="var(--peach-1)"/>
<path d="M104 81 h92" fill="none" stroke="var(--peach-2)" stroke-width="4"/>
<rect x="34" y="84" width="232" height="122" rx="18" fill="var(--purple-3)"/>
<rect x="44" y="94" width="212" height="102" rx="12" fill="none"
      stroke="var(--purple-2)" stroke-width="3" stroke-dasharray="7 6"/>
<rect x="58" y="118" width="88" height="56" rx="8" fill="var(--purple-2)"/>
<rect x="58" y="118" width="88" height="14" rx="6" fill="var(--peach-2)"/>
<circle cx="222" cy="146" r="13" fill="var(--peach-2)"/>
<circle cx="217" cy="141" r="3.5" fill="var(--peach-1)" stroke="none"/>
</g>
</svg>`
};

function assetIcon(id) {
  if (!K_ASSETS[id]) { console.error('[ui] אין ציור בשם', id); return ''; }
  return K_ASSETS[id];
}

function iconFor(kind) {
  // סט קווי-מעוגל אחד בעובי 1.75, ואייקון קבוע לכל מקור.
  var p = {
    other:    'M12 4v16 M4 12h16',
    standing: 'M12 7v5l3 2 M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    home:     'M4 11l8-7 8 7 M7 10v10h10V10',
    archive:  'M4 8h16v12H4z M3 4h18v4H3z M10 12h4',
    gear:     'M4 7h10 M18 7h2 M4 12h4 M12 12h8 M4 17h10 M18 17h2',
    amount:   'M12 3v18 M7 8h7a3 3 0 010 6H7',
    desc:     'M5 6h14 M5 11h14 M5 16h9',
    method:   'M3 7h18v10H3z M3 11h18',
    date:     'M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4',
    category: 'M4 5h7l2 3h7v11H4z'
  }[kind] || 'M12 4v16 M4 12h16';
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
         'stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">' +
         p.split(' M').map(function (s, i) { return '<path d="' + (i ? 'M' + s : s) + '"/>'; }).join('') +
         '</svg>';
}

// שורת הוראת קבע נפתחת בעורך ההוראה ולא בעורך התנועה — אין לה שורה ב-k_entries, והעורך היה מוצא ריק.
function detailRowHTML(r) {
  var isInc = r.type === 'income';
  var so = r.source === 'standing';
  var tag = so ? 'הו״ק' : (isInc ? MSG_ADD_INCOME : (r.verified ? 'אומת' : ''));
  return (so ? '<li' + (soIsForecast(r) ? ' class="pend"' : '') +
               ' data-act="order-edit" data-id="' + esc(r.order_id || '')
             : '<li data-act="entry-menu" data-id="' + esc(r.client_id)) + '">' +
         '<span class="ico art">' + assetIcon(isInc ? 'asset-wallet' : 'asset-kupa') + '</span>' +
         '<span class="nm">' + esc(r.description || '') + '</span>' +
         '<span class="tag">' + esc(tag) + '</span>' +
         '<span class="amt">' + money(r.amount) + '</span></li>';
}

// סכום שעוד חייבים נכתב בלי סימן, והמינוס שמור ליתרת זכות בלבד.
// מינוס טיפוגרפי ולא מקף — המקף נקרא כחלק מהמילה שלפניו; והעטיפה ב-ltr מונעת מהאלגוריתם הדו-כיווני להעיף את הסימן לקצה השורה.
function signed(n) {
  // Math.round(-0.2) הוא -0, שאינו קטן מאפס — בלי האיפוס המעצב מדפיס «-0 ₪», שנקרא כחוב של כלום.
  var v = Math.round(n) || 0;
  return '<span class="ltr">' + esc(v < 0 ? '−' + money(-v) : money(v)) + '</span>';
}

// חודש בלי צדקה מציג אפס בשני האחוזים — אחוז מתוך אפס אינו חלוקה.
// המשלים נגזר מהמעוגל — שני עיגולים נפרדים נותנים 99 או 101.
function splitHTML(c) {
  var tz = c.tzedakah || 0;
  var self = tz > EPS ? Math.round(c.selfPct || 0) : 0;
  return '<span>' + esc(MSG_SUM_SELF + (tz > EPS ? self : 0) + '%') + '</span>' +
         '<span>' + esc(MSG_SUM_OTHERS + (tz > EPS ? 100 - self : 0) + '%') + '</span>';
}

// חובה שאינה חיובית היא פס מלא — אין מה להשלים, וחלוקה בה הייתה אינסוף.
function compPct(given, due) {
  if (due <= EPS) return 100;
  return Math.min(100, Math.max(0, given / due * 100));
}

// המסגרת עולה כשהיתרה בזכות ולא כשהחובה אפס — אפס מתוך אפס אינו עודף.
function compCardHTML(title, tone, due, ofMonth, ofCarry, given, after) {
  return '<div class="card comp' + (tone ? ' ' + tone : '') +
    (after > EPS ? ' plus' : '') + '">' +
    '<h2>' + esc(title) +
    '<span class="st">' + esc(MSG_LEFT_SUM) + signed(due - given) + '</span></h2>' +
    '<div class="comp-meter">' + bar(compPct(given, due).toFixed(1), tone) + '</div>' +
    '<div class="crow"><div class="big">' + signed(due) + '</div>' +
    '<div class="parts">' +
    '<span>' + esc(MSG_PART_MONTH) + signed(ofMonth) + '</span>' +
    '<span>' + esc(MSG_PART_CARRY) + signed(ofCarry) + '</span>' +
    '</div></div></div>';
}

// ── הכתיבה ──
function localPut(table, row) {
  var l = MIRROR[table], k = kTableMeta(table).key, i;
  for (i = 0; i < l.length; i++) if (idEq(l[i][k], row[k])) { l[i] = row; break; }
  if (i === l.length) l.push(row);
  mirrorSave(table);
  // מפתח אחד — קריאה בשני ארגומנטים מסמנת את שם הטבלה ולא את השורה.
  pendMark(kPendKey(table, row));
}

// זוג שחי בסכימה וחסר כאן נשאר יתום אחרי מחיקת האב.
// אין בן לשני אבות — התקופה נגזרת ואינה טבלה, ולכן אין סדר הכרעה להצהיר.
var K_CHILDREN = {
  k_standing_orders: [{ table: 'k_so_instances', fk: 'standing_order_client_id' }],
  k_so_instances:    [{ table: 'k_entries',      fk: 'so_instance_client_id' }]
};

// כל מחיקה רכה עוברת כאן — מחיקה באתר הקריאה משאירה בן יתום, והוא נספר בסיכום.
function kKill(table, row) {
  localPut(table, tombKill(row));
  var kids = K_CHILDREN[table] || [], i, j, list, kid;
  for (i = 0; i < kids.length; i++) {
    list = kLive(MIRROR[kids[i].table] || []);
    for (j = 0; j < list.length; j++) {
      kid = list[j];
      if (!idEq(kid[kids[i].fk], row.client_id)) continue;
      localPut(kids[i].table, tombInherit(row, kid));
    }
  }
  return row;
}

// ── משותף למסכים ──
function tabHeadHTML(lab) {
  return '<div class="mrow"><span class="mid"><span class="mname">' +
         esc(lab) + '</span></span></div>';
}

function lookupRows(kind) {
  return kLive(MIRROR.k_lookups).filter(function (r) { return r.kind === kind; })
    .sort(function (a, b) { return (a.sort || 0) - (b.sort || 0); });
}

export { _kLoadPushed, _kMarkPushed, assetIcon, brandHTML, chainOf, compCardHTML, compPct,
         detailRowHTML, footHTML, hwHorizonDate, iconFor, kKill, kLive,
         kPendKey, kPendKeyOf, kQ, kRowTs, kSortEntries, kStripRows, kSyncNow, kSyncPull,
         kTableMeta, localPut, lookupRows, money, monthByKey, monthGreg, monthKeyOf,
         monthRows, monthTitle, monthsSorted, nextMonthOf, nowMonthKey, orderById,
         ordersLive, pledgeOfYear, prevMonthOf, pushSoon, signed, soEnsureThroughNow,
         splitHTML, tabHeadHTML };
