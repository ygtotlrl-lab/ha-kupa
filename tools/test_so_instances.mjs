#!/usr/bin/env node
/*  test_so_instances.mjs — מופע נספר מיד.
 *
 *  **מה נאכף:** ⛔ מופע של הוראת קבע נספר בצדקה בפועל מרגע שנוצר —
 *  ⚠️ ולא ביום החיוב ולא ביום התשלום: ⭐ המדידה היא שהמופע יוצא מהמיפוי
 *  כרשומת צדקה, ⛔ בלי אף סינון מצב בדרך · ⛔ **והחסר נגזר ממנו** — ⚠️ חודש
 *  ריק שיש בו מופעים ממתינים בלבד מראה את החסר הנכון מא׳ דחודש, ⭐ וזה
 *  מספר מול מספר · ⛔ **והיצירה אידמפוטנטית** — ⚠️ מופע אחד לכל צמד
 *  הוראה+חודש.
 *
 *  **הנימוק המדוד:** ⛔ ההוראה כבר ידועה בתחילת החודש — ⚠️ והמשתמש אינו
 *  צריך לחכות ליום החיוב כדי לדעת כמה חסר לו: ⭐ «חסר» שמשתנה באמצע החודש
 *  בלי שהמשתמש עשה דבר הוא שקר מא׳ דחודש ועד יום החיוב, ⛔ והוא שולח אותו
 *  לתת סכום שכבר מובטח.
 *
 *  **מה יישבר בלעדיו:** ⛔ סינון «שולם» שיתווסף למיפוי המופעים יעבור
 *  בשקט — ⚠️ המסך יציג מספר, ⭐ והוא ייראה סביר: ⛔ החסר יקפוץ מטה בכל
 *  אישור, ⚠️ ואיש לא יקשר בין השניים.
 *
 *  **מה אינו נאכף כאן:** ⛔ **הגרסאות** — ⚠️ עריכת מופע נמדדת בשער הגרסה;
 *  ⛔ **והעברת העודף** — ⚠️ היא נמדדת בשער הפלעדזש, ⭐ וכאן נמדד שהמופע
 *  נכנס למניין.
 *
 *  ⛔ שער פרטי לאפליקציה אחת — ⚠️ הוראת קבע שמייצרת מופע חודשי קיימת כאן
 *  בלבד: ⭐ בשכר החיוב החודשי נגזר מטווח החודשים של התלמיד ⛔ ואינו רשומה,
 *  ⚠️ ובגיוס ההתחייבות נפרעת בתנועות ⛔ ואין לה מופע.
 *  ⛔ **והשער סורק גולמי בכוונה** — ⚠️ הנמדד הוא **איזה ליטרל** יושב
 *  ברשומת המופע, ⭐ וההלבנה מוחקת בדיוק את מה שהוא מודד: ⛔ ולכן ההיקף
 *  מחולץ תחילה — גוף הפונקציה, ⚠️ ולא המקור כולו.
 *  ⛔ המוטציות אינן נכתבות לעץ — ⚠️ השער מקבל את התוכן כארגומנט, ⭐ והן
 *  רצות בזיכרון: ⛔ בלי לכתוב ובלי תהליך.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { kpChain } from './kp-calc.mjs';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  app: 'ha-kupa',
  /*  ⛔ הפונקציות שההיקף מחולץ מהן — ⚠️ **מה נכנס**: שם פונקציה שהמדידה
   *  חלה על גופה בלבד; ⛔ **ומה מפיל**: שם שאין לו גוף במקור. ⭐ **ולמה
   *  המבנה קיים**: סריקה על המקור כולו סופרת ליטרל שיושב במסך אחר. */
  fns: ['instancesOfMonth', 'instanceRows', 'monthRows', 'soEnsureInstances'],
  pledge: 4000,
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
const FLOOR = { shared: 0, app: 9, appWhy: 'מופע הוראת קבע שנספר מרגע יצירתו — ⛔ והיכולת קיימת כאן בלבד: ⚠️ בשאר החיוב החודשי נגזר ואינו רשומה' };
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
  const j = src.indexOf('{', i);
  if (j < 0) return '';
  let d = 0;
  for (let k = j; k < src.length; k++) {
    if (src[k] === '{') d++;
    else if (src[k] === '}') { d--; if (!d) return src.slice(j + 1, k); }
  }
  return '';
}
const n = (s, re) => (s.match(re) || []).length;

/*  ⛔ חודש אחד, בלי רישום ידני — ⚠️ **מה נכנס**: סכומי המופעים בלבד;
 *  ⛔ **ומה מפיל**: רשימה ריקה — ⭐ חודש בלי מופעים אינו מודד דבר כאן.
 *  ⚠️ **ולמה המבנה קיים**: המספר שנמדד הוא החסר, ⛔ והוא נגזר מהם. */
const SO = [833, 300, 55];
const OPTS = { opening: 0, pledgeOf: () => APP.pledge };
const asRows = (amts) => amts.map((a) => ({ type: 'tzedakah', amount: a }));
const sum = (a) => a.reduce((s, x) => s + x, 0);

/*  ⛔ **מה נכנס**: שם הטענה ⟵ הערך שנמדד ⟵ הערך הצפוי; ⛔ **ומה מפיל**:
 *  מדידה שאינה הערך הצפוי. ⭐ **ולמה המבנה קיים**: המוטציה רצה על אותו
 *  מרשם בדיוק, ⚠️ ובלעדיו היא הייתה מודדת דבר אחר מזה שהשער מודד — ⛔ ולכן מרשם אחד לשתי הדרכים. */
function checks(src) {
  const B = Object.fromEntries(APP.fns.map((f) => [f, fnBody(src, f)]));
  const withSo = kpChain([{ key: 'ח', year: 5787, rows: asRows(SO) }], OPTS)[0];
  const empty = kpChain([{ key: 'ר', year: 5787, rows: [] }], OPTS)[0];
  return [
    ['א · גופי הפונקציות חולצו', APP.fns.filter((f) => B[f].length > 10).length, APP.fns.length],
    ['ב · המיפוי חל על כל המופעים, בלי סינון', n(B.instanceRows, /instancesOfMonth\(k\)\.map\(/g), 1],
    ['ג · סינון נוסף בגוף המיפוי', n(B.instanceRows, /\.filter\(/g), 0],
    ['ד · אזכור מצב בשליפת המופעים', n(B.instancesOfMonth, /status/g), 0],
    ['ה · המופע יוצא כרשומת צדקה', n(B.instanceRows, /type:\s*'tzedakah'/g), 1],
    ['ו · המופעים מצורפים לרישומי החודש', n(B.monthRows, /\.concat\(instanceRows\(/g), 1],
    ['ז · המופע נוצר במצב ממתין', n(B.soEnsureInstances, /status:\s*'pending'/g), 1],
    ['ח · היצירה אידמפוטנטית — מופע אחד לצמד', n(B.soEnsureInstances, /if \(has\) continue;/g), 1],
    ['ט · החסר נגזר מהמופעים מא׳ דחודש',
     Math.round(withSo.short), APP.pledge - sum(SO), `חודש ריק — ${Math.round(empty.short)}`],
  ];
}

const run = (src) => checks(src).filter(([, got, want]) => got !== want);

console.log(`· ${APP.app} — מופע נספר מיד`);
const SRC = rd('index.html');
for (const [name, got, want, extra] of checks(SRC)) {
  if (got === want) pass(`${name} — נמדד ${got}${extra ? ` (${extra})` : ''}`);
  else fail(`${name} — נמדד ${got} והצפוי ${want}${extra ? ` (${extra})` : ''}. ` +
            'מסירים את הסינון מהמיפוי — ⛔ המופע נספר מרגע שנוצר, ולא ביום התשלום');
}

/* ── מוטציות ───────────────────────────────────────────────────────────── */
mutStage();
if (RUN_MUT) {
  /*  ⛔ המוטציה שוברת את המנגנון ⛔ ולא את הצורה — ⚠️ סינון «שולם» לפני
   *  המיפוי הוא בדיוק «המופע נספר ביום התשלום», ⭐ וזה מה שהשער בא למנוע.
   *  ⛔ והיא נכתבת על עותק **בזיכרון** — ⚠️ השער מקבל את התוכן כארגומנט. */
  const paidOnly = SRC.replace('return instancesOfMonth(k).map(function (r) {',
    "return instancesOfMonth(k).filter(function (x) { return x.status === 'paid'; }).map(function (r) {");
  if (paidOnly === SRC) {
    fail('מוטציה · הסינון לא נשתל — נמדדו 0 החלפות והצפוי אחת. ' +
         'מיישרים את תבנית ההחלפה לשורת המיפוי שבמקור');
  } else {
    const fellOn = run(paidOnly);
    const named = fellOn.find(([x]) => x.startsWith('ב ·'));
    if (named)
      pass(`מ1 · מוטציה: סינון «שולם» מפיל את הטענה «${named[0]}» — ` +
           `${fellOn.length} טענות מתוך ${checks(SRC).length} התהפכו`);
    else
      fail('מ1 · מוטציה: סינון «שולם» ⛔ לא הפיל את טענה ב — נמדדו ' +
           `${fellOn.length} טענות שהתהפכו והצפוי את הטענה הנקובה. מחזירים את מדידת המיפוי הישיר`);
  }

  /*  ⛔ מוטציית-נגד היא שינוי חי שאסור לו להפיל — ⚠️ שם מקומי שהוחלף
   *  בעקביות, ⭐ ולא הוספת הערה. */
  const renamed = SRC.replace('var made = [], os = ordersLive(), i, o, has;',
                              'var pendingNew = [], os = ordersLive(), i, o, has;')
                     .replace('    made.push({ client_id: newClientId()',
                              '    pendingNew.push({ client_id: newClientId()')
                     .replace('  return made;\n}', '  return pendingNew;\n}');
  if (renamed === SRC || /\bmade\b/.test(fnBody(renamed, 'soEnsureInstances'))) {
    fail('מוטציית-נגד · השם לא הוחלף בעקביות — נמדדו החלפות חלקיות והצפוי החלפה מלאה. ' +
         'מיישרים את תבנית ההחלפה לשם שבמקור');
  } else {
    const badOnes = run(renamed);
    if (!badOnes.length)
      pass('נ1 · ⭐ מוטציית-נגד: שם מקומי שהוחלף בעקביות ⛔ אינו מפיל אף טענה');
    else
      fail(`נ1 · מוטציית-נגד הפילה את הטענה «${badOnes[0][0]}» — נמדדו ${badOnes.length} ` +
           'טענות שהתהפכו והצפוי אפס. מיישרים את המדידה כך שלא תישען על שם מקומי');
  }
}

if (failures) { console.error(`\n❌ ${APP.app}: ${failures} טענות נכשלו`); process.exitCode = 1; }
else console.log(`\n✓ ${APP.app}: מופע נספר מיד`);
