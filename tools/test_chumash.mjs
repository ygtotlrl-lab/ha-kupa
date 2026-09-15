#!/usr/bin/env node
/*  test_chumash.mjs — היתרה מצטברת חוצה שנים.
 *
 *  **מה נאכף:** ⛔ יתרת החומש אינה מתאפסת במעבר השנה — ⚠️ יתרת אלול היא
 *  בדיוק יתרת הפתיחה של תשרי שאחריו: ⭐ והמדידה היא ערך מול ערך על שרשרת
 *  של שתי שנים רצופות. ⛔ **וחוב עובר כמו עודף** — ⚠️ יתרה שלילית בסוף
 *  שנה נשארת שלילית בראשית הבאה · ⛔ **ויתרת פתיחה מוצהרת לשנה הראשונה
 *  בלבד** — ⚠️ אתר קריאה יחיד, ⭐ ועל השנה הראשונה במיון בלבד.
 *
 *  **הנימוק המדוד:** ⛔ חומש שלא ניתן בתשרי הוא חוב בתשרי הבא — ⚠️ והוא
 *  המספר היחיד באפליקציה שחוצה שנה: ⭐ איפוס בראש השנה היה מוחק אותו בלי
 *  שאיש החליט, ⛔ ואיש לא היה רואה — ⚠️ המסך היה מציג «0», ⭐ והוא נראה
 *  כמו שנה שנפתחה נקייה.
 *
 *  **מה יישבר בלעדיו:** ⛔ תוספת של איפוס שנתי — או של יתרת פתיחה שנייה
 *  לשנה שאינה הראשונה — תעבור בשקט: ⚠️ כל חודש בשנה החדשה ימשיך להסכים
 *  עם עצמו, ⭐ והפער ייראה רק במי שיחשב ידנית מהשנה שקדמה.
 *
 *  **מה אינו נאכף כאן:** ⛔ **שיעור החומש עצמו** — ⚠️ הוא נמדד בשער
 *  הדוגמאות; ⛔ **והעודף החודשי** — ⚠️ הוא נמדד בשער הפלעזדש, ⭐ וכאן
 *  נמדדת היתרה בלבד.
 *
 *  ⛔ שער פרטי לאפליקציה אחת — ⚠️ שרשרת חודשים שיתרתה מצטברת לאורך שנים
 *  קיימת כאן בלבד: ⭐ בשלוש האחיות כל סכום נגזר מטווח תאריכים סגור,
 *  ⛔ ואין בהן מספר שעובר מסוף שנה לתחילת הבאה.
 *  ⛔ המוטציות אינן נכתבות לעץ — ⚠️ הליבה המוטנטית נטענת מכתובת `data:`,
 *  ⭐ והיא טקסט בזיכרון: ⛔ בלי לכתוב ובלי תהליך.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { whiten } from './whiten.mjs';
import { kpChain } from './kp_calc.mjs';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  app: 'ha-kupa',
  core: 'kp_calc.mjs',
  /*  ⛔ שתי השנים שהשרשרת נמדדת עליהן — ⚠️ **מה נכנס**: שנה ⟵ המינימום
   *  החודשי שלה; ⛔ **ומה מפיל**: שנה שאין לה מינימום — ⭐ `pleziashOf`
   *  היה מחזיר `undefined`, ⚠️ והחסר היה `NaN` בלי שאיש יראה. */
  years: { 5786: 2400, 5787: 3000 },
  openingCol: 'chumash_opening_balance',
  openingFn: 'openingBalance',
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ הקובץ הזה אינו אוכף שורה בטבלת התשתית — ⚠️ הצהרה ריקה ולא היעדר:
 *  ⛔ שער בלי הצהרה אינו נבדל משער שההצהרה שלו נשמטה. */
export const ROWS = [];

/*  ⛔ המוטציות אינן ברירת המחדל — ⚠️ כל מוטציה היא שינוי ⟵ הרצה ⟵ שחזור:
 *  ⛔ הן רצות ברמה המלאה (`--full`), בסוף הסבב ולפני מיזוג. */
const RUN_MUT = process.env.GATE_MUT === '1';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

let failures = 0;
/*  ⛔ שער מריץ את כל טענותיו — ⚠️ תהליך שנסגר באמצע מדפיס «עבר» על טענות
 *  שלא רצו: ⭐ `EXPECTED` הוא רצפה שנמדדה ברמה שבה השער רץ, ⛔ ופחות ממנה
 *  הוא כשל — ⚠️ והמאזין על `exit` תופס גם יציאה שקדמה להמתנה. */
const GATE_ID = new URL(import.meta.url).pathname.split('/').pop();
/*  ⛔ ריצפת הטענות — ⚠️ **מה נכנס**: המשותפת, שהיא מספר זהה בכל הריפו,
 *  ⛔ והפרטית עם היכולת שמוסיפה אותה; ⛔ **ומה מפיל**: משותפת שנבדלת בין
 *  הריפו, פרטית בלי נימוק, וסכום אפס. */
const FLOOR = { shared: 0, app: 8, appWhy: 'יתרת החומש המצטברת חוצת-השנים — ⛔ והיא קיימת כאן בלבד: ⚠️ אין בשאר מספר שעובר מסוף שנה לתחילת הבאה' };
const EXPECTED = FLOOR.shared + FLOOR.app;
let RAN = 0;
/*  ⛔ המונה נלכד בכניסה לשלב המוטציות — ⚠️ `null` הוא תהליך שלא הגיע
 *  לשם, ⛔ ואפס הוא שער שכל גופו מוטציות. */
let PRE_MUT = null;
const mutStage = () => { if (PRE_MUT === null) PRE_MUT = RAN; };
/*  ⛔ הדגל נלכד ברישום ⛔ ולא בסגירה — ⚠️ שער שמריץ שער אחר מציב אותו
 *  **אחרי** הרישום. */
const SUBRUN = !!process.env.GATE_SUBRUN;
/*  ⛔ הריצפה נמדדת בשני הכיוונים — ⚠️ פחות מהמוצהר הוא ריצה חלקית,
 *  ⛔ ויותר ממנו הוא ריצפה מיושנת. */
const FLOOR_MAX = (() => {
  const r = /^(\d+)-(\d+)$/.exec(process.env.GATE_FLOOR_RANGE || '');
  return r ? Number(r[2]) : EXPECTED;
})();
process.on('exit', () => {
  if (!process.argv[1] || !process.argv[1].endsWith(GATE_ID)) return;
  if (SUBRUN) return;
  const N = PRE_MUT || RAN;
  console.log(`רצו ${N} מתוך ${EXPECTED}`);
  if (N < EXPECTED) {
    console.error(`❌ ${GATE_ID}: רצו ${N} טענות מתוך ${EXPECTED} מוצהרות — ` +
      'מה עושים: ודא `await` בקריאה הראשית, ⛔ ויציאה שאינה קודמת להמתנה.');
    process.exitCode = 1;
  } else if (N > FLOOR_MAX) {
    console.error(`❌ ${GATE_ID}: רצו ${N}, והריצפה ${EXPECTED} — עדכן את \`FLOOR\`.`);
    process.exitCode = 1;
  }
});
const fail = (m) => { RAN++; failures++; console.error('❌ ' + m); };
const pass = (m) => (RAN++, console.log('✅ ' + m));

/*  ⛔ גוף הפונקציה נחתך בהתאמת סוגריים ⛔ ולא בחלון תווים — ⚠️ גוף ארוך
 *  מהחלון היה נמתח אל הפונקציה הבאה, ⭐ והמדידה הייתה נופלת על קוד שאינו
 *  שלה. */
function fnBody(src, name) {
  const i = src.indexOf('function ' + name + '(');
  if (i < 0) return '';
  let j = src.indexOf('{', i);
  if (j < 0) return '';
  let d = 0;
  for (let k = j; k < src.length; k++) {
    if (src[k] === '{') d++;
    else if (src[k] === '}') { d--; if (!d) return src.slice(j + 1, k); }
  }
  return '';
}

/*  ⛔ שרשרת שתי השנים — ⚠️ **מה נכנס**: חודש ⟵ שנתו ⟵ רישומיו;
 *  ⛔ **ומה מפיל**: שרשרת שאינה חוצה שנה — ⭐ שנה אחת אינה מודדת דבר
 *  כאן. ⚠️ **ולמה המבנה קיים**: אותה שרשרת בדיוק מוזנת לליבה החיה
 *  ולמוטנטית, ⛔ ושתי הזנות לאותה דוגמה הן שתי הזדמנויות להיבדל. */
const tz = (amount) => ({ type: 'tzedakah', amount });
const inc = (amount) => ({ type: 'income', amount });
const MONTHS = [
  { key: 'אב-5786',    year: 5786, rows: [inc(10000), tz(1200)] },
  { key: 'אלול-5786',  year: 5786, rows: [inc(8000), tz(900)] },
  { key: 'תשרי-5787',  year: 5787, rows: [inc(12000), tz(3500)] },
  { key: 'חשון-5787',  year: 5787, rows: [inc(9000), tz(400)] },
];
const OPENING = 500;
const OPTS = { opening: OPENING, pleziashOf: (y) => APP.years[y] };
const sum = (a) => a.reduce((s, x) => s + x, 0);

/*  ⛔ **מה נכנס**: שם הטענה ⟵ הערך שנמדד ⟵ הערך הצפוי; ⛔ **ומה מפיל**:
 *  מדידה שאינה הערך הצפוי. ⭐ **ולמה המבנה קיים**: המוטציה רצה על אותו
 *  מרשם בדיוק, ⚠️ ובלעדיו היא הייתה מודדת דבר אחר מזה שהשער מודד — ⛔ ולכן מרשם אחד לשתי הדרכים. */
function checks(ctx) {
  const c = ctx.chain(MONTHS, OPTS);
  const eluls = c[1], tishrei = c[2];
  const totalTz = sum(MONTHS.map((m) => sum(m.rows.filter((r) => r.type === 'tzedakah').map((r) => r.amount))));
  const totalCh = sum(MONTHS.map((m) => sum(m.rows.filter((r) => r.type === 'income').map((r) => r.amount)))) * 0.2;
  /*  ⛔ שרשרת שנייה, בגירעון — ⚠️ צדקה אפס לאורך שתי שנים: ⭐ היתרה
   *  שלילית, ⛔ והמדידה היא שהיא חוצה את השנה כפי שהיא. */
  const dry = ctx.chain(MONTHS.map((m) => ({ ...m, rows: m.rows.filter((r) => r.type === 'income') })), OPTS);
  const w = ctx.w;
  const body = fnBody(w, APP.openingFn);
  return [
    ['א · אורך השרשרת', c.length, MONTHS.length],
    ['ב · יתרת אלול היא יתרת הפתיחה של תשרי', Math.round(tishrei.prevBalance * 100), Math.round(eluls.balance * 100)],
    ['ג · היתרה מצטברת לאורך השרשרת', Math.round(c[3].balance * 100), Math.round((OPENING + totalTz - totalCh) * 100)],
    ['ד · חוב חוצה את השנה', Math.round(dry[2].prevBalance * 100), Math.round(dry[1].balance * 100)],
    ['ה · ובשנה החדשה הוא עדיין שלילי', dry[2].balance < 0 ? 1 : 0, 1, String(Math.round(dry[2].balance))],
    ['ו · אתרי קריאה ליתרת הפתיחה', (w.match(new RegExp('\\b' + APP.openingCol + '\\b', 'g')) || []).length, 1],
    ['ז · יתרת הפתיחה נקראת מהשנה הראשונה במיון', (body.match(/l\[0\]/g) || []).length, 1],
    ['ח · יתרת הפתיחה נמסרת לשרשרת פעם אחת', (w.match(/opening:/g) || []).length, 1],
  ];
}

const CTX = (chain) => ({ chain, w: whiten(rd('index.html'), { markup: 'blank' }) });
const run = (ctx) => checks(ctx).filter(([, got, want]) => got !== want);

console.log(`· ${APP.app} — היתרה מצטברת חוצה שנים`);
const C0 = CTX(kpChain);
for (const [name, got, want, extra] of checks(C0)) {
  if (got === want) pass(`${name} — נמדד ${got}${extra ? ` (${extra})` : ''}`);
  else fail(`${name} — נמדד ${got} והצפוי ${want}${extra ? ` (${extra})` : ''}. ` +
            'מיישרים את הצבירה בליבת החישוב, ⛔ ואין מאפסים יתרה במעבר שנה');
}

/* ── מוטציות ───────────────────────────────────────────────────────────── */
mutStage();
if (RUN_MUT) {
  /*  ⛔ הליבה המוטנטית נטענת מכתובת `data:` — ⚠️ היא טקסט בזיכרון,
   *  ⭐ ואין קובץ שנכתב: ⛔ המוטציה אינה נוגעת בעץ בשום שלב. */
  const src = rd('tools/' + APP.core);
  const load = async (text) => (await import('data:text/javascript,' + encodeURIComponent(text))).kpChain;

  /*  ⛔ המוטציה שוברת את המנגנון ⛔ ולא את הצורה — ⚠️ איפוס היתרה במעבר
   *  השנה הוא בדיוק מה שהשער בא למנוע. */
  const reset = src.replace('    const prevBalance = balance;',
    '    const prevBalance = (out.length && out[out.length - 1].year !== m.year) ? 0 : balance;');
  if (reset === src) {
    fail('מוטציה · האיפוס לא נשתל — נמדדו 0 החלפות והצפוי אחת. ' +
         'מיישרים את תבנית ההחלפה לשורת היתרה הקודמת שבליבה');
  } else {
    const fellOn = run(CTX(await load(reset)));
    const named = fellOn.find(([n]) => n.startsWith('ב ·'));
    if (named)
      pass(`מ1 · מוטציה: איפוס יתרה במעבר שנה מפיל את הטענה «${named[0]}» — ` +
           `${fellOn.length} טענות מתוך ${checks(C0).length} התהפכו`);
    else
      fail('מ1 · מוטציה: איפוס יתרה ⛔ לא הפיל את טענה ב — נמדדו ' +
           `${fellOn.length} טענות שהתהפכו והצפוי את הטענה הנקובה. מחזירים את ההשוואה בין אלול לתשרי`);
  }

  /*  ⛔ מוטציית-נגד היא שינוי חי שאסור לו להפיל — ⚠️ שם מקומי שהוחלף
   *  בעקביות, ⭐ ולא הוספת הערה. */
  const renamed = src.replace(/\bconst pleziashOf = opts\.pleziashOf;/, 'const _kpMinOf = opts.pleziashOf;')
                     .replace(/\bpleziashOf\(m\.year\)/, '_kpMinOf(m.year)');
  if (renamed === src || /pleziashOf\(m\.year\)/.test(renamed)) {
    fail('מוטציית-נגד · השם לא הוחלף בעקביות — נמדדו 0 החלפות מלאות והצפוי אחת. ' +
         'מיישרים את תבנית ההחלפה לשם שבליבה');
  } else {
    const badOnes = run(CTX(await load(renamed)));
    if (!badOnes.length)
      pass('נ1 · ⭐ מוטציית-נגד: שם מקומי שהוחלף בעקביות ⛔ אינו מפיל אף טענה');
    else
      fail(`נ1 · מוטציית-נגד הפילה את הטענה «${badOnes[0][0]}» — נמדדו ${badOnes.length} ` +
           'טענות שהתהפכו והצפוי אפס. מיישרים את ההחלפה כך שתהיה עקבית');
  }
}

if (failures) { console.error(`\n❌ ${APP.app}: ${failures} טענות נכשלו`); process.exitCode = 1; }
else console.log(`\n✓ ${APP.app}: היתרה מצטברת חוצה שנים`);
