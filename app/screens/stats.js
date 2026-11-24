// app/screens/stats.js — מסך הסטטיסטיקות: השנה העברית במספרים, חודש אחר חודש, והמובילים
// הכל נגזר מהמראה בכל ציור, ואף סיכום אינו נשמר — כמו בחודש עצמו.
import { esc } from '../../core/ui.js';
import { bar } from '../../core/chart.js';
import { hebYearLabelFull } from '../../core/hebrew.js';
import { ARCH_FIRST, K_CAT_SELF, MSG_STATS_EMPTY, MSG_STATS_TITLE } from '../constants.js';
import { view } from '../state.js';
import { icon } from '../icons.js';
import { footHTML, kIncome, kLive, kTzedakah, money, monthRows, monthsSorted, nowMonthKey,
         tabHeadHTML } from '../domain.js';

// החודשים שיש בהם נתונים, עד החודש הנוכחי — כמו בארכיון
function statMonths() {
  var now = nowMonthKey();
  return monthsSorted(false).filter(function (m) { return m.key >= ARCH_FIRST && (!now || m.key <= now); });
}
function statYears() {
  var seen = {}, out = [];
  statMonths().forEach(function (m) { if (!seen[m.year]) { seen[m.year] = true; out.push(m.year); } });
  return out.sort();
}
// השנה המוצגת — הנבחרת, ובלעדיה האחרונה שיש בה נתונים
function statYear() {
  var ys = statYears();
  return ys.indexOf(view.statYear) >= 0 ? view.statYear : ys[ys.length - 1];
}

// המובילים — סכום לכל פירוט, מהגדול; עד n, ומי שבשוויון עם האחרון — נכנס גם הוא.
// הוראות הקבע בפנים: כל חודש שנפתח מוסיף את המופע שלו לסכום של ההוראה.
function topOf(rows, type, n) {
  var sum = {};
  kLive(rows).forEach(function (r) {
    if (r.type !== type) return;
    var k = String(r.description || '').trim() || '—';
    sum[k] = (sum[k] || 0) + (+r.amount || 0);
  });
  return Object.keys(sum).map(function (k) { return { k: k, v: sum[k] }; })
    .filter(function (x) { return x.v > 0; })
    .sort(function (a, b) { return b.v - a.v; })
    .filter(function (x, i, l) { return i < n || (l[n - 1] && x.v === l[n - 1].v); });
}
function topHTML(title, list, tone) {
  if (!list.length) return '';
  var max = list[0].v;
  return '<div class="card st-card"><h2>' + esc(title) + '</h2><ul class="st-top">' +
    list.map(function (x) {
      return '<li><span class="nm">' + esc(x.k) + '</span><span class="amt">' + money(x.v) + '</span>' +
        bar((x.v / max * 100).toFixed(1), tone) + '</li>';
    }).join('') + '</ul></div>';
}

// השוואה לאשתקד — אותו מספר חודשים מתחילת השנה, כך שהשנה שבאמצע נמדדת מול אותו קטע באשתקד
function yearSums(y, n) {
  var all = [];
  statMonths().filter(function (m) { return m.year === y; }).slice(0, n).forEach(function (m) { all = all.concat(monthRows(m.key)); });
  return { rows: all, inc: kIncome(all), tz: kTzedakah(all) };
}
function selfOf(rows) {
  return kLive(rows).filter(function (r) { return r.type === 'tzedakah' && r.category === K_CAT_SELF; })
    .reduce(function (s, r) { return s + (+r.amount || 0); }, 0);
}
function standingOf(rows) {
  return kLive(rows).filter(function (r) { return r.type === 'tzedakah' && r.source === 'standing'; })
    .reduce(function (s, r) { return s + (+r.amount || 0); }, 0);
}
// חץ מול אשתקד — בסכום: אחוז השינוי; באחוז: נקודות האחוז. בלי אשתקד — כלום
function deltaHTML(now, prev, pts) {
  if (prev == null) return '';
  var d = pts ? now - prev : (prev ? Math.round((now - prev) / Math.abs(prev) * 100) : null);
  if (d == null || !isFinite(d)) return '';
  var dir = d > 0 ? 'up' : d < 0 ? 'down' : 'eq';
  return '<span class="st-d ' + dir + '">' + (dir === 'eq' ? '' : icon(dir === 'up' ? 'up' : 'down')) +
    Math.abs(d) + (pts ? ' נק׳' : '%') + ' <i>מול אשתקד</i></span>';
}
function kpiHTML(label, val, cls, delta) {
  return '<div class="st-k ' + cls + '"><small>' + esc(label) + '</small><b>' + val + '</b>' + (delta || '') + '</div>';
}
// טבעת אחוז — מתמלאת מימין לשמאל, והאחוז במרכזה; מתחתיה התווית, ושורה משנית כשיש
function ringHTML(label, pct, delta, sub) {
  var r = 30, c = 2 * Math.PI * r, v = Math.max(0, Math.min(100, pct || 0));
  return '<div class="st-ring"><svg viewBox="0 0 74 74" aria-hidden="true">' +
      '<circle class="trk" cx="37" cy="37" r="' + r + '"/>' +
      '<circle class="val" cx="37" cy="37" r="' + r + '" stroke-dasharray="' + c.toFixed(2) + '" stroke-dashoffset="' + (c * (1 - v / 100)).toFixed(2) + '" transform="scale(-1 1) translate(-74 0) rotate(-90 37 37)"/>' +
      '<text x="37" y="42">' + Math.round(pct || 0) + '%</text></svg>' +
    '<small>' + esc(label) + '</small>' + (sub ? '<i class="st-sub">' + esc(sub) + '</i>' : '') + (delta || '') + '</div>';
}

function statsScreenHTML() {
  var h = tabHeadHTML(MSG_STATS_TITLE), y = statYear(), ys = statYears();
  if (!y) return h + '<div class="card"><div class="empty">' + esc(MSG_STATS_EMPTY) + '</div></div>' + footHTML();
  var ms = statMonths().filter(function (m) { return m.year === y; });
  var cur = yearSums(y, ms.length), all = cur.rows;
  var inc = cur.inc, tz = cur.tz;
  var pct = function (a, b) { return b > 0 ? Math.round(a / b * 100) : 0; };
  var selfPct = pct(selfOf(all), tz), tzPct = pct(tz, inc), soPct = pct(standingOf(all), tz);
  // אשתקד — רק כשיש בה נתונים
  var py = ys.indexOf(y - 1) >= 0 ? yearSums(y - 1, ms.length) : null;
  var P = py ? { inc: py.inc, tz: py.tz, tzPct: pct(py.tz, py.inc), self: pct(selfOf(py.rows), py.tz), so: pct(standingOf(py.rows), py.tz) } : {};
  var i = ys.indexOf(y);

  // מעבר בין השנים — כמו החיצים של החודש
  h += '<div class="st-year">' +
    '<button class="mnav" data-act="stat-year" data-id="' + esc(ys[i - 1] || '') + '"' + (i > 0 ? '' : ' disabled') + ' aria-label="השנה הקודמת">' + icon('prev') + '</button>' +
    '<span>' + esc(hebYearLabelFull(y)) + '</span>' +
    '<button class="mnav" data-act="stat-year" data-id="' + esc(ys[i + 1] || '') + '"' + (i < ys.length - 1 ? '' : ' disabled') + ' aria-label="השנה הבאה">' + icon('next') + '</button></div>';

  // השנה במספרים — וכל קובייה מול אותו קטע באשתקד
  // שני אריחים מלאים — הכנסות וצדקה — ומתחתם שלוש טבעות לאחוזים
  h += '<div class="st-kpis">' +
    kpiHTML('הכנסות', money(inc), 'peach', deltaHTML(inc, py ? P.inc : null)) +
    kpiHTML('צדקה', money(tz), 'purple', deltaHTML(tz, py ? P.tz : null)) +
    '<div class="st-rings">' +
      ringHTML('צדקה מההכנסה', tzPct, deltaHTML(tzPct, py ? P.tzPct : null, true)) +
      ringHTML('אישי', selfPct, deltaHTML(selfPct, py ? P.self : null, true), 'אחרים ' + (tz ? 100 - selfPct : 0) + '%') +
      ringHTML('הוראות קבע מהצדקה', soPct, deltaHTML(soPct, py ? P.so : null, true)) +
    '</div></div>';

  // החודש עם הכי הרבה צדקה
  var best = null;
  ms.forEach(function (m) { var t = kTzedakah(monthRows(m.key)); if (t > 0 && (!best || t > best.tz)) best = { m: m, tz: t }; });
  if (best) h += '<div class="card st-best">' + icon('star') + '<span><small>החודש עם הכי הרבה צדקה</small><b>' + esc(best.m.name) + '</b></span><span class="amt">' + money(best.tz) + '</span></div>';

  h += topHTML('מקורות ההכנסה הגדולים', topOf(all, 'income', 5), 'peach');
  h += topHTML('הצדקה הגדולה', topOf(all, 'tzedakah', 10), '');
  return h + footHTML();
}

export { statsScreenHTML };
