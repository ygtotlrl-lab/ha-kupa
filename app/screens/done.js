// app/screens/done.js — מסך הסיום
import { esc } from '../../core/ui.js';
import { MSG_LEFT_SUM, MSG_OPENER, MSG_SUM_INCOME, MSG_TZ_BLESS } from '../config.js';
import { chainOf, footHTML, money, signed, view } from '../domain.js';

// הכיתוב בתחתית והקונפטי מעליו — פתית שנופל על אות מסתיר אותה ברגע שבו היא נקראת.
function doneScreenHTML() {
  var c = chainOf(view.monthKey, true) || {};
  var isInc = view.doneInc;
  return '<div class="donewrap"><div class="done">' +
    '<div class="line1">' + esc(isInc ? MSG_OPENER : MSG_TZ_BLESS) + '</div>' +
    '<div class="line2">' + esc('נרשם · ' + (isInc ? MSG_SUM_INCOME + ' ' : MSG_LEFT_SUM)) +
    (isInc ? esc(money(c.income || 0)) : signed(c.pledgeLeft || 0)) + '</div>' +
    '<button class="btn done-back" data-act="done-close">חזרה</button></div></div>' +
    footHTML('');
}

export { doneScreenHTML };
