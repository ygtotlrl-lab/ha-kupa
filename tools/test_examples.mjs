/*  שלוש הדוגמאות — ⛔ טענות מחייבות: ⚠️ אם אחת נכשלת, המימוש שגוי. */
import { kpChain } from './kp_calc.mjs';

const tz = (amount, category) => ({ type: 'tzedakah', amount, category: category || 'לאחרים' });
const inc = (amount) => ({ type: 'income', amount });
let fails = 0;
const eq = (name, got, want) => {
  const ok = Math.abs(got - want) < 0.005;
  console.log(`${ok ? '✓' : '✗'} ${name}: נמדד ${Math.round(got * 100) / 100}, הצפוי ${want}`);
  if (!ok) fails++;
};

/* ── א · תשרי תשפ״ז ────────────────────────────────────────────────────── */
const PL = { 5786: 2770, 5787: 4200 };
const tishrei = kpChain([{ key: 'תשרי', year: 5787, rows: [
  inc(15400), tz(3750), tz(1450, 'אישי'),
] }], { opening: 700, pleziashOf: (y) => PL[y] })[0];
eq('תשרי · חומש', tishrei.chumash, 3080);
eq('תשרי · יתרה', tishrei.balance, 2820);
eq('תשרי · מילוי', tishrei.fill, 5200);
eq('תשרי · חסר', tishrei.short, 0);
eq('תשרי · עודף לחשון', tishrei.carryOut, 1000);
eq('תשרי · אישי %', Math.round(tishrei.selfPct), 28);

/* ── ב · חשון — א׳ דחודש, הוראות קבע בלבד ──────────────────────────────── */
const SO = [300, 150, 150, 150, 55, 28];               /* 833 */
const chain = kpChain([
  { key: 'תשרי', year: 5787, rows: [inc(15400), tz(3750), tz(1450, 'אישי')] },
  { key: 'חשון', year: 5787, rows: SO.map((a) => tz(a)) },
], { opening: 700, pleziashOf: (y) => PL[y] });
const cheshvan = chain[1];
eq('חשון · סך הו״ק', SO.reduce((a, b) => a + b, 0), 833);
eq('חשון · חומש', cheshvan.chumash, 0);
eq('חשון · יתרה', cheshvan.balance, 3653);
eq('חשון · יתרה קודמת (מוצגת)', cheshvan.prevBalance, 2820);
eq('חשון · מילוי', cheshvan.fill, 1833);
eq('חשון · חסר', cheshvan.short, 2367);
eq('חשון · מחודש קודם', cheshvan.carryIn, 1000);

/* ── ג · אב תשפ״ו ──────────────────────────────────────────────────────── */
const av = kpChain([{ key: 'מנחם אב', year: 5786, rows: [inc(16900), tz(1179)] }],
  { opening: 1695, pleziashOf: (y) => PL[y] })[0];
eq('אב · יתרה', av.balance, -506);
eq('אב · חסר', av.short, 1591);

console.log(fails ? `\n⛔ ${fails} טענות נפלו` : '\n✅ שלוש הדוגמאות עוברות');
process.exit(fails ? 1 : 0);
