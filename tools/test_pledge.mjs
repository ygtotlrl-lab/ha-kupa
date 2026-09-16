#!/usr/bin/env node
/*  test_pledge.mjs — עודף עובר, חוב לא.
 *
 *  **מה נאכף:** ⛔ החסר החודשי הוא `max(0, פלעדזש − מילוי)` בכל חודש
 *  בשרשרת — ⚠️ ערך מול ערך, ⛔ ולא בדיקת נוכחות · ⛔ **והעודף עובר
 *  במלואו** — ⚠️ מה שנותר מעל המינימום הוא בדיוק המילוי-הנכנס של החודש
 *  הבא · ⛔⛔ **וחוב אינו עובר** — ⚠️ חודש שלא מילא את המינימום מעביר
 *  אפס, ⭐ והחודש שאחריו נמדד מול המינימום שלו בלבד.
 *
 *  **הנימוק המדוד:** ⛔ הפלעדזש הוא מינימום **חודשי** ⛔ ואינו חוב מצטבר —
 *  ⚠️ והחומש הוא המצטבר: ⭐ שני מושגים על אותו מסך, ⛔ ועודף שלילי שיעבור
 *  הלאה מערבב ביניהם — ⚠️ חודש שאחריו היה מציג חסר שאינו שלו, ⭐ והמשתמש
 *  היה משלים סכום שכבר אינו נדרש.
 *
 *  **מה יישבר בלעדיו:** ⛔ הסרת ה-`max` מהעברת העודף תעבור בשקט — ⚠️ חודש
 *  הגירעון ייראה תקין, ⭐ והמספר השגוי יופיע רק בחודש שאחריו: ⛔ ואין שער
 *  אחר שמודד את שרשרת ההעברה עצמה.
 *
 *  **מה אינו נאכף כאן:** ⛔ **היתרה המצטברת** — ⚠️ היא נמדדת בשער החומש;
 *  ⛔ **והמופע שנספר מיד** — ⚠️ הוא נמדד בשער הוראות הקבע, ⭐ וכאן נמדדת
 *  שרשרת המינימום בלבד.
 *
 *  ⛔ שער פרטי לאפליקציה אחת — ⚠️ מינימום חודשי שעודפו עובר לחודש הבא
 *  קיים כאן בלבד: ⭐ בגיוס היעד החודשי נמדד ונגמר בחודשו, ⛔ ואין בו
 *  מספר שעובר הלאה.
 *  ⛔ המוטציות אינן נכתבות לעץ — ⚠️ הליבה המוטנטית נטענת מכתובת `data:`,
 *  ⭐ והיא טקסט בזיכרון: ⛔ בלי לכתוב ובלי תהליך.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { kChain } from './k-calc.mjs';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = { app: 'ha-kupa', core: 'k-calc.mjs', pledge: 1000 };
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
const FLOOR = { shared: 0, app: 10, appWhy: 'שרשרת המינימום החודשי והעברת העודף — ⛔ והיא קיימת כאן בלבד: ⚠️ בשאר היעד נמדד ונגמר בחודשו' };
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

/*  ⛔ ארבעה חודשים: עודף ⟵ גירעון ⟵ גירעון ⟵ עודף — ⚠️ **מה נכנס**:
 *  חודש ⟵ הצדקה שנרשמה בו; ⛔ **ומה מפיל**: שרשרת שאין בה שני חודשי
 *  גירעון רצופים — ⭐ בלעדיהם «חוב אינו מצטבר» אינו נמדד כלל.
 *  ⚠️ **ולמה המבנה קיים**: אותה שרשרת בדיוק מוזנת לליבה החיה ולמוטנטית. */
const tz = (amount) => ({ type: 'tzedakah', amount });
const MONTHS = [
  /*  ⛔ החודש הריק ראשון ⛔ ולא אחרון — ⚠️ יתרת הפתיחה שלו אפס, ⭐ ולכן
   *  החסר שלו הוא המינימום המלא: ⛔ חודש ריק שאחרי עודף היה מדווח «הושלם»
   *  בצדק, ⚠️ והמדידה לא הייתה אומרת דבר. */
  { key: 'ריק', year: 5787, rows: [] },
  { key: 'א', year: 5787, rows: [tz(1500)] },
  { key: 'ב', year: 5787, rows: [tz(200)] },
  { key: 'ג', year: 5787, rows: [tz(100)] },
  { key: 'ד', year: 5787, rows: [tz(2000)] },
];
const OPTS = { opening: 0, pledgeOf: () => APP.pledge };

/*  ⛔ **מה נכנס**: שם הטענה ⟵ הערך שנמדד ⟵ הערך הצפוי; ⛔ **ומה מפיל**:
 *  מדידה שאינה הערך הצפוי. ⭐ **ולמה המבנה קיים**: המוטציה רצה על אותו
 *  מרשם בדיוק, ⚠️ ובלעדיו היא הייתה מודדת דבר אחר מזה שהשער מודד — ⛔ ולכן מרשם אחד לשתי הדרכים. */
function checks(chain) {
  const c = chain(MONTHS, OPTS);
  const P = APP.pledge;
  const badShort = c.filter((m) => Math.abs(m.short - Math.max(0, P - m.fill)) >= 0.005);
  const negShort = c.filter((m) => m.short < 0);
  const negCarry = c.filter((m) => m.carryOut < 0);
  const badDone = c.filter((m) => m.done !== (m.short === 0));
  const badLink = c.slice(1).filter((m, i) => Math.abs(m.carryIn - c[i].carryOut) >= 0.005);
  return [
    ['א · אורך השרשרת', c.length, MONTHS.length],
    ['ב · חסר = מינימום פחות מילוי', badShort.length, 0],
    ['ג · חסר אינו שלילי', negShort.length, 0],
    ['ד · חודש בגירעון אינו מוריש חוב', Math.round(c[2].carryOut * 100), 0, `חסר ${Math.round(c[2].short)}`],
    ['ה · העודף עובר במלואו לחודש הבא', badLink.length, 0, `עודף ${Math.round(c[1].carryOut)}`],
    ['ו · גירעון שני נמדד מול המינימום שלו בלבד', Math.round(c[3].short * 100), Math.round((P - 100) * 100)],
    ['ז · «הושלם» נגזר מהחסר', badDone.length, 0],
    ['ח · עודף אינו שלילי באף חודש', negCarry.length, 0],
    ['ט · חודש בלי רשומות — החסר הוא המינימום המלא', Math.round(c[0].short * 100), Math.round(P * 100)],
    ['י · וחודש בלי רשומות אינו «הושלם»', c[0].done ? 1 : 0, 0],
  ];
}

const run = (chain) => checks(chain).filter(([, got, want]) => got !== want);

console.log(`· ${APP.app} — עודף עובר, חוב לא`);
for (const [name, got, want, extra] of checks(kChain)) {
  if (got === want) pass(`${name} — נמדד ${got}${extra ? ` (${extra})` : ''}`);
  else fail(`${name} — נמדד ${got} והצפוי ${want}${extra ? ` (${extra})` : ''}. ` +
            'מחזירים את ה-`max` להעברת העודף, ⛔ וחוב אינו עובר לחודש הבא');
}

/* ── מוטציות ───────────────────────────────────────────────────────────── */
mutStage();
if (RUN_MUT) {
  /*  ⛔ הליבה המוטנטית נטענת מכתובת `data:` — ⚠️ היא טקסט בזיכרון,
   *  ⭐ ואין קובץ שנכתב: ⛔ המוטציה אינה נוגעת בעץ בשום שלב. */
  const src = rd('tools/' + APP.core);
  const load = async (text) => (await import('data:text/javascript,' + encodeURIComponent(text))).kChain;

  /*  ⛔ המוטציה שוברת את המנגנון ⛔ ולא את הצורה — ⚠️ הסרת הרצפה מהעברת
   *  העודף היא בדיוק «חוב עובר», ⭐ וזה מה שהשער בא למנוע. */
  const leaks = src.replace('carry = Math.max(0, tzedakah + carryIn - pledge);',
                            'carry = tzedakah + carryIn - pledge;');
  if (leaks === src) {
    fail('מוטציה · הרצפה לא הוסרה — נמדדו 0 החלפות והצפוי אחת. ' +
         'מיישרים את תבנית ההחלפה לשורת העברת העודף שבליבה');
  } else {
    const fellOn = run(await load(leaks));
    const named = fellOn.find(([n]) => n.startsWith('ד ·'));
    if (named)
      pass(`מ1 · מוטציה: עודף בלי רצפה מפיל את הטענה «${named[0]}» — ` +
           `${fellOn.length} טענות מתוך ${checks(kChain).length} התהפכו`);
    else
      fail('מ1 · מוטציה: עודף בלי רצפה ⛔ לא הפיל את טענה ד — נמדדו ' +
           `${fellOn.length} טענות שהתהפכו והצפוי את הטענה הנקובה. מחזירים את מדידת העודף של חודש הגירעון`);
  }

  /*  ⛔ מוטציה: החודש הריק מסומן «הושלם» — ⚠️ היא שוברת את הגזירה
   *  ⛔ ולא את הצורה: ⭐ הקלט הריק הוא מצב ההתקנה הטרייה, ⛔ וטענה
   *  שנבדקה רק על קלט מלא עוברת בדיוק במקום שבו היא הכי עלולה להישבר. */
  {
    const forced = (ms, o) => kChain(ms, o).map((m, i) => (i === 0 ? { ...m, short: 0, done: true } : m));
    const fellOn = run(forced);
    const named = fellOn.find(([nm]) => nm.startsWith('ט ·') || nm.startsWith('י ·'));
    if (named)
      pass(`מ2 · מוטציה: חודש ריק שסומן «הושלם» מפיל את הטענה «${named[0]}» — ` +
           `${fellOn.length} טענות מתוך ${checks(kChain).length} התהפכו`);
    else
      fail('מ2 · מוטציה: חודש ריק שסומן «הושלם» ⛔ לא הפיל את טענות ט–י — נמדדו ' +
           `${fellOn.length} טענות שהתהפכו והצפוי את הטענה הנקובה. מחזירים את מדידת החודש הריק`);
  }

  /*  ⛔ מוטציית-נגד היא שינוי חי שאסור לו להפיל — ⚠️ שם מקומי שהוחלף
   *  בעקביות, ⭐ ולא הוספת הערה. */
  const renamed = src.replace(/\bconst out = \[\];/, 'const rowsOut = [];')
                     .replace(/\bout\.push\(/, 'rowsOut.push(')
                     .replace(/\breturn out;/, 'return rowsOut;');
  if (renamed === src || /\bout\b/.test(renamed.slice(renamed.indexOf('export function kChain')))) {
    fail('מוטציית-נגד · השם לא הוחלף בעקביות — נמדדו החלפות חלקיות והצפוי החלפה מלאה. ' +
         'מיישרים את תבנית ההחלפה לשם שבליבה');
  } else {
    const badOnes = run(await load(renamed));
    if (!badOnes.length)
      pass('נ1 · ⭐ מוטציית-נגד: שם מקומי שהוחלף בעקביות ⛔ אינו מפיל אף טענה');
    else
      fail(`נ1 · מוטציית-נגד הפילה את הטענה «${badOnes[0][0]}» — נמדדו ${badOnes.length} ` +
           'טענות שהתהפכו והצפוי אפס. מיישרים את ההחלפה כך שתהיה עקבית');
  }
}

if (failures) { console.error(`\n❌ ${APP.app}: ${failures} טענות נכשלו`); process.exitCode = 1; }
else console.log(`\n✓ ${APP.app}: עודף עובר, חוב לא`);
