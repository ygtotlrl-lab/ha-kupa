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

// המובילים — סכום לכל פירוט, מהגדול; עד חמישה
function topOf(rows, type) {
  var sum = {};
  kLive(rows).forEach(function (r) {
    if (r.type !== type) return;
    var k = String(r.description || '').trim() || '—';
    sum[k] = (sum[k] || 0) + (+r.amount || 0);
  });
  return Object.keys(sum).map(function (k) { return { k: k, v: sum[k] }; })
    .filter(function (x) { return x.v > 0; })
    .sort(function (a, b) { return b.v - a.v; }).slice(0, 5);
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

function statsScreenHTML() {
  var h = tabHeadHTML(MSG_STATS_TITLE), y = statYear(), ys = statYears();
  if (!y) return h + '<div class="card"><div class="empty">' + esc(MSG_STATS_EMPTY) + '</div></div>' + footHTML();
  var ms = statMonths().filter(function (m) { return m.year === y; });
  var all = [], per = ms.map(function (m) {
    var rows = monthRows(m.key);
    all = all.concat(rows);
    return { m: m, inc: kIncome(rows), tz: kTzedakah(rows) };
  });
  var inc = kIncome(all), tz = kTzedakah(all);
  var self = kLive(all).filter(function (r) { return r.type === 'tzedakah' && r.category === K_CAT_SELF; })
    .reduce(function (s, r) { return s + (+r.amount || 0); }, 0);
  var selfPct = tz ? Math.round(self / tz * 100) : 0;
  var tzPct = inc > 0 ? Math.round(tz / inc * 100) : 0;
  var i = ys.indexOf(y);

  // מעבר בין השנים — כמו החיצים של החודש
  h += '<div class="st-year">' +
    '<button class="mnav" data-act="stat-year" data-id="' + esc(ys[i - 1] || '') + '"' + (i > 0 ? '' : ' disabled') + ' aria-label="השנה הקודמת">' + icon('prev') + '</button>' +
    '<span>' + esc(hebYearLabelFull(y)) + '</span>' +
    '<button class="mnav" data-act="stat-year" data-id="' + esc(ys[i + 1] || '') + '"' + (i < ys.length - 1 ? '' : ' disabled') + ' aria-label="השנה הבאה">' + icon('next') + '</button></div>';

  // השנה במספרים — ארבע קוביות
  h += '<div class="st-kpis">' +
    '<div class="st-k"><small>הכנסות</small><b class="peach">' + money(inc) + '</b></div>' +
    '<div class="st-k"><small>צדקה</small><b>' + money(tz) + '</b></div>' +
    '<div class="st-k"><small>צדקה מההכנסה</small><b>' + tzPct + '%</b></div>' +
    '<div class="st-k"><small>אישי · אחרים</small><b>' + selfPct + '% · ' + (tz ? 100 - selfPct : 0) + '%</b></div>' +
    '</div>';

  // חודש אחר חודש — שני פסים לכל חודש, באותו סולם: הכנסות (אפרסק) וצדקה (סגול)
  var max = Math.max.apply(null, per.map(function (p) { return Math.max(p.inc, p.tz); }).concat([1]));
  h += '<div class="card st-card"><h2>חודש אחר חודש</h2>' +
    '<div class="st-legend"><span class="peach">הכנסות</span><span>צדקה</span></div>' +
    per.slice().reverse().map(function (p) {
      return '<div class="st-mon"><span class="nm">' + esc(p.m.name) + '</span>' +
        '<span class="bars">' + bar((Math.max(p.inc, 0) / max * 100).toFixed(1), 'peach') + bar((p.tz / max * 100).toFixed(1)) + '</span>' +
        '<span class="vals"><span class="peach">' + money(p.inc) + '</span><span>' + money(p.tz) + '</span></span></div>';
    }).join('') + '</div>';

  h += topHTML('מקורות ההכנסה הגדולים', topOf(all, 'income'), 'peach');
  h += topHTML('הצדקה הגדולה', topOf(all, 'tzedakah'), '');
  return h + footHTML();
}

export { statsScreenHTML };
