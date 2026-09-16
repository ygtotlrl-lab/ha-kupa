#!/usr/bin/env node
/*  test_examples.mjs — שלוש הדוגמאות המספריות מול ליבת החישוב.
 *
 *  **מה נאכף:** ⛔ שלוש שרשראות חודשים שהמספרים שלהן נמסרו בכתב רצות
 *  דרך `kpChain`, ⚠️ וכל מספר שהיא מחזירה מושווה לערך שנמסר — ⭐ חומש ·
 *  יתרה · מילוי · חסר · עודף · ואחוז האישי. ⛔ ואין כאן בדיקת נוכחות:
 *  ⚠️ כל טענה היא ערך מול ערך, ⛔ וסטייה של אגורה מפילה.
 *
 *  **הנימוק המדוד:** ⛔ אף סיכום אינו נשמר בטבלה — ⚠️ הכל נגזר בזמן
 *  קריאה: ⭐ ולכן אין שורה במסד שאפשר להשוות אליה, ⛔ והדוגמאות הן
 *  הראיה היחידה שהנוסחה היא זו שנמסרה. ⚠️ בגיליון שקדם לאפליקציה טעות
 *  בטבת נגררה חצי שנה ⛔ מפני שאיש לא הריץ אותה מחדש.
 *
 *  **מה יישבר בלעדיו:** ⛔ שינוי בשיעור החומש, בסדר העברת העודף או
 *  בהכרעת «חוב אינו עובר» יעבור בשקט — ⚠️ המסך יציג מספר, ⭐ והוא ייראה
 *  סביר: ⛔ ואין שער אחר שמודד את התוצאה עצמה.
 *
 *  **מה אינו נאכף כאן:** ⛔ **המסך** — ⚠️ מה שהמשתמש רואה נמדד בשער
 *  ההתנהגות, ⭐ וכאן נמדדת הפונקציה לבדה; ⛔ ואין כאן מדידה של הסכימה
 *  ולא של הדחיפה, ⚠️ שהן שורות משלהן.
 *
 *  ⛔ שער פרטי לאפליקציה אחת — ⚠️ ליבת חישוב החומש, היתרה והמילוי קיימת
 *  כאן בלבד: ⭐ לשאר אין שרשרת חודשים שהמספרים נגזרים ממנה, ⛔ ושער
 *  שיישב אצלן היה מודד מודול שאינו קיים.
 *  ⛔ המוטציות אינן נכתבות לעץ — עותק זמני, והשער האמיתי רץ עליו.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { kpChain } from './kp-calc.mjs';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = { app: 'ha-kupa', core: 'kp-calc.mjs' };
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ הקובץ הזה אינו אוכף שורה בטבלת התשתית — ⚠️ הצהרה ריקה ולא היעדר:
 *  ⛔ שער בלי הצהרה אינו נבדל משער שההצהרה שלו נשמטה. */
export const ROWS = [];

/*  ⛔ המוטציות אינן ברירת המחדל — ⚠️ כל מוטציה היא שינוי ⟵ הרצה ⟵ שחזור:
 *  ⛔ הן רצות ברמה המלאה (`--full`), בסוף הסבב ולפני מיזוג. */
const RUN_MUT = process.env.GATE_MUT === '1';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

let failures = 0;
/*  ⛔ שער מריץ את כל טענותיו — ⚠️ תהליך שנסגר באמצע מדפיס «עבר» על טענות
 *  שלא רצו: ⭐ `EXPECTED` הוא רצפה שנמדדה ברמה שבה השער רץ, ⛔ ופחות ממנה
 *  הוא כשל — ⚠️ והמאזין על `exit` תופס גם יציאה שקדמה להמתנה. */
const GATE_ID = new URL(import.meta.url).pathname.split('/').pop();
/*  ⛔ ריצפת הטענות — ⚠️ **מה נכנס**: המשותפת, שהיא מספר זהה בכל הריפו,
 *  ⛔ והפרטית עם היכולת שמוסיפה אותה; ⛔ **ומה מפיל**: משותפת שנבדלת בין
 *  הריפו, פרטית בלי נימוק, וסכום אפס. */
const FLOOR = { shared: 0, app: 15, appWhy: 'שלוש הדוגמאות המספריות של ליבת החישוב — ⛔ והיא קיימת כאן בלבד' };
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

/*  ⛔ הפרש מותר של אגורה — ⚠️ הסכומים עשרוניים, ⭐ והשוואת שוויון בין
 *  צפים מפילה על ייצוג ⛔ ולא על חשבון. */
const eq = (name, got, want) => {
  const ok = Math.abs(got - want) < 0.005;
  const m = `${name} — נמדד ${Math.round(got * 100) / 100} והצפוי ${want}. ` +
            'מיישרים את הנוסחה בליבת החישוב, ⛔ ולא את המספר שנמסר';
  ok ? pass(`${name} — ${want}`) : fail(m);
  return ok;
};

/*  ⛔ הדוגמאות נגזרות ⛔ ואינן מוקלדות פעמיים — ⚠️ אותה שרשרת מוזנת גם
 *  לליבה החיה וגם לליבה המוטנטית: ⭐ שתי הזנות לאותה דוגמה הן שתי
 *  הזדמנויות להיבדל. */
const tz = (amount, category) => ({ type: 'tzedakah', amount, category: category || 'לאחרים' });
const inc = (amount) => ({ type: 'income', amount });
const PL = { 5786: 2770, 5787: 4200 };
const SO = [300, 150, 150, 150, 55, 28];               /* 833 */
const OPTS = { opening: 700, pledgeOf: (y) => PL[y] };
/*  ⛔ אב פותח ביתרה משלו — ⚠️ הוא שרשרת בפני עצמה, ⭐ ולא המשך של תשרי. */
const AV_OPTS = { opening: 1695, pledgeOf: (y) => PL[y] };
const TISHREI = { key: 'תשרי', year: 5787, rows: [inc(15400), tz(3750), tz(1450, 'אישי')] };
const CHESHVAN = { key: 'חשון', year: 5787, rows: SO.map((a) => tz(a)) };
const AV = { key: 'מנחם אב', year: 5786, rows: [inc(16900), tz(1179)] };

/*  ⛔ **מה נכנס**: שם הטענה ⟵ הערך שנמסר בכתב ⟵ הדרך להוציאו מהשרשרת;
 *  ⛔ **ומה מפיל**: ערך שנמדד ואינו הערך שנמסר. ⭐ **ולמה המבנה קיים**:
 *  המוטציה רצה על אותו מרשם בדיוק, ⚠️ ובלעדיו היא הייתה בודקת דוגמה
 *  אחרת מזו שהשער מודד — ⛔ ולכן המרשם אחד לשתי הדרכים. */
const CASES = [
  ['תשרי · חומש',                 3080,  (c) => c[0].chumash],
  ['תשרי · יתרה',                 2820,  (c) => c[0].balance],
  ['תשרי · מילוי',                5200,  (c) => c[0].fill],
  ['תשרי · חסר',                     0,  (c) => c[0].short],
  ['תשרי · עודף לחשון',           1000,  (c) => c[0].carryOut],
  ['תשרי · אישי %',                 28,  (c) => Math.round(c[0].selfPct)],
  ['חשון · סך הו״ק',               833,  () => SO.reduce((a, b) => a + b, 0)],
  ['חשון · חומש',                    0,  (c) => c[1].chumash],
  ['חשון · יתרה',                 3653,  (c) => c[1].balance],
  ['חשון · יתרה קודמת (מוצגת)',   2820,  (c) => c[1].prevBalance],
  ['חשון · מילוי',                1833,  (c) => c[1].fill],
  ['חשון · חסר',                  2367,  (c) => c[1].short],
  ['חשון · מחודש קודם',           1000,  (c) => c[1].carryIn],
  ['אב · יתרה',                   -506,  (c) => c[2].balance],
  ['אב · חסר',                    1591,  (c) => c[2].short],
];

/*  ⛔ שלוש השרשראות באותה קריאה — ⚠️ חשון תלוי בעודף של תשרי, ⭐ ואב הוא
 *  שרשרת בפני עצמה: ⛔ הפרדתן לשלוש קריאות הייתה מנתקת את מעבר העודף. */
function chainsOf(calc) {
  const two = calc.kpChain([TISHREI, CHESHVAN], OPTS);
  const one = calc.kpChain([AV], AV_OPTS);
  return [two[0], two[1], one[0]];
}

console.log(`· ${APP.app} — שלוש הדוגמאות המספריות של ליבת החישוב`);
const live = chainsOf({ kpChain });
for (const [name, want, pick] of CASES) eq(name, pick(live), want);

/* ── מוטציות ───────────────────────────────────────────────────────────── */
mutStage();
if (RUN_MUT) {
  /*  ⛔ העותק הזמני נפתח פעם אחת לשער — ⚠️ שתי המוטציות רצות עליו בזו
   *  אחר זו, ⭐ והזמן גדל עם מספרן ⛔ ולא עם גודל הקוד. */
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kupa-examples-'));
  const src = fs.readFileSync(path.join(ROOT, 'tools', APP.core), 'utf8');
  const runOn = async (text, tag) => {
    const f = path.join(dir, tag + '-' + APP.core);
    /*  ⛔ כותב על עותק — ⚠️ המוטציה מוטענת כמודול, ⛔ ו-`import` מקבל קובץ ⛔ ולא טקסט. */
    fs.writeFileSync(f, text);
    const mod = await import(pathToFileURL(f).href);
    try { return chainsOf(mod); } catch (e) { return null; }
  };

  /*  ⛔ המוטציה שוברת את המנגנון ⛔ ולא את הצורה — ⚠️ שיעור החומש הוא
   *  ההכרעה עצמה, ⭐ והיפוכו מזיז כל מספר בשרשרת. */
  const broken = src.replace('KP_CHUMASH_RATE = 0.2', 'KP_CHUMASH_RATE = 0.25');
  if (broken === src) {
    fail('מוטציה · שיעור החומש לא הוחלף — נמדדו 0 החלפות והצפוי אחת. ' +
         'מיישרים את תבנית ההחלפה לשם הקבוע שבליבה');
  } else {
    const got = await runOn(broken, 'mut1');
    const fellOn = got ? CASES.filter(([, want, pick]) => Math.abs(pick(got) - want) >= 0.005) : CASES;
    if (fellOn.length)
      pass(`מ1 · מוטציה: שיעור חומש 0.25 מפיל את הטענה «${fellOn[0][0]}» — ` +
           `${fellOn.length} טענות מתוך ${CASES.length} התהפכו`);
    else
      fail('מ1 · מוטציה: שיעור חומש 0.25 ⛔ לא הפיל אף טענה — נמדדו 0 טענות ' +
           `שהתהפכו מתוך ${CASES.length} והצפוי לפחות אחת. מחזירים את ההשוואה לערך`);
  }

  /*  ⛔ מוטציית-נגד היא שינוי חי שאסור לו להפיל — ⚠️ שם מקומי שהוחלף
   *  בעקביות, ⭐ ולא הוספת הערה. */
  const renamed = src.replace(/\bconst live = /, 'const _kpLiveRows = ')
                     .replace(/\blive\(/g, '_kpLiveRows(')
                     .replace('const _kpLiveRows = (rows)', 'const _kpLiveRows = (rows)');
  if (renamed === src) {
    fail('מוטציית-נגד · שם העוזר לא הוחלף — נמדדו 0 החלפות והצפוי אחת. ' +
         'מיישרים את תבנית ההחלפה לשם שבליבה');
  } else {
    const got = await runOn(renamed, 'anti1');
    const bad = got ? CASES.filter(([, want, pick]) => Math.abs(pick(got) - want) >= 0.005) : CASES;
    if (!bad.length)
      pass('נ1 · ⭐ מוטציית-נגד: שם עוזר שהוחלף בעקביות ⛔ אינו מפיל אף טענה');
    else
      fail(`נ1 · מוטציית-נגד הפילה את הטענה «${bad[0][0]}» — נמדדו ${bad.length} ` +
           'טענות שהתהפכו והצפוי אפס. מיישרים את ההחלפה כך שתהיה עקבית');
  }
  fs.rmSync(dir, { recursive: true, force: true });
}

if (failures) { console.error(`\n❌ ${APP.app}: ${failures} טענות נכשלו`); process.exitCode = 1; }
else console.log(`\n✓ ${APP.app}: שלוש הדוגמאות עוברות`);
