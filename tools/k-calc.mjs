/*  ליבת החישוב של «הקופה» — ⛔ אף סיכום אינו נשמר: ⚠️ כל מספר כאן נגזר
 *  מהרישומים בזמן קריאה, ⭐ וזו הסיבה לאפליקציה — בגיליון, טעות בטבת
 *  נגררה חצי שנה. ⛔ ואין כאן קריאה למסד ואין `.rpc` — ⚠️ חישוב בשרת
 *  שובר אופליין ⛔ ואינו נסרק. */
/*  ⛔ הקובץ הזה אינו אוכף שורה בטבלת התשתית — ⚠️ הצהרה ריקה ולא היעדר:
 *  ⛔ מודול בלי הצהרה אינו נבדל ממודול שההצהרה שלו נשמטה. */
export const ROWS = [];

export const K_CHUMASH_RATE = 0.2;
export const K_CAT_SELF = 'אישי';

const sum = (a) => a.reduce((s, x) => s + x, 0);
const live = (rows) => rows.filter((r) => !r.deleted);

export function kIncome(rows)   { return sum(live(rows).filter((r) => r.type === 'income').map((r) => +r.amount || 0)); }
export function kTzedakah(rows) { return sum(live(rows).filter((r) => r.type === 'tzedakah').map((r) => +r.amount || 0)); }
export function kChumash(income) { return income * K_CHUMASH_RATE; }

/*  ⛔ שתי הקטגוריות נספרות שווה — ⚠️ ההפרדה לתצוגה בלבד, ⭐ והאחוז
 *  הוא סימון ויזואלי: ⛔ אין חסימה, ואחוז מלא לאחרים תקין. */
export function kSelfPct(rows) {
  const tz = kTzedakah(rows);
  if (!tz) return 0;
  const self = sum(live(rows).filter((r) => r.type === 'tzedakah' && r.category === K_CAT_SELF)
                             .map((r) => +r.amount || 0));
  return self / tz * 100;
}

/*  ⛔ השרשרת מצטברת לאורך כל חיי האפליקציה — ⚠️ גם בין שנים: ⭐ יתרת אלול
 *  היא יתרת הפתיחה של תשרי הבא, ⛔ ויתרת פתיחה מוצהרת רק לשנה הראשונה.
 *  ⚠️ **ורק עודף עובר** — ⛔ לעולם לא חוב: ⭐ הפלעדזש הוא מינימום חודשי,
 *  והחומש הוא המצטבר. */
export function kChain(months, opts) {
  const pledgeOf = opts.pledgeOf;      /* שנה ⟵ מינימום חודשי */
  let balance = opts.opening || 0;         /* יתרה מול חומש, מצטברת */
  let carry = 0;                           /* עודף פלעדזש מחודש קודם */
  const out = [];
  for (const m of months) {
    const income = kIncome(m.rows);
    const tzedakah = kTzedakah(m.rows);
    const chumash = kChumash(income);
    const pledge = pledgeOf(m.year);
    const prevBalance = balance;
    balance = prevBalance + tzedakah - chumash;
    const carryIn = carry;
    const fill = tzedakah + carryIn;
    const short = Math.max(0, pledge - fill);
    carry = Math.max(0, tzedakah + carryIn - pledge);
    out.push({ key: m.key, year: m.year, income, tzedakah, chumash, pledge,
               prevBalance, balance, carryIn, fill, short,
               done: short === 0, carryOut: carry, selfPct: kSelfPct(m.rows) });
  }
  return out;
}
