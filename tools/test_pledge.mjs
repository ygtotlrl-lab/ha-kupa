#!/usr/bin/env node
/*  test_pledge.mjs — הפלעדזש מעביר יתרה, ומתאפס בראש השנה.
 *
 *  **מה נאכף:** ⛔ החובה הכוללת החודש היא `פלעדזש − יתרת הפתיחה` בכל חודש
 *  בשרשרת — ⚠️ ערך מול ערך, ⛔ ולא בדיקת נוכחות · ⛔ **והיתרה עוברת בשני
 *  הכיוונים** — ⚠️ עודף וחוב כאחד: ⭐ מה שנשאר בסוף חודש הוא בדיוק יתרת
 *  הפתיחה של הבא · ⛔⛔ **והיתרה מתאפסת בראש השנה העברית** — ⚠️ חודש ראשון
 *  בשנה חדשה נמדד מול הסכום החודשי בלבד · ⛔ **וחודש שטרם הגיע אינו נושא
 *  יתרה** — ⚠️ הוא מציג את הסכום השנתי שחוזר, ⭐ והוא אינו מוריש דבר לבא.
 *
 *  **הנימוק המדוד:** ⛔ הפלעדזש והחומש הם שני חישובים על אותה צדקה —
 *  ⚠️ ושניהם מצטברים: ⭐ רצפה שמעבירה עודף בלבד מוחקת חוב שאיש לא מחל
 *  עליו, ⛔ והחודש שאחריו מציג חובה נמוכה מזו שבפועל — ⚠️ והמשתמש נותן
 *  פחות ממה שהתחייב, ⭐ בלי שאיש יראה.
 *
 *  **מה יישבר בלעדיו:** ⛔ החזרת ה-`max` להעברת היתרה תעבור בשקט —
 *  ⚠️ חודש הגירעון ייראה תקין, ⭐ והמספר השגוי יופיע רק בחודש שאחריו:
 *  ⛔ ואין שער אחר שמודד את שרשרת ההעברה עצמה · ⚠️ והסרת האיפוס בראש
 *  השנה תגרור חוב של שנה שנסגרה אל שנה שעוד לא הוחלטה.
 *
 *  **מה אינו נאכף כאן:** ⛔ **יתרת החומש** — ⚠️ היא נמדדת בשער החומש;
 *  ⛔ **והמופע שנספר מיד** — ⚠️ הוא נמדד בשער הוראות הקבע, ⭐ וכאן נמדדת
 *  שרשרת הפלעדזש בלבד.
 *
 *  ⛔ שער פרטי לאפליקציה אחת — ⚠️ סכום שנתי שחוזר בכל חודש ומעביר יתרה
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
const FLOOR = { shared: 0, app: 13, appWhy: 'שרשרת הפלעדזש — היתרה שעוברת בשני הכיוונים, האיפוס בראש השנה, והחודש שטרם הגיע: ⛔ והיא קיימת כאן בלבד, ⚠️ שבשאר היעד נמדד ונגמר בחודשו' };
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

/*  ⛔ שמונה חודשים בשתי שנים — ⚠️ **מה נכנס**: הצדקה שנרשמה בכל חודש
 *  של 5787, בסדר; ⛔ **ומה מפיל**: שרשרת שאין בה שני חודשי גירעון רצופים —
 *  ⭐ בלעדיהם «חוב עובר» אינו נמדד כלל; ⛔ שאין בה חודש שהיתרה בו הופכת
 *  לזכות — ⚠️ בלעדיו «עודף מקטין את החובה» אינו נמדד; ⛔ ושאין בה מעבר
 *  שנה — ⚠️ בלעדיו האיפוס אינו נמדד.
 *  ⚠️ **ולמה המבנה קיים**: אותה שרשרת בדיוק מוזנת לליבה החיה ולמוטנטית. */
const GIVEN = [0, 1500, 200, 100, 6000, 300];
const tz = (amount) => (amount ? [{ type: 'tzedakah', amount }] : []);
const MONTHS = GIVEN.map((a, i) => ({ key: `5787-0${i + 1}`, year: 5787, rows: tz(a) }))
  /*  ⛔ ראש השנה הבאה — ⚠️ היתרה שלפניו אינה עוברת אליו. */
  .concat([{ key: '5788-01', year: 5788, rows: tz(50) },
  /*  ⛔ חודש שטרם הגיע — ⚠️ `now` נעצר בחודש שלפניו. */
           { key: '5788-02', year: 5788, rows: [] }]);
const OPTS = { opening: 0, pledgeOf: () => APP.pledge, now: '5788-01' };

/*  ⛔ היתרה נגזרת מהמרשם ⛔ ולא מהשרשרת שנמדדת — ⚠️ אחרת המדידה משווה
 *  את הליבה לעצמה: ⭐ מה שניתן עד כה, פחות הסכום החודשי כפול מספר החודשים. */
const balAfter = (i) => GIVEN.slice(0, i + 1).reduce((x, y) => x + y, 0) - (i + 1) * APP.pledge;

/*  ⛔ **מה נכנס**: שם הטענה ⟵ הערך שנמדד ⟵ הערך הצפוי; ⛔ **ומה מפיל**:
 *  מדידה שאינה הערך הצפוי. ⭐ **ולמה המבנה קיים**: המוטציה רצה על אותו
 *  מרשם בדיוק, ⚠️ ובלעדיו היא הייתה מודדת דבר אחר מזה שהשער מודד — ⛔ ולכן מרשם אחד לשתי הדרכים. */
function checks(chain) {
  const c = chain(MONTHS, OPTS);
  const P = APP.pledge;
  const cent = (x) => Math.round(x * 100);
  const badDue = c.filter((m) => Math.abs(m.pledgeDue - (P - m.pledgeOpen)) >= 0.005);
  const badLeft = c.filter((m) => Math.abs(m.pledgeLeft - (m.pledgeDue - m.tzedakah)) >= 0.005);
  /*  ⛔ הקישור נמדד על החודשים ששרשרתם רצופה — ⚠️ מעבר שנה וחודש שטרם
   *  הגיע הם שתי נקודות שבהן היתרה מאופסת בכוונה, ⭐ ולכן הם מוחרגים. */
  const linked = c.slice(1, GIVEN.length);
  const badLink = linked.filter((m, i) => Math.abs(m.pledgeOpen - c[i].pledgeBalance) >= 0.005);
  return [
    ['א · אורך השרשרת', c.length, MONTHS.length],
    ['ב · החובה הכוללת = הסכום החודשי פחות יתרת הפתיחה', badDue.length, 0],
    ['ג · «סכום שנשאר» = החובה פחות מה שניתן החודש', badLeft.length, 0],
    ['ד · חודש בגירעון מוריש חוב', cent(c[2].pledgeBalance), cent(balAfter(2)), `חובה ${Math.round(c[2].pledgeDue)}`],
    ['ה · והיתרה עוברת במלואה לחודש הבא', badLink.length, 0, `יתרה ${Math.round(c[1].pledgeBalance)}`],
    ['ו · גירעון שני נמדד מול החוב שנצבר', cent(c[3].pledgeDue), cent(P - balAfter(2))],
    ['ז · ועודף מקטין את החובה של הבא', cent(c[5].pledgeDue), cent(P - balAfter(4))],
    ['ח · וחובה שהעודף עולה עליה היא שלילית', c[5].pledgeDue < 0 ? 1 : 0, 1, `${Math.round(c[5].pledgeDue)}`],
    ['ט · חודש בלי רשומות — החובה היא הסכום החודשי המלא', cent(c[0].pledgeDue), cent(P)],
    ['י · וגם «סכום שנשאר» שלו הוא הסכום המלא', cent(c[0].pledgeLeft), cent(P)],
    ['יא · ראש השנה מאפס את היתרה', cent(c[6].pledgeOpen), 0, `לפניו ${Math.round(c[5].pledgeBalance)}`],
    ['יב · וחודש שטרם הגיע אינו נושא יתרה', cent(c[7].pledgeOpen), 0],
    ['יג · והוא מציג את הסכום החודשי שחוזר', cent(c[7].pledgeDue), cent(P)],
  ];
}

const run = (chain) => checks(chain).filter(([, got, want]) => got !== want);

console.log(`· ${APP.app} — היתרה עוברת, ומתאפסת בראש השנה`);
for (const [name, got, want, extra] of checks(kChain)) {
  if (got === want) pass(`${name} — נמדד ${got}${extra ? ` (${extra})` : ''}`);
  else fail(`${name} — נמדד ${got} והצפוי ${want}${extra ? ` (${extra})` : ''}. ` +
            'מסירים את הרצפה מהעברת היתרה, ⛔ ומאפסים אותה בראש השנה בלבד');
}

/* ── מוטציות ───────────────────────────────────────────────────────────── */
mutStage();
if (RUN_MUT) {
  /*  ⛔ הליבה המוטנטית נטענת מכתובת `data:` — ⚠️ היא טקסט בזיכרון,
   *  ⭐ ואין קובץ שנכתב: ⛔ המוטציה אינה נוגעת בעץ בשום שלב. */
  const src = rd('tools/' + APP.core);
  const load = async (text) => (await import('data:text/javascript,' + encodeURIComponent(text))).kChain;

  /*  ⛔ המוטציה שוברת את המנגנון ⛔ ולא את הצורה — ⚠️ רצפה על העברת
   *  היתרה היא בדיוק «חוב אינו עובר», ⭐ וזה מה שהשער בא למנוע. */
  const floored = src.replace('pBalance = future ? 0 : -pledgeLeft;',
                              'pBalance = future ? 0 : Math.max(0, -pledgeLeft);');
  if (floored === src) {
    fail('מוטציה · הרצפה לא הוחזרה — נמדדו 0 החלפות והצפוי אחת. ' +
         'מיישרים את תבנית ההחלפה לשורת העברת היתרה שבליבה');
  } else {
    const fellOn = run(await load(floored));
    const named = fellOn.find(([n]) => n.startsWith('ד ·'));
    if (named)
      pass(`מ1 · מוטציה: רצפה על היתרה מפילה את הטענה «${named[0]}» — ` +
           `${fellOn.length} טענות מתוך ${checks(kChain).length} התהפכו`);
    else
      fail('מ1 · מוטציה: רצפה על היתרה ⛔ לא הפילה את טענה ד — נמדדו ' +
           `${fellOn.length} טענות שהתהפכו והצפוי את הטענה הנקובה. מחזירים את מדידת החוב שמורש`);
  }

  /*  ⛔ מוטציה: האיפוס בראש השנה מוסר — ⚠️ היא שוברת את המנגנון:
   *  ⭐ חוב של שנה שנסגרה נגרר אל שנה שעוד לא הוחלטה. */
  const noTurn = src.replace('const pledgeOpen = (yearTurn || future) ? 0 : pBalance;',
                             'const pledgeOpen = future ? 0 : pBalance;');
  if (noTurn === src) {
    fail('מוטציה · האיפוס לא הוסר — נמדדו 0 החלפות והצפוי אחת. ' +
         'מיישרים את תבנית ההחלפה לשורת יתרת הפתיחה שבליבה');
  } else {
    const fellOn = run(await load(noTurn));
    const named = fellOn.find(([n]) => n.startsWith('יא ·'));
    if (named)
      pass(`מ2 · מוטציה: ראש שנה בלי איפוס מפיל את הטענה «${named[0]}» — ` +
           `${fellOn.length} טענות מתוך ${checks(kChain).length} התהפכו`);
    else
      fail('מ2 · מוטציה: ראש שנה בלי איפוס ⛔ לא הפיל את טענה יא — נמדדו ' +
           `${fellOn.length} טענות שהתהפכו והצפוי את הטענה הנקובה. מחזירים את האיפוס בראש השנה`);
  }

  /*  ⛔ מוטציה: החודש שטרם הגיע משרשר — ⚠️ היא שוברת את המנגנון:
   *  ⭐ חודש שלא נסגר אין לו מה להוריש, ⛔ והחובה שלו אינה הסכום שחוזר. */
  const noNow = src.replace("const now = opts.now == null ? '' : String(opts.now);",
                            "const now = '';");
  if (noNow === src) {
    fail('מוטציה · גבול החודש הנוכחי לא הוסר — נמדדו 0 החלפות והצפוי אחת. ' +
         'מיישרים את תבנית ההחלפה לשורת `now` שבליבה');
  } else {
    const fellOn = run(await load(noNow));
    const named = fellOn.find(([n]) => n.startsWith('יב ·') || n.startsWith('יג ·'));
    if (named)
      pass(`מ3 · מוטציה: חודש עתידי שמשרשר מפיל את הטענה «${named[0]}» — ` +
           `${fellOn.length} טענות מתוך ${checks(kChain).length} התהפכו`);
    else
      fail('מ3 · מוטציה: חודש עתידי שמשרשר ⛔ לא הפיל את טענות יב–יג — נמדדו ' +
           `${fellOn.length} טענות שהתהפכו והצפוי את הטענה הנקובה. מחזירים את גבול החודש הנוכחי`);
  }

  /*  ⛔ מוטציה: החודש הריק מקבל חובה אפס — ⚠️ היא שוברת את הגזירה
   *  ⛔ ולא את הצורה: ⭐ הקלט הריק הוא מצב ההתקנה הטרייה, ⛔ וטענה
   *  שנבדקה רק על קלט מלא עוברת בדיוק במקום שבו היא הכי עלולה להישבר. */
  {
    const forced = (ms, o) => kChain(ms, o).map((m, i) => (i === 0 ? { ...m, pledgeDue: 0, pledgeLeft: 0 } : m));
    const fellOn = run(forced);
    const named = fellOn.find(([nm]) => nm.startsWith('ט ·') || nm.startsWith('י ·'));
    if (named)
      pass(`מ4 · מוטציה: חודש ריק שחובתו אופסה מפיל את הטענה «${named[0]}» — ` +
           `${fellOn.length} טענות מתוך ${checks(kChain).length} התהפכו`);
    else
      fail('מ4 · מוטציה: חודש ריק שחובתו אופסה ⛔ לא הפיל את טענות ט–י — נמדדו ' +
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
else console.log(`\n✓ ${APP.app}: היתרה עוברת, ומתאפסת בראש השנה`);
