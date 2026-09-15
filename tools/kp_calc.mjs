/*  ליבת החישוב של «הקופה» — ⛔ אף סיכום אינו נשמר: ⚠️ כל מספר כאן נגזר
 *  מהרישומים בזמן קריאה, ⭐ וזו הסיבה לאפליקציה — בגיליון, טעות בטבת
 *  נגררה חצי שנה. ⛔ ואין כאן קריאה למסד ואין `.rpc` — ⚠️ חישוב בשרת
 *  שובר אופליין ⛔ ואינו נסרק. */
/*  ⛔ הקובץ הזה אינו אוכף שורה בטבלת התשתית — ⚠️ הצהרה ריקה ולא היעדר:
 *  ⛔ מודול בלי הצהרה אינו נבדל ממודול שההצהרה שלו נשמטה. */
export const ROWS = [];

export const KP_CHUMASH_RATE = 0.2;
export const KP_CAT_SELF = 'אישי';

const sum = (a) => a.reduce((s, x) => s + x, 0);
const live = (rows) => rows.filter((r) => !r.deleted);

export function kpIncome(rows)   { return sum(live(rows).filter((r) => r.type === 'income').map((r) => +r.amount || 0)); }
export function kpTzedakah(rows) { return sum(live(rows).filter((r) => r.type === 'tzedakah').map((r) => +r.amount || 0)); }
export function kpChumash(income) { return income * KP_CHUMASH_RATE; }

/*  ⛔ שתי הקטגוריות נספרות שווה — ⚠️ ההפרדה לתצוגה בלבד, ⭐ והאחוז
 *  הוא סימון ויזואלי: ⛔ אין חסימה, ואחוז מלא לאחרים תקין. */
export function kpSelfPct(rows) {
  const tz = kpTzedakah(rows);
  if (!tz) return 0;
  const self = sum(live(rows).filter((r) => r.type === 'tzedakah' && r.category === KP_CAT_SELF)
                             .map((r) => +r.amount || 0));
  return self / tz * 100;
}

/*  ⛔ השרשרת מצטברת לאורך כל חיי האפליקציה — ⚠️ גם בין שנים: ⭐ יתרת אלול
 *  היא יתרת הפתיחה של תשרי הבא, ⛔ ויתרת פתיחה מוצהרת רק לשנה הראשונה.
 *  ⚠️ **ורק עודף עובר** — ⛔ לעולם לא חוב: ⭐ הפלעזדש הוא מינימום חודשי,
 *  והחומש הוא המצטבר. */
export function kpChain(months, opts) {
  const pleziashOf = opts.pleziashOf;      /* שנה ⟵ מינימום חודשי */
  let balance = opts.opening || 0;         /* יתרה מול חומש, מצטברת */
  let carry = 0;                           /* עודף פלעזדש מחודש קודם */
  const out = [];
  for (const m of months) {
    const income = kpIncome(m.rows);
    const tzedakah = kpTzedakah(m.rows);
    const chumash = kpChumash(income);
    const pleziash = pleziashOf(m.year);
    const prevBalance = balance;
    balance = prevBalance + tzedakah - chumash;
    const carryIn = carry;
    const fill = tzedakah + carryIn;
    const short = Math.max(0, pleziash - fill);
    carry = Math.max(0, tzedakah + carryIn - pleziash);
    out.push({ key: m.key, year: m.year, income, tzedakah, chumash, pleziash,
               prevBalance, balance, carryIn, fill, short,
               done: short === 0, carryOut: carry, selfPct: kpSelfPct(m.rows) });
  }
  return out;
}
