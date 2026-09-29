// app/screens/settings.js — מסך ההגדרות והוראות הקבע
import { MSG_FILL_ALL, readNum } from '../../core/util.js';
import { idEq, newClientId } from '../../core/sync.js';
import { MIRROR } from '../../core/mirror.js';
import { esc, uiNoDialog } from '../../core/ui.js';
import { hebYearLabelFull } from '../../core/hebrew.js';
import { EPS, METHOD_DEFAULT, MSG_NEED_AMOUNT, MSG_NEED_DAY, MSG_NEED_DESC, MSG_NO_ORDERS,
         MSG_ORDERS_TITLE, MSG_ORDER_FROM, MSG_ORDER_NEW, MSG_SETTINGS_TITLE,
         MSG_WAY_INCOME, MSG_WAY_LABEL, MSG_WAY_NEW, MSG_WAY_TZEDAKAH,
         SRC_DEFAULT } from '../constants.js';
import { view } from '../state.js';
import { footHTML, iconFor, kLive, kQ, kSortMonthKeys, kSortYears, localPut, lookupRows, money,
         monthByKey, monthTitle, monthsSorted, nextMonthOf, nowMonthKey, ordersLive, pledgeOfYear,
         prevMonthOf, tabHeadHTML } from '../domain.js';

// הוראת קבע מחויבת באשראי או בהעברה בלבד — רשימת המקורות שבהגדרות היא של התנועות ולא של ההוראות.
var ORDER_METHODS = ['אשראי', 'העברה'];

// הכפתור בתוך הכרטיס — כפתור שנצמד לכרטיס הבא נקרא כשייך לו.
function ordersCardHTML() {
  var os = ordersLive();
  return '<div class="card"><h2>' + esc(MSG_ORDERS_TITLE) + '</h2>' +
    (os.length ? '<ul class="det">' + os.map(function (o) {
      return '<li data-act="order-edit" data-id="' + esc(o.client_id) + '">' +
             '<span class="ico">' + iconFor('standing') + '</span>' +
             '<span class="nm">' + esc(o.name) + '</span>' +
             '<span class="tag">' + esc('יום ' + o.day_of_month) + '</span>' +
             '<span class="amt">' + money(o.amount) + '</span></li>';
    }).join('') + '</ul>'
     : '<div class="empty">' + esc(MSG_NO_ORDERS) + '</div>') +
    '<button class="btn ghost card-add" data-act="order-add">' + esc(MSG_ORDER_NEW) + '</button>' +
    '</div>';
}

function lookupCardHTML(kind, title, dflt) {
  var open = view.lookOpen === kind;
  var rows = open ? lookupRows(kind) : [];
  var labels = open && !rows.length ? dflt : null;
  return '<div class="card"><h2 class="fold" data-act="look-toggle" data-id="' + esc(kind) + '">' +
    esc(title) + '<span class="st">' + esc(open ? '⌃' : '⌄') + '</span></h2>' +
    (!open ? '' :
      '<ul class="det drag">' +
      (labels ? labels.map(function (x) {
        return '<li><span class="ico">' + iconFor('other') + '</span>' +
               '<span class="nm">' + esc(x) + '</span></li>';
      }).join('')
      : rows.map(function (r) {
        return '<li data-act="look-edit" data-drag="' + esc(kind) + '" data-id="' + esc(r.client_id) + '">' +
               '<span class="grip" data-grip aria-hidden="true">⠿</span>' +
               '<span class="nm">' + esc(r.label) + '</span></li>';
      }).join('')) + '</ul>' +
      '<button class="btn ghost card-add" data-act="look-add" data-id="' + esc(kind) + '">' +
      esc(MSG_WAY_NEW) + '</button>') +
    '</div>';
}

// ── הוראות קבע — עריכה פותחת גרסה ──
// עריכת מופע חלה מהחודש והלאה: הישנה מקבלת תוקף עד החודש הקודם, ומופעים שכבר נספרו אינם משתנים.
function orderNewVersion(o, patch, fromMonth) {
  var m = monthByKey(fromMonth) || monthByKey(view.monthKey);
  if (!m) { uiNoDialog('orderNewVersion', fromMonth); return null; }
  var key = m.key;
  var prev = prevMonthOf(m.key);
  var old = kLive(MIRROR.k_standing_orders).filter(function (x) {
    return idEq(x.client_id, o.client_id);
  })[0];
  if (old) {
    old.valid_to_heb_month = prev ? prev.key : key;
    old.active = false;
    old.updated_at = Date.now();
    localPut('k_standing_orders', old);
  }
  var next = {
    client_id: newClientId(), name: patch.name != null ? patch.name : o.name,
    amount: patch.amount != null ? patch.amount : o.amount,
    day_of_month: patch.day_of_month != null ? patch.day_of_month : o.day_of_month,
    method: patch.method != null ? patch.method : o.method,
    category: o.category, active: true,
    valid_from_heb_month: key, valid_to_heb_month: null,
    supersedes_client_id: o.client_id, updated_at: Date.now(), deleted: false
  };
  localPut('k_standing_orders', next);
  return next;
}

// day_of_month הוא מספר בין 1 ל-30 ולא תאריך מלא — והתווית אומרת זאת.
// חודשי הבחירה נגזרים ואינם מוקלדים — רשימה מוקלדת נגמרת; והטווח קדימה הוא שנה.
var ORDER_AHEAD = 13;

function monthOptions(extra) {
  var seen = {}, out = [], ms = monthsSorted(true), i, k = nowMonthKey();
  for (i = 0; i < ms.length; i++) seen[ms[i].key] = true;
  for (i = 0; i < ORDER_AHEAD && k; i++) { seen[k] = true; var n = nextMonthOf(k); k = n ? n.key : ''; }
  if (extra) seen[extra] = true;
  for (i in seen) if (Object.prototype.hasOwnProperty.call(seen, i)) out.push(i);
  return kSortMonthKeys(out);
}

function orderFormHTML(o) {
  var list = ORDER_METHODS;
  var from = (o && o.valid_from_heb_month) || nowMonthKey();
  return '<div data-ks>' +
    '<div class="fld"><label for="o-amt">סכום</label>' +
    '<input id="o-amt" type="text" inputmode="decimal" autocomplete="off" value="' +
    esc(o ? o.amount : '') + '"></div>' +
    '<div class="fld"><label for="o-name">פירוט</label>' +
    '<input id="o-name" type="text" autocomplete="off" value="' +
    esc(o ? o.name : '') + '"></div>' +
    '<div class="fld"><label for="o-method">אופן</label><select id="o-method">' +
    list.map(function (x) {
      return '<option value="' + esc(x) + '"' +
             (o && o.method === x ? ' selected' : '') + '>' + esc(x) + '</option>';
    }).join('') + '</select></div>' +
    '<div class="fld"><label for="o-day">יום בחודש</label>' +
    '<input id="o-day" type="text" inputmode="numeric" autocomplete="off" value="' +
    esc(o ? o.day_of_month : '') + '"></div>' +
    // לא רטרואקטיבית — מופעים של חודשים קודמים כבר נספרו, ושינוי בדיעבד היה מזיז חודש סגור.
    '<div class="fld"><label for="o-from">' + esc(MSG_ORDER_FROM) + '</label>' +
    '<select id="o-from">' + monthOptions(o && o.valid_from_heb_month).map(function (k) {
      return '<option value="' + esc(k) + '"' + (k === from ? ' selected' : '') + '>' +
             esc(monthTitle(monthByKey(k))) + '</option>';
    }).join('') + '</select></div></div>';
}

// מחזירה null כששדה אינו ב-DOM — קריאה משדה חסר הייתה זורקת, והמסלול נגמר בלי הסבר.
function orderRead() {
  var a = kQ('#o-amt'), nm = kQ('#o-name'), me = kQ('#o-method'), dy = kQ('#o-day');
  var fr = kQ('#o-from');
  if (!a || !nm || !me || !dy || !fr) { uiNoDialog('orderRead', 'o-amt'); return null; }
  return { amount: readNum(a, null), name: nm.value.trim(),
           method: me.value, day_of_month: readNum(dy, null),
           valid_from_heb_month: fr.value };
}

function orderValid(p) {
  if (!p) return MSG_FILL_ALL;
  if (p.amount === null || p.amount <= EPS) return MSG_NEED_AMOUNT;
  if (!p.name) return MSG_NEED_DESC;
  if (p.day_of_month === null || p.day_of_month < 1 || p.day_of_month > 30) return MSG_NEED_DAY;
  if (!p.valid_from_heb_month) return MSG_FILL_ALL;
  return '';
}

// ── ההגדרות ──
// השנים נגזרות מהשרשרת ומהשורות הקיימות — רשימת שנים מוקלדת נגמרת.
function lookupById(id) {
  var l = kLive(MIRROR.k_lookups), i;
  for (i = 0; i < l.length; i++) if (idEq(l[i].client_id, id)) return l[i];
  return null;
}

function lookupFormHTML(r) {
  return '<div data-ks><div class="fld"><label for="l-label">' +
    esc(MSG_WAY_LABEL) + '</label>' +
    '<input id="l-label" type="text" autocomplete="off" value="' +
    esc(r ? r.label : '') + '"></div></div>';
}

// כפתור אחד לשני המסלולים — שני ליטרלים הם שני מקומות שבהם data-ksave יכול להישמט.
function lookupFootHTML(r, kind) {
  return '<button class="btn" data-act="look-save" data-id="' + esc(r ? r.client_id : '') +
    '" data-k="' + esc(kind) + '" data-ksave>שמור</button>';
}

function pledgeYears() {
  var seen = {}, out = [], ms = monthsSorted(true), l = kLive(MIRROR.k_pledges), i;
  for (i = 0; i < ms.length; i++) seen[ms[i].year] = true;
  for (i = 0; i < l.length; i++) seen[l[i].pledge_heb_year] = true;
  for (i in seen) if (Object.prototype.hasOwnProperty.call(seen, i)) out.push(Number(i));
  return kSortYears(out);
}

// שנה שאין לה שורה היא אפס, ולא כשל.
function pledgeCardHTML() {
  var ys = pledgeYears();
  if (!ys.length) return '';
  return '<div class="card"><h2>יעד פלעדזש שנתי</h2><ul class="det">' +
    ys.map(function (y) {
      return '<li data-act="pledge-edit" data-id="' + esc(y) + '">' +
             '<span class="ico">' + iconFor('amount') + '</span>' +
             '<span class="nm">' + esc(hebYearLabelFull(y)) + '</span>' +
             '<span class="amt">' + money(pledgeOfYear(y)) + '</span></li>';
    }).join('') + '</ul></div>';
}

function settingsScreenHTML() {
  return tabHeadHTML(MSG_SETTINGS_TITLE) +
    pledgeCardHTML() +
    ordersCardHTML() +
    // אין לאחד את שני אוצרות המילים לרשימה אחת — רשימה מעורבת מציעה בהכנסה את מה ששייך לצדקה.
    lookupCardHTML('method', MSG_WAY_INCOME, METHOD_DEFAULT) +
    lookupCardHTML('source', MSG_WAY_TZEDAKAH, SRC_DEFAULT) +
    footHTML();
}

export { lookupById, lookupFootHTML, lookupFormHTML, orderFormHTML, orderNewVersion,
         orderRead, orderValid, settingsScreenHTML };
