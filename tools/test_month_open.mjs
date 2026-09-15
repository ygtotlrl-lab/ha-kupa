#!/usr/bin/env node
/*  test_month_open.mjs — חודש שלא הושלם אינו נסגר.
 *
 *  **מה נאכף:** ⛔ כל אתר שכותב את חותמת הסגירה של חודש יושב בתוך שומר
 *  שבודק שהחודש הושלם — ⚠️ «הושלם» הוא החסר שהתאפס, ⭐ והמדידה היא מונה
 *  אתרים בלתי-שמורים מול אפס · ⛔ **והעמודה עצמה אינה נסגרת מאליה** —
 *  ⚠️ טיפוסה נחלץ ומושווה, ⛔ ואין לה ברירת מחדל · ⛔ **ו«הושלם» נגזר
 *  ואינו נשמר** — ⚠️ הוא החסר שהתאפס בכל חודש בשרשרת, ⭐ וזה ערך מול ערך.
 *
 *  **הנימוק המדוד:** ⛔ חודש סגור הוא הצהרה שאין בו עוד מה לעשות —
 *  ⚠️ והמופעים הממתינים שבו כבר נספרו בחסר: ⭐ סגירה שתקדים אותם מקפיאה
 *  מספר שעוד היה אמור לרדת, ⛔ והמשתמש מאבד בדיוק את המידע שבשבילו נוצר
 *  המופע מראש. ⚠️ **ואין היום אף אתר סגירה** — ⛔ והשומר נמדד כעת כדי
 *  שהראשון שייכתב לא ייכתב בלעדיו.
 *
 *  **מה יישבר בלעדיו:** ⛔ מסך «סיום חודש» שייכתב בסבב הבא יסגור כל חודש
 *  שהמשתמש פתח — ⚠️ בלי שאיש יבדוק את החסר: ⭐ והחודש ייראה גמור, ⛔ ואין
 *  מסלול שמחזיר אותו.
 *
 *  **מה אינו נאכף כאן:** ⛔ **חישוב החסר עצמו** — ⚠️ הוא נמדד בשער
 *  הפלעזדש; ⛔ **וספירת המופע** — ⚠️ היא נמדדת בשער המופעים, ⭐ וכאן נמדד
 *  השומר שלפני הסגירה.
 *
 *  ⛔ שער פרטי לאפליקציה אחת — ⚠️ חודש שנסגר קיים כאן בלבד: ⭐ בשלוש
 *  האחיות התקופה היא טווח תאריכים בשאילתה, ⛔ ואין בהן רשומת חודש שאפשר
 *  להצהיר עליה שהסתיימה.
 *  ⛔ המוטציות אינן נכתבות לעץ — ⚠️ השער מקבל את התוכן כארגומנט, ⭐ והן
 *  רצות בזיכרון: ⛔ בלי לכתוב ובלי תהליך.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { whiten } from './whiten.mjs';
import { kpChain } from './kp_calc.mjs';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  app: 'ha-kupa',
  table: 'kp_months',
  closeCol: 'closed_at',
  closeType: 'timestamptz',
  cols: 12,
  /*  ⛔ סימני השומר — ⚠️ **מה נכנס**: ביטוי שמעיד שהחסר נבדק לפני הסגירה;
   *  ⛔ **ומה מפיל**: אתר סגירה שאין בהיקפו אף אחד מהם. ⭐ **ולמה המבנה
   *  קיים**: «הושלם» נגזר משני שמות — ⚠️ הדגל והמספר שממנו הוא נגזר,
   *  ⛔ ושומר שנכתב באחד מהם אינו פחות שומר. */
  guards: [/\bdone\b/, /\.short\b/, /\bshort\s*===\s*0/],
  /*  ⛔ עמודות החודש שהקוד קורא — ⚠️ **מה נכנס**: שם עמודה שקיים במסד
   *  ויש לו קורא; ⛔ **ומה מפיל**: רשימה שאין לה אף אתר — ⭐ אז הסורק
   *  אינו רואה את הקוד כלל, ⚠️ ואפס אתרי סגירה אינו אומר דבר. */
  liveCols: ['hebrew_year', 'ordinal', 'start_date'],
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
const FLOOR = { shared: 0, app: 9, appWhy: 'השומר שלפני סגירת חודש — ⛔ והיכולת קיימת כאן בלבד: ⚠️ בשאר התקופה היא טווח בשאילתה ואין רשומת חודש שנסגרת' };
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

const n = (s, re) => (s.match(re) || []).length;

/*  ⛔ ההיקף מחולץ לפני המדידה — ⚠️ הפונקציה שבתוכה יושב אתר הסגירה,
 *  ⭐ ולא המקור כולו: ⛔ שומר שיושב בפונקציה אחרת אינו שומר.
 *  ⚠️ **והחיתוך בהתאמת סוגריים** — ⛔ חלון תווים קבוע היה נמתח אל
 *  הפונקציה הבאה, ⭐ ומאשר שומר שאינו במקום. */
function enclosingFn(src, at) {
  const head = src.lastIndexOf('function ', at);
  if (head < 0) return '';
  const open = src.indexOf('{', head);
  if (open < 0 || open > at) return '';
  let d = 0;
  for (let k = open; k < src.length; k++) {
    if (src[k] === '{') d++;
    else if (src[k] === '}') { d--; if (!d) return k > at ? src.slice(open, k) : ''; }
  }
  return '';
}

/*  ⛔ גוף הטבלה נחתך בהתאמת סוגריים ⛔ ולא בחלון קבוע — ⚠️ גוף ארוך
 *  מהחלון היה נחתך באמצע, ⭐ והעמודות שאחריו לא היו נספרות כלל. */
function tableBody(sql, name) {
  const re = new RegExp('create\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?(?:public\\.)?' + name + '\\s*\\(', 'i');
  const m = re.exec(sql);
  if (!m) return '';
  let i = m.index + m[0].length, d = 1;
  while (i < sql.length && d > 0) {
    if (sql[i] === '(') d++;
    else if (sql[i] === ')') d--;
    i++;
  }
  return sql.slice(m.index + m[0].length, i - 1);
}

/*  ⛔ ארבעה חודשים, שניים מהם בגירעון — ⚠️ **מה נכנס**: חודש ⟵ הצדקה
 *  שנרשמה בו; ⛔ **ומה מפיל**: שרשרת שכל חודשיה הושלמו — ⭐ אז «אינו
 *  נסגר» אינו נמדד כלל. */
const tz = (amount) => ({ type: 'tzedakah', amount });
const PLEZIASH = 1200;
const MONTHS = [
  { key: 'א', year: 5787, rows: [] },
  { key: 'ב', year: 5787, rows: [tz(400)] },
  { key: 'ג', year: 5787, rows: [tz(1200)] },
  { key: 'ד', year: 5787, rows: [tz(2000)] },
];
const OPTS = { opening: 0, pleziashOf: () => PLEZIASH };

/*  ⛔ **מה נכנס**: שם הטענה ⟵ הערך שנמדד ⟵ הערך הצפוי; ⛔ **ומה מפיל**:
 *  מדידה שאינה הערך הצפוי. ⭐ **ולמה המבנה קיים**: המוטציה רצה על אותו
 *  מרשם בדיוק, ⚠️ ובלעדיו היא הייתה מודדת דבר אחר מזה שהשער מודד — ⛔ ולכן מרשם אחד לשתי הדרכים. */
function checks(ctx) {
  /*  ⛔ המדידה על מקור מולבן — ⚠️ מחרוזות והערות מוחלפות ברווחים,
   *  ⭐ ושם שיושב בתוך מחרוזת אינו נספר כאתר כתיבה. */
  const w = whiten(ctx.html, { markup: 'blank' });
  const body = tableBody(ctx.sql.replace(/--[^\n]*/g, ' '), APP.table);
  const lines = body.split(',').map((s) => s.trim()).filter(Boolean);
  const closeLine = lines.find((l) => l.split(/\s+/)[0] === APP.closeCol) || '';
  const writeRe = new RegExp('\\.' + APP.closeCol + '\\s*=|\\b' + APP.closeCol + '\\s*:', 'g');
  const unguarded = [];
  for (const m of w.matchAll(writeRe)) {
    const scope = enclosingFn(w, m.index);
    if (!scope || !APP.guards.some((g) => g.test(scope))) unguarded.push(m.index);
  }
  const c = kpChain(MONTHS, OPTS);
  const badDone = c.filter((m) => m.done !== (m.short === 0));
  const liveHits = APP.liveCols.reduce((s, col) => s + n(w, new RegExp('\\b' + col + '\\b', 'g')), 0);
  return [
    ['א · עמודות טבלת החודשים נקראו', lines.filter((l) => !/^(constraint|primary|unique|check)/i.test(l)).length, APP.cols],
    ['ב · טיפוס חותמת הסגירה', (closeLine.split(/\s+/)[1] || ''), APP.closeType],
    ['ג · ברירת מחדל לחותמת הסגירה', n(closeLine, /\bdefault\b/gi), 0],
    ['ד · כתיבה ל«נסגר» בלי שומר השלמה', unguarded.length, 0],
    ['ה · הקוד קורא את עמודות החודש', liveHits > 0 ? 1 : 0, 1, `${liveHits} אתרים`],
    ['ו · «הושלם» נגזר מהחסר בכל חודש', badDone.length, 0],
    ['ז · חודש שלא מילא את המינימום אינו «הושלם»', c[1].done ? 1 : 0, 0, `חסר ${Math.round(c[1].short)}`],
    ['ח · חודש ריק אינו «הושלם»', c[0].done ? 1 : 0, 0, `חסר ${Math.round(c[0].short)}`],
    ['ט · וחודש שמילא אותו כן', c[2].done ? 1 : 0, 1, `חסר ${Math.round(c[2].short)}`],
  ];
}

const CTX = (html) => ({
  html,
  sql: fs.readdirSync(path.join(ROOT, 'migrations')).filter((f) => f.endsWith('.sql')).sort()
    .map((f) => fs.readFileSync(path.join(ROOT, 'migrations', f), 'utf8')).join('\n'),
});
const run = (ctx) => checks(ctx).filter(([, got, want]) => got !== want);

console.log(`· ${APP.app} — חודש שלא הושלם אינו נסגר`);
const SRC = rd('index.html');
const C0 = CTX(SRC);
for (const [name, got, want, extra] of checks(C0)) {
  if (got === want) pass(`${name} — נמדד «${got}»${extra ? ` (${extra})` : ''}`);
  else fail(`${name} — נמדד «${got}» והצפוי «${want}»${extra ? ` (${extra})` : ''}. ` +
            'עוטפים את הסגירה בשומר שבודק שהחסר התאפס, ⛔ ואין סוגרים חודש שלא הושלם');
}

/* ── מוטציות ───────────────────────────────────────────────────────────── */
mutStage();
if (RUN_MUT) {
  /*  ⛔ שתי הפונקציות נשתלות באותו מקום בדיוק — ⚠️ **מה נכנס**: גוף
   *  שכותב את חותמת הסגירה; ⛔ **והן נבדלות בשומר בלבד**: ⭐ זה מה שהופך
   *  את הזוג למדידה של השומר ⛔ ולא של הכתיבה. ⚠️ **ולמה המבנה קיים**:
   *  הן נכתבות על עותק **בזיכרון**, ⛔ והעץ אינו נוגע. */
  const ANCHOR = 'function monthRows(k) {';
  const bare = 'function kpMutClose(k) {\n  var m = monthByKey(k);\n  m.closed_at = new Date().toISOString();\n  localPut(\'kp_months\', m);\n}\n';
  const kept = 'function kpMutClose(k) {\n  var c = chainOf(k);\n  if (!c || !c.done) return;\n  var m = monthByKey(k);\n  m.closed_at = new Date().toISOString();\n  localPut(\'kp_months\', m);\n}\n';

  /*  ⛔ המוטציה שוברת את המנגנון ⛔ ולא את הצורה — ⚠️ סגירה בלי שומר היא
   *  בדיוק מה שהשער בא למנוע. */
  const open = SRC.replace(ANCHOR, bare + ANCHOR);
  if (open === SRC) {
    fail('מוטציה · הסוגר חסר-השומר לא נשתל — נמדדו 0 החלפות והצפוי אחת. ' +
         'מיישרים את תבנית ההשתלה לפונקציה שבמקור');
  } else {
    const fellOn = run(CTX(open));
    const named = fellOn.find(([x]) => x.startsWith('ד ·'));
    if (named)
      pass(`מ1 · מוטציה: סגירת חודש בלי שומר מפילה את הטענה «${named[0]}» — ` +
           `${fellOn.length} טענות מתוך ${checks(C0).length} התהפכו`);
    else
      fail('מ1 · מוטציה: סגירה בלי שומר ⛔ לא הפילה את טענה ד — נמדדו ' +
           `${fellOn.length} טענות שהתהפכו והצפוי את הטענה הנקובה. מחזירים את חילוץ ההיקף שסביב אתר הכתיבה`);
  }

  /*  ⛔ מוטציית-נגד היא שינוי חי שאסור לו להפיל — ⚠️ אותה פונקציה בדיוק
   *  עם השומר, ⭐ ולא הוספת הערה. */
  const guarded = SRC.replace(ANCHOR, kept + ANCHOR);
  if (guarded === SRC) {
    fail('מוטציית-נגד · הסוגר השמור לא נשתל — נמדדו 0 החלפות והצפוי אחת. ' +
         'מיישרים את תבנית ההשתלה לפונקציה שבמקור');
  } else {
    const badOnes = run(CTX(guarded));
    if (!badOnes.length)
      pass('נ1 · ⭐ מוטציית-נגד: סגירת חודש **עם** שומר השלמה ⛔ אינה מפילה אף טענה');
    else
      fail(`נ1 · מוטציית-נגד הפילה את הטענה «${badOnes[0][0]}» — נמדדו ${badOnes.length} ` +
           'טענות שהתהפכו והצפוי אפס. מרחיבים את סימני השומר לשם שבו הוא נכתב');
  }
}

if (failures) { console.error(`\n❌ ${APP.app}: ${failures} טענות נכשלו`); process.exitCode = 1; }
else console.log(`\n✓ ${APP.app}: חודש שלא הושלם אינו נסגר`);
