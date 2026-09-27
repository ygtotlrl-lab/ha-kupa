// app/screens/archive.js — מסך הארכיון
import { esc } from '../../core/ui.js';
import { barChart } from '../../core/chart.js';
import { view } from '../state.js';
import { MSG_ARCH_EMPTY } from '../config.js';
import { chainOf, compPct, footHTML, monthsSorted, nowMonthKey } from '../domain.js';
import { TABS, tabHeadHTML } from '../main.js';

// חודש שטרם הגיע מציג פסים ריקים, ונקרא כחודש שלא עמדנו בו.
// תשרי תשפ״ז הוא החודש שממנו האפליקציה מנהלת, ואין רשומות שקודמות לו.
var ARCH_FIRST = '5787-01';

function archMonths() {
  var now = nowMonthKey();
  return monthsSorted(false).filter(function (m) {
    return m.key >= ARCH_FIRST && (!now || m.key <= now);
  });
}

function monthBarsHTML(c, name) {
  var ch = compPct(c.tzedakah, c.chumashDue), pl = compPct(c.tzedakah, c.pledgeDue);
  return barChart([
    { lab: 'חומש',   val: ch, tgt: 100, end: '', txt: name + ' · חומש ' + Math.round(ch) + '%' },
    { lab: 'פלעדזש', val: pl, tgt: 100, end: '', txt: name + ' · פלעדזש ' + Math.round(pl) + '%' }
  ], name, true);
}

function archiveScreenHTML() {
  var ms = archMonths(), h = tabHeadHTML(TABS[1].lab);
  if (!ms.length) return h + '<div class="card"><div class="empty">' + esc(MSG_ARCH_EMPTY) +
                             '</div></div>' + footHTML();
  var years = [], seen = {}, i;
  for (i = 0; i < ms.length; i++) if (!seen[ms[i].year]) { seen[ms[i].year] = true; years.push(ms[i].year); }
  years.reverse();
  for (i = 0; i < years.length; i++) {
    var y = years[i], open = view.archYear === y;
    h += '<div class="card"><h2 class="fold" data-act="arch-year" data-id="' + esc(y) + '">' +
         esc(window.hebYearLabelFull(y)) + '<span class="st">' + esc(open ? '⌃' : '⌄') +
         '</span></h2>';
    if (open) {
      var mine = ms.filter(function (m) { return m.year === y; }).reverse();
      h += mine.map(function (m) {
        var c = chainOf(m.key, false) || {};
        return '<div class="amon"><button class="amn" data-act="arch-month" data-id="' +
               esc(m.key) + '">' + esc(m.name) + '</button>' +
               monthBarsHTML(c, m.name) + '</div>';
      }).join('');
    }
    h += '</div>';
  }
  return h + footHTML();
}

export { ARCH_FIRST, archiveScreenHTML };
