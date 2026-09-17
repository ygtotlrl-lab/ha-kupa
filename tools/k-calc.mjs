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

/*  ⛔ השרשרת מצטברת לאורך כל חיי האפליקציה — ⚠️ **שני חישובים נפרדים על
 *  אותה צדקה**: ⭐ החומש הוא חלק מההכנסות בפועל, ⛔ והפלעדזש הוא סכום
 *  שנקבע מראש לשנה וחוזר בכל אחד מחודשיה.
 *  ⛔ **ושניהם מעבירים יתרה — זכות וחובה כאחת** — ⚠️ מה שנשאר בסוף חודש
 *  הוא הפתיחה של הבא: ⭐ רצפה שמעבירה עודף בלבד מוחקת חוב שאיש לא מחל עליו.
 *  ⛔ **וההבדל היחיד הוא ראש השנה העברית** — ⚠️ הפלעדזש מתאפס שם, ⭐ שהוא
 *  החלטה שנתית חדשה; ⛔ והחומש אינו מתאפס, ⚠️ שבו אנו חייבים תמיד.
 *  ⛔ **וחודש שטרם הגיע אינו נושא יתרת פלעדזש** — ⚠️ הוא מציג את הסכום
 *  השנתי שחוזר: ⭐ היתרה נקבעת מסוף מצב החודש שנסגר, ⛔ וחודש שלא נסגר
 *  אין לו מה להוריש. */
export function kChain(months, opts) {
  const pledgeOf = opts.pledgeOf;      /* שנה ⟵ הסכום החודשי שחוזר */
  /*  ⛔ המפתח של החודש הנוכחי — ⚠️ כל מפתח שגדול ממנו הוא חודש שטרם הגיע:
   *  ⭐ והוא מוצהר ריק כשאין הכרעה כזו, ⛔ ואז כל החודשים משרשרים. */
  const now = opts.now == null ? '' : String(opts.now);
  let balance = opts.opening || 0;     /* יתרת החומש, מצטברת חוצה שנים */
  let pBalance = 0;                    /* יתרת הפלעדזש, מתאפסת בראש השנה */
  let prevYear = null;
  const out = [];
  for (const m of months) {
    const income = kIncome(m.rows);
    const tzedakah = kTzedakah(m.rows);
    const chumash = kChumash(income);
    const pledge = pledgeOf(m.year);
    const future = now !== '' && String(m.key) > now;

    /*  ⛔ החומש — ⚠️ החובה הכוללת היא חומש החודש פחות יתרת הזכות שנשארה:
     *  ⭐ יתרה חיובית היא זכות ומקטינה, ⛔ ושלילית היא חוב ומגדילה. */
    const prevBalance = balance;
    const chumashCarry = -prevBalance;
    const chumashDue = chumash + chumashCarry;
    const chumashLeft = chumashDue - tzedakah;
    balance = -chumashLeft;

    /*  ⛔ הפלעדזש — ⚠️ אותה צורה בדיוק, ⭐ ושני הבדלים: ⛔ היתרה מתאפסת
     *  בראש השנה, ⚠️ וחודש שטרם הגיע אינו נושא יתרה כלל. */
    const yearTurn = prevYear !== null && String(m.year) !== prevYear;
    const pledgeOpen = (yearTurn || future) ? 0 : pBalance;
    const pledgeCarry = -pledgeOpen;
    const pledgeDue = pledge + pledgeCarry;
    const pledgeLeft = pledgeDue - tzedakah;
    pBalance = future ? 0 : -pledgeLeft;
    prevYear = String(m.year);

    out.push({ key: m.key, year: m.year, income, tzedakah, chumash, pledge,
               prevBalance, balance, chumashCarry, chumashDue, chumashLeft,
               pledgeOpen, pledgeBalance: -pledgeLeft, pledgeCarry, pledgeDue, pledgeLeft,
               selfPct: kSelfPct(m.rows) });
  }
  return out;
}
