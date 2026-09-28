// app/screens/slide.js — מסך אישור המטבע
import { newClientId } from '../../core/sync.js';
import { esc, uiNoDialog } from '../../core/ui.js';
import { MSG_SLIDE_KUPA, MSG_SLIDE_SUB, MSG_SLIDE_WALLET } from '../constants.js';
import { shell, view } from '../state.js';
import { assetIcon, localPut, money, monthKeyOf, pushSoon } from '../domain.js';

// שחרור מעל היעד מאשר ושחרור בצד מחזיר את המטבע — האישור הוא התנועה עצמה, ואין כפתור אישור שני.
var COIN = { el: null, tgt: null, dx: 0, dy: 0, over: false, on: false, pid: null };

function slideScreenHTML() {
  var isInc = view.flow === 'income';
  return '<div class="slide" id="slide">' +
    '<button class="back bk" data-act="flow-back" aria-label="חזרה">›</button>' +
    '<div class="ttl">' + esc(isInc ? MSG_SLIDE_WALLET : MSG_SLIDE_KUPA) + '</div>' +
    '<div class="sub">' + esc(MSG_SLIDE_SUB) + '</div>' +
    '<div class="target ' + (isInc ? 'wide' : 'narrow') + '" id="slide-target">' +
    assetIcon(isInc ? 'asset-wallet' : 'asset-kupa') + '</div>' +
    '<div class="coin" id="coin"><span class="ring"></span>' +
    money(Math.abs(view.draft.amount)) + '</div></div>';
}

// המטבע מתחיל מעל היעד — הוא נופל לתוכו, וגרירה כלפי מעלה אינה תנועה שמישהו מצפה לה.
function coinHome() {
  var b = COIN.tgt.getBoundingClientRect();
  return { x: window.innerWidth / 2 - 75, y: Math.max(0, b.top - 190) };
}

// המיקום נכתב למשתני CSS — הכלל של .coin קורא אותם.
function coinAt(p) {
  COIN.el.style.setProperty('--x', p.x + 'px');
  COIN.el.style.setProperty('--y', p.y + 'px');
}

function coinWire() {
  var c = document.getElementById('coin'), t = document.getElementById('slide-target');
  if (!c || !t) { uiNoDialog('coinWire', 'coin'); return; }
  COIN.el = c; COIN.tgt = t; COIN.on = false;
  coinAt(coinHome());
}

// הערך המוחזר עוצר את גרירת הרשימה — אירוע של המטבע אינו ממשיך אליה.
function coinDown(e) {
  var c = COIN.el;
  if (!c || !e.target.closest || e.target.closest('#coin') !== c) return false;
  var r = c.getBoundingClientRect();
  COIN.on = true; COIN.pid = e.pointerId;
  c.classList.remove('settle');
  COIN.dx = e.clientX - r.left; COIN.dy = e.clientY - r.top;
  c.setPointerCapture(e.pointerId);
  return true;
}

function coinMove(e) {
  if (!COIN.on || e.pointerId !== COIN.pid) return false;
  var c = COIN.el;
  coinAt({ x: e.clientX - COIN.dx, y: e.clientY - COIN.dy });
  var over = coinOverTarget();
  if (over !== COIN.over) { COIN.over = over; c.classList.toggle('over', over); }
  return true;
}

function coinOverTarget() {
  var a = COIN.el.getBoundingClientRect(), b = COIN.tgt.getBoundingClientRect();
  var cx = a.left + a.width / 2, cy = a.top + a.height / 2;
  return cx > b.left && cx < b.right && cy > b.top - 40 && cy < b.bottom;
}

// גרירה שבוטלה חוזרת למקומה — ביטול אינו שחרור מעל היעד.
function coinUp(e) {
  if (!COIN.on || e.pointerId !== COIN.pid) return false;
  COIN.on = false;
  if (e.type !== 'pointercancel' && coinOverTarget()) coinSwallow(); else coinReturn();
  return true;
}

function coinReturn() {
  var c = COIN.el, p = coinHome();
  c.classList.remove('over');
  c.classList.add('settle');
  coinAt(p);
}

// הצליל נוצר ב-AudioContext — אין קובץ שמע ואין טעינה מהרשת.
// שלושה נקישים קצרים בגבהים נבדלים — סינוס יחיד ארוך נשמע כצפצוף ולא כמתכת.
var COIN_TAPS = [[1850, 0], [2480, 0.07], [2130, 0.15]];

// אין מתג לחוויה החושית — החלטת מנהל; מתג שאיש אינו מציג הוא מפתח שהקוד מבקש ואינו במסד.
function sensoryFire() {
  try { if (navigator.vibrate) navigator.vibrate([18, 26, 14, 30, 22]); } catch (e) {}
  try {
    var A = window.AudioContext || window.webkitAudioContext;
    if (!A) return;
    var ctx = new A(), i, j;
    for (i = 0; i < COIN_TAPS.length; i++) {
      // יחס לא שלם בין שני החלקיים — יחס שלם נשמע כתו מוזיקלי ולא כנקישת מתכת.
      for (j = 0; j < 2; j++) {
        var t0 = ctx.currentTime + COIN_TAPS[i][1];
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'triangle';
        o.frequency.value = COIN_TAPS[i][0] * (j ? 2.41 : 1);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(j ? 0.06 : 0.14, t0 + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.19);
        o.connect(g); g.connect(ctx.destination);
        o.start(t0); o.stop(t0 + 0.2);
      }
    }
  } catch (e) { console.warn('[snd] הצליל לא נוצר', e); }
}

// הפטל (--rasp ו---rasp-ink) אינו ברשימה — הם שמורים לשני מקומות, וצבע שמופיע בכל מקום מפסיק להיות סימן.
var CONF_COLORS = ['--purple-3', '--peach-2', '--purple-6', '--bg', '--purple-5'];

function confetti() {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var box = document.createElement('div');
  box.className = 'conf';
  // המיקום האקראי נכתב למשתני CSS ולא לסגנון מוטבע.
  var i, e;
  for (i = 0; i < 120; i++) {
    e = document.createElement('i');
    // הפתיתים מרוכזים סביב אמצע המסך — פיזור אחיד נראה כרעש.
    e.style.setProperty('--cf-x', Math.round(50 + (Math.random() - 0.5) * 96) + '%');
    e.style.setProperty('--cf-y', Math.round(50 + (Math.random() - 0.5) * 92) + '%');
    e.style.setProperty('--cf-c', 'var(' + CONF_COLORS[i % CONF_COLORS.length] + ')');
    box.appendChild(e);
  }
  document.body.appendChild(box);
  setTimeout(function () { box.remove(); }, 1600);
}

function coinSwallow() {
  var c = COIN.el, b = COIN.tgt.getBoundingClientRect();
  c.classList.add('settle');
  coinAt({ x: b.left + b.width / 2 - 75, y: b.top });
  setTimeout(function () {
    c.classList.remove('settle', 'over');
    c.classList.add('swallow');
  }, 280);
  setTimeout(function () { sensoryFire(); confetti(); flowCommit(); }, 600);
}

function flowCommit() {
  var d = view.draft, isInc = view.flow === 'income';
  var row = {
    client_id: newClientId(),
    type: isInc ? 'income' : 'tzedakah',
    amount: d.amount,
    description: d.description,
    entry_date: d.entry_date,
    method: d.method,
    category: isInc ? '' : d.category,
    source: 'manual',
    verified: false,
    so_instance_client_id: null,
    updated_at: Date.now(),
    deleted: false
  };
  localPut('k_entries', row);
  view.monthKey = monthKeyOf(row.entry_date);
  pushSoon();
  view.screen = 'done';
  view.doneInc = isInc;
  shell.kRender();
}

export { coinDown, coinMove, coinUp, coinWire, slideScreenHTML };
