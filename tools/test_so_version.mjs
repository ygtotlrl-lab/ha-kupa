#!/usr/bin/env node
/*  test_so_version.mjs — עריכת מופע פותחת גרסה.
 *
 *  **מה נאכף:** ⛔ עריכת הוראת קבע אינה עורכת את השורה הקיימת — ⚠️ הישנה
 *  מקבלת «תוקף עד» החודש הקודם, ⭐ והחדשה נפתחת כאן ומצביעה עליה
 *  ב-`supersedes_id`: ⛔ והמדידה היא מונה מול מספר בגוף הפונקציה, ⛔ ולא
 *  בדיקת נוכחות · ⛔ **ומופעים קודמים אינם נוגעים** — ⚠️ אפס נגיעה
 *  בשליפת המופעים או ביצירתם מגוף העריכה · ⛔ **והתחולה חסומה משני
 *  צדדיה** — ⚠️ «תוקף מ» ו«תוקף עד», ⭐ ושתיהן נבדקות.
 *
 *  **הנימוק המדוד:** ⛔ מופע שכבר נספר בחודש שעבר הוא נתון היסטורי —
 *  ⚠️ המשתמש ראה אותו, החסר חושב מולו, והחודש נסגר: ⭐ עריכה שתשנה אותו
 *  למפרע מזיזה מספר שכבר הוצג, ⛔ ואין דרך לדעת שהוא זז.
 *
 *  **מה יישבר בלעדיו:** ⛔ עריכה שתכתוב על השורה הישנה תעבור בשקט —
 *  ⚠️ המסך יציג את הסכום החדש בכל חודש שכבר חושב, ⭐ והכל יסכים עם עצמו:
 *  ⛔ והפער ייראה רק מול מה שהמשתמש זוכר.
 *
 *  **מה אינו נאכף כאן:** ⛔ **ספירת המופע** — ⚠️ היא נמדדת בשער המופעים;
 *  ⛔ **וסדר הדחיפה בין אב לבן** — ⚠️ הוא נמדד בשער האב-והבן, ⭐ וכאן
 *  נמדדת פתיחת הגרסה בלבד.
 *
 *  ⛔ שער פרטי לאפליקציה אחת — ⚠️ הוראת קבע מגורסת קיימת כאן בלבד:
 *  ⭐ בגיוס ההתחייבות נערכת במקום ⛔ ואין לה היסטוריית תחולה, ⚠️ ובשכר
 *  טווח החודשים הוא שדה על התלמיד ⛔ ולא שורה שמוחלפת.
 *  ⛔ המוטציות אינן נכתבות לעץ — ⚠️ השער מקבל את התוכן כארגומנט, ⭐ והן
 *  רצות בזיכרון: ⛔ בלי לכתוב ובלי תהליך.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { whiten } from './whiten.mjs';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  app: 'ha-kupa',
  /*  ⛔ הפונקציות שההיקף מחולץ מהן — ⚠️ **מה נכנס**: שם פונקציה שהמדידה
   *  חלה על גופה בלבד; ⛔ **ומה מפיל**: שם שאין לו גוף במקור. ⭐ **ולמה
   *  המבנה קיים**: סריקה על המקור כולו סופרת השמה שיושבת במסך אחר. */
  fns: ['orderNewVersion', 'orderAppliesTo'],
  /*  ⛔ פונקציות המופעים שאסור להן להופיע בגוף העריכה — ⚠️ **מה נכנס**:
   *  שם פונקציה שנוגעת במופעים; ⛔ **ומה מפיל**: הופעה של אחת מהן בגוף
   *  פתיחת הגרסה. ⭐ **ולמה המבנה קיים**: «אינו משנה למפרע» הוא היעדר
   *  נגיעה, ⚠️ והיעדר נמדד מול רשימה ⛔ ולא מול תחושה. */
  instanceFns: ['instancesOfMonth', 'soEnsureInstances', 'instanceRows'],
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
const FLOOR = { shared: 0, app: 9, appWhy: 'פתיחת גרסה להוראת קבע — ⛔ והיכולת קיימת כאן בלבד: ⚠️ בשאר אין הוראה שתחולתה חסומה בחודשים' };
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

/*  ⛔ **מה נכנס**: שם הטענה ⟵ הערך שנמדד ⟵ הערך הצפוי; ⛔ **ומה מפיל**:
 *  מדידה שאינה הערך הצפוי. ⭐ **ולמה המבנה קיים**: המוטציה רצה על אותו
 *  מרשם בדיוק, ⚠️ ובלעדיו היא הייתה מודדת דבר אחר מזה שהשער מודד — ⛔ ולכן מרשם אחד לשתי הדרכים. */
function checks(src) {
  /*  ⛔ המדידה על מקור מולבן — ⚠️ מחרוזות והערות מוחלפות ברווחים,
   *  ⭐ ושם שיושב בתוך מחרוזת אינו נספר כמזהה חי. */
  const w = whiten(src, { markup: 'blank' });
  const B = Object.fromEntries(APP.fns.map((f) => [f, fnBody(w, f)]));
  const nv = B.orderNewVersion, ap = B.orderAppliesTo;
  const touch = APP.instanceFns.reduce((s, f) => s + n(nv, new RegExp('\\b' + f + '\\s*\\(', 'g')), 0);
  return [
    ['א · גופי הפונקציות חולצו', APP.fns.filter((f) => B[f].length > 10).length, APP.fns.length],
    ['ב · הישנה מקבלת «תוקף עד»', n(nv, /old\.valid_to_month\s*=/g), 1],
    ['ג · וערכה הוא החודש הקודם', n(nv, /old\.valid_to_month\s*=\s*prev\s*\?/g), 1],
    ['ד · והישנה יוצאת מהתחולה', n(nv, /old\.active\s*=\s*false/g), 1],
    ['ה · הגרסה החדשה נושאת מזהה שנוצר במכשיר', n(nv, /client_id:\s*newClientId\(\)/g), 1],
    ['ו · והיא מצביעה על קודמתה', n(nv, /supersedes_id:\s*o\.client_id/g), 1],
    ['ז · תוקפה נפתח כאן ואינו נסגר', n(nv, /valid_from_month:\s*key,\s*valid_to_month:\s*null/g), 1],
    ['ח · נגיעה במופעים מגוף פתיחת הגרסה', touch, 0],
    ['ט · התחולה חסומה משני צדדיה', n(ap, /o\.valid_(?:from|to)_month && key [<>] o\.valid_(?:from|to)_month/g), 2],
  ];
}

const run = (src) => checks(src).filter(([, got, want]) => got !== want);

console.log(`· ${APP.app} — עריכת מופע פותחת גרסה`);
const SRC = rd('index.html');
for (const [name, got, want, extra] of checks(SRC)) {
  if (got === want) pass(`${name} — נמדד ${got}${extra ? ` (${extra})` : ''}`);
  else fail(`${name} — נמדד ${got} והצפוי ${want}${extra ? ` (${extra})` : ''}. ` +
            'עריכה פותחת שורה חדשה — ⛔ והישנה מקבלת «תוקף עד» ואינה נכתבת מחדש');
}

/* ── מוטציות ───────────────────────────────────────────────────────────── */
mutStage();
if (RUN_MUT) {
  /*  ⛔ המוטציה שוברת את המנגנון ⛔ ולא את הצורה — ⚠️ הסרת סגירת התוקף
   *  מהגרסה הישנה משאירה שתי הוראות חיות באותו חודש, ⭐ וזה מה שהשער בא
   *  למנוע. ⛔ והיא נכתבת על עותק **בזיכרון**. */
  const noClose = SRC.replace(
    "    old.valid_to_month = prev ? (prev.hebrew_year + '-' + String(prev.ordinal)) : key;\n", '');
  if (noClose === SRC) {
    fail('מוטציה · סגירת התוקף לא הוסרה — נמדדו 0 החלפות והצפוי אחת. ' +
         'מיישרים את תבנית ההחלפה לשורת «תוקף עד» שבמקור');
  } else {
    const fellOn = run(noClose);
    const named = fellOn.find(([x]) => x.startsWith('ב ·'));
    if (named)
      pass(`מ1 · מוטציה: גרסה ישנה בלי «תוקף עד» מפילה את הטענה «${named[0]}» — ` +
           `${fellOn.length} טענות מתוך ${checks(SRC).length} התהפכו`);
    else
      fail('מ1 · מוטציה: הסרת «תוקף עד» ⛔ לא הפילה את טענה ב — נמדדו ' +
           `${fellOn.length} טענות שהתהפכו והצפוי את הטענה הנקובה. מחזירים את מדידת ההשמה`);
  }

  /*  ⛔ מוטציית-נגד היא שינוי חי שאסור לו להפיל — ⚠️ שם מקומי שהוחלף
   *  בעקביות, ⭐ ולא הוספת הערה. */
  const renamed = SRC.replace('  var next = {\n', '  var fresh = {\n')
                     .replace("  localPut('kp_standing_orders', next);\n  return next;",
                              "  localPut('kp_standing_orders', fresh);\n  return fresh;");
  if (renamed === SRC || /\bnext\b/.test(fnBody(whiten(renamed, { markup: 'blank' }), 'orderNewVersion'))) {
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
else console.log(`\n✓ ${APP.app}: עריכת מופע פותחת גרסה`);
