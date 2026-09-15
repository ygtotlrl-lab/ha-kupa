#!/usr/bin/env node
/*  test_sums.mjs — אף סיכום אינו נשמר.
 *
 *  **מה נאכף:** ⛔ אין במסד עמודה שמחזיקה סכום שנגזר מרשומות אחרות —
 *  ⚠️ «נגבה» · «נשאר» · «יתרה» · «מצב»: ⭐ וכל חריגה מוצהרת ב-`APP.sumColsAllow`
 *  ונמדדת משני צדדיה. ⛔ **ואין חישוב בשרת** — ⚠️ אפס `.rpc(` ואפס `view`,
 *  ⛔ ואפס פונקציית צבירה ב-SQL · ⛔ **והמצב בזיכרון הוא הטבלאות בלבד** —
 *  ⚠️ שש רשימות שנושאות את שמות הטבלאות, ⭐ ואף אחת מהן אינה סיכום ·
 *  ⛔ **ונקודת הגזירה אחת** — ⚠️ אתר קריאה יחיד לשרשרת החישוב.
 *
 *  **הנימוק המדוד:** ⛔ סכום שמור מתיישן בכל רישום שנעשה במכשיר אחר —
 *  ⚠️ והמסך ממשיך להציג אותו: ⭐ בגיליון שקדם לאפליקציה טעות בטבת נגררה
 *  חצי שנה ⛔ מפני שאיש לא הריץ את הסכום מחדש. ⚠️ וחישוב בשרת שובר
 *  אופליין — ⛔ מכשיר בלי רשת אינו מקבל מספר כלל.
 *
 *  **מה יישבר בלעדיו:** ⛔ עמודת `collected` שתתווסף במיגרציה הבאה תעבור
 *  בשקט — ⚠️ היא תיראה כמו כל עמודה אחרת, ⭐ והקוד שיקרא אותה יסכים עם
 *  עצמו: ⛔ והפער ייראה רק במכשיר השני, אחרי שהנתון כבר הוצג.
 *
 *  **מה אינו נאכף כאן:** ⛔ **נכונות החשבון** — ⚠️ המספרים עצמם נמדדים
 *  בשער הדוגמאות, ⭐ וכאן נמדד שאין מקום שני שבו הם יושבים; ⛔ ואין כאן
 *  מדידה של הסכימה מול המסד החי, ⚠️ שהיא שורה משלה.
 *
 *  ⛔ שער פרטי לאפליקציה אחת — ⚠️ שלוש האחיות שומרות סכומים שנגזרו:
 *  ⭐ «נגבה להתחייבות» בגיוס ו«סה״כ שולם» בשכר הם חישוב בזמן קריאה שם
 *  **על שאילתה**, ⛔ ואין בהן שרשרת חודשים מצטברת שסיכום שמור היה מקצר.
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
  /*  ⛔ עמודה ששמה שם של סיכום ואינה סיכום — ⚠️ **מה נכנס**: `<טבלה>.<עמודה>`
   *  ⟵ מה העמודה מחזיקה ולמה אין בה צבירה; ⛔ **ומה מפיל**: עמודה כזו בלי
   *  הצהרה, ⛔ והצהרה שאין לה עמודה חיה. ⭐ **ולמה המבנה קיים**: שם שנשמע
   *  כסיכום אינו בהכרח סיכום, ⚠️ ובלי ההצהרה היה צריך לצמצם את הרשימה —
   *  ⛔ וצמצום כזה הוא היתר שקט לשם הבא. */
  sumColsAllow: {
    'kp_so_instances.status': 'מצבו של המופע היחיד — ⚠️ ממתין או שולם, ⛔ ואינו צבירה של רשומות אחרות: ⭐ עובדה על שורה אחת, והיא זו שנרשמה',
  },
  /*  ⛔ שמות שאסור להם להיות שם עמודה — ⚠️ **מה נכנס**: שם באנגלית שמציין
   *  סכום שנגזר; ⛔ **ומה מפיל**: עמודה ששמה **בדיוק** אחד מהם ואינה
   *  מוצהרת. ⭐ **ולמה המבנה קיים**: שלושת המושגים שהתקן הפרטי נוקב בהם
   *  הם «נגבה» · «נשאר» · «יתרה», ⚠️ ולכל אחד כמה שמות מקובלים. */
  sumNames: ['collected', 'balance', 'remaining', 'total', 'sum', 'status',
             'paid', 'paid_amount', 'amount_paid', 'due', 'outstanding'],
  /*  ⛔ המצב בזיכרון — ⚠️ **מה נכנס**: שם המשתנה שמחזיק את העותק המקומי,
   *  ⛔ **ומה מפיל**: מפתח שאינו טבלה. ⭐ **ולמה המבנה קיים**: המשתנה הזה
   *  הוא המקום הטבעי שבו סיכום שמור היה נשמר בלי שאיש יראה. */
  stateVar: 'DATA',
  chainFn: 'kpChain',
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
const FLOOR = { shared: 0, app: 9, appWhy: 'אף סיכום אינו נשמר — ⛔ והיכולת קיימת כאן בלבד: ⚠️ שרשרת חודשים מצטברת שכל מספריה נגזרים בזמן קריאה' };
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

/*  ⛔ ההערות נחתכות לפני הספירה — ⚠️ המילים `create table` מופיעות בהסבר
 *  שבראש הקובץ, ⭐ וספירה גולמית מדווחת פער על קובץ תקין. */
const sqlCode = (sql) => sql.replace(/--[^\n]*/g, ' ');

/*  ⛔ גוף הטבלה נחתך בהתאמת סוגריים ⛔ ולא בחלון קבוע — ⚠️ גוף ארוך מהחלון
 *  היה נחתך באמצע, ⭐ והעמודות שאחריו לא היו נספרות כלל. */
function tableCols(sql) {
  const out = [];
  const re = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-z_]+)\s*\(/gi;
  let m;
  while ((m = re.exec(sql)) !== null) {
    let i = re.lastIndex, depth = 1;
    while (i < sql.length && depth > 0) {
      if (sql[i] === '(') depth++;
      else if (sql[i] === ')') depth--;
      i++;
    }
    const body = sql.slice(re.lastIndex, i - 1);
    /*  ⛔ רק שורה שפותחת הגדרת עמודה — ⚠️ `constraint` ו-`primary key`
     *  אינם עמודות, ⭐ ושורת המשך בתוך סוגריים אינה שם. */
    let d = 0, cur = '';
    const parts = [];
    for (const ch of body) {
      if (ch === '(') d++;
      else if (ch === ')') d--;
      if (ch === ',' && d === 0) { parts.push(cur); cur = ''; continue; }
      cur += ch;
    }
    parts.push(cur);
    for (const p of parts) {
      const t = p.trim().split(/\s+/)[0];
      if (!t || /^(constraint|primary|unique|check|foreign)$/i.test(t)) continue;
      out.push({ table: m[1], col: t.toLowerCase() });
    }
  }
  return out;
}

/*  ⛔ **מה נכנס**: שמות הטענות ⟵ המדידה שמחזירה מספר וערך צפוי;
 *  ⛔ **ומה מפיל**: מדידה שאינה הערך הצפוי. ⭐ **ולמה המבנה קיים**:
 *  המוטציה רצה על אותו מרשם בדיוק, ⚠️ ובלעדיו היא הייתה מודדת דבר אחר
 *  מזה שהשער מודד — ⛔ ולכן מרשם אחד לשתי הדרכים. */
function checks(ctx) {
  const code = sqlCode(ctx.sql);
  const cols = tableCols(code);
  const tables = new Set(cols.map((c) => c.table));
  const allow = APP.sumColsAllow;
  const hits = cols.filter((c) => APP.sumNames.includes(c.col));
  const bad = hits.filter((c) => !Object.prototype.hasOwnProperty.call(allow, c.table + '.' + c.col));
  const live = new Set(hits.map((c) => c.table + '.' + c.col));
  const ghost = Object.keys(allow).filter((k) => !live.has(k));
  const w = ctx.w;
  const nRpc = (w.match(/\.rpc\s*\(/g) || []).length;
  const nFrom = (w.match(/\.from\s*\(/g) || []).length;
  const nView = (code.match(/create\s+(?:or\s+replace\s+)?(?:materialized\s+)?view/gi) || []).length;
  const nAgg = (code.match(/\b(?:sum|count|avg|min|max)\s*\(/gi) || []).length;
  const nIdx = (code.match(/create\s+index/gi) || []).length;
  const stateRe = new RegExp('var\\s+' + APP.stateVar + '\\s*=\\s*\\{([\\s\\S]*?)\\}\\s*;');
  const sm = stateRe.exec(w);
  const keys = sm ? [...sm[1].matchAll(/([a-z_]+)\s*:/g)].map((x) => x[1]) : [];
  const chainRe = new RegExp('(function\\s+)?\\b' + APP.chainFn + '\\s*\\(', 'g');
  const calls = [...w.matchAll(chainRe)].filter((x) => !x[1]).length;
  return [
    ['א · שבע הטבלאות נקראו', tables.size, 7],
    ['ב · אינדקסים נקראו', nIdx, 6],
    ['ג · עמודת סיכום בלי הצהרה', bad.length, 0, bad.map((c) => c.table + '.' + c.col).join(', ')],
    ['ד · הצהרה בלי עמודה חיה', ghost.length, 0, ghost.join(', ')],
    ['ה · אתרי `.from(` — הסורק רואה את הלקוח החי', nFrom > 0 ? 1 : 0, 1, String(nFrom)],
    ['ו · חישוב בשרת — `.rpc(`', nRpc, 0],
    ['ז · `view` ופונקציית צבירה במיגרציות', nView + nAgg, 0],
    ['ח · מפתחות המצב בזיכרון שאינם טבלה',
     keys.filter((k) => !ctx.own.includes(k) || APP.sumNames.includes(k)).length, 0,
     `נמדדו ${keys.length} מפתחות`],
    ['ט · אתרי קריאה לשרשרת החישוב', calls, 1],
  ];
}

const CTX = () => {
  const html = rd('index.html');
  const dir = path.join(ROOT, 'migrations');
  const sql = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
    .map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
  return { html, sql, w: whiten(html, { markup: 'blank' }),
           own: ['kp_years', 'kp_months', 'kp_standing_orders',
                 'kp_so_instances', 'kp_entries', 'kp_lookups'] };
};

const run = (ctx) => checks(ctx).filter(([, got, want]) => got !== want);

console.log(`· ${APP.app} — אף סיכום אינו נשמר`);
const C0 = CTX();
for (const [name, got, want, extra] of checks(C0)) {
  if (got === want) pass(`${name} — נמדד ${got}${extra ? ` (${extra})` : ''}`);
  else fail(`${name} — נמדד ${got} והצפוי ${want}${extra ? ` (${extra})` : ''}. ` +
            'מסירים את הסיכום השמור, ⛔ או מצהירים אותו ב-`APP.sumColsAllow` עם נימוקו');
}

/* ── מוטציות ───────────────────────────────────────────────────────────── */
mutStage();
if (RUN_MUT) {
  /*  ⛔ המוטציה שוברת את המנגנון ⛔ ולא את הצורה — ⚠️ עמודה שנוספת לטבלה
   *  היא בדיוק מה שהשער בא למנוע, ⭐ והיא נכתבת על עותק **בזיכרון**. */
  const withCol = { ...C0, sql: C0.sql.replace('  pleziash                numeric not null,',
                                               '  pleziash                numeric not null,\n  balance                 numeric,') };
  if (withCol.sql === C0.sql) {
    fail('מוטציה · עמודת הסיכום לא נשתלה — נמדדו 0 החלפות והצפוי אחת. ' +
         'מיישרים את תבנית ההחלפה לשורת העמודה שבמיגרציה');
  } else {
    const fellOn = run(withCol);
    const named = fellOn.find(([n]) => n.startsWith('ג ·'));
    if (named)
      pass(`מ1 · מוטציה: עמודת \`balance\` מפילה את הטענה «${named[0]}» — ` +
           `${fellOn.length} טענות מתוך ${checks(C0).length} התהפכו`);
    else
      fail('מ1 · מוטציה: עמודת `balance` ⛔ לא הפילה את טענה ג — נמדדו ' +
           `${fellOn.length} טענות שהתהפכו והצפוי את הטענה הנקובה. מחזירים את ההשוואה לרשימת השמות`);
  }

  /*  ⛔ מוטציית-נגד היא שינוי חי שאסור לו להפיל — ⚠️ עמודה תקינה שנוספת
   *  לאותה טבלה, ⭐ ולא הוספת הערה. */
  const withNote = { ...C0, sql: C0.sql.replace('  pleziash                numeric not null,',
                                                '  pleziash                numeric not null,\n  note                    text,') };
  if (withNote.sql === C0.sql) {
    fail('מוטציית-נגד · העמודה התקינה לא נשתלה — נמדדו 0 החלפות והצפוי אחת. ' +
         'מיישרים את תבנית ההחלפה לשורת העמודה שבמיגרציה');
  } else {
    const badOnes = run(withNote);
    if (!badOnes.length)
      pass('נ1 · ⭐ מוטציית-נגד: עמודה תקינה שנוספה ⛔ אינה מפילה אף טענה');
    else
      fail(`נ1 · מוטציית-נגד הפילה את הטענה «${badOnes[0][0]}» — נמדדו ${badOnes.length} ` +
           'טענות שהתהפכו והצפוי אפס. מצמצמים את רשימת השמות לשם מדויק');
  }
}

if (failures) { console.error(`\n❌ ${APP.app}: ${failures} טענות נכשלו`); process.exitCode = 1; }
else console.log(`\n✓ ${APP.app}: אף סיכום אינו נשמר`);
