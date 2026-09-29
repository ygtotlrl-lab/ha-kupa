// app/constants.js — הנתונים: שמות הטבלאות, המחרוזות והקבועים
import { appConfigure } from '../core/util.js';

// ── מסירת התצורה ──
// כאן הנתונים שהליבה קוראת, והחיווט — ב-main.js; הקובץ הזה נטען ראשון, לפני כל קריאה לליבה.
// העידן עולה בשינוי צורת רשומה או מפתחה, ושינוי שם טבלה הוא שינוי כזה — המראה ממופתחת בשם.
// עותק בעידן ישן אינו נדחף — הממתין בו נרשם ביומן, והוא נזרק ונמשך מלא.
var DATA_ERA = 6;

appConfigure({ DATA_ERA: DATA_ERA });

var SUPABASE_URL = self.APP.supabase.url;

var SUPABASE_ANON_KEY = self.APP.supabase.key;

var EPS = 0.005;

// ── הודעות ──
var MSG_OPENER = 'אין עוד מלבדו!';

var MSG_CLOSER = 'יחי אדוננו מורנו ורבינו מלך המשיח לעולם ועד';

var MSG_TZ_BLESS = 'גדולה צדקה שמקרבת את הגאולה';

var MSG_NEED_AMOUNT = '⚠️ הסכום חסר — נא להזין סכום לרישום';

var MSG_NEED_DESC = '⚠️ נא למלא פירוט';

var MSG_SLIDE_KUPA = 'החלק את המטבע לקופה';

var MSG_SLIDE_WALLET = 'החלק את המטבע לארנק';

var MSG_SLIDE_SUB = 'לאישור הפעולה';

var MSG_DEL_PRE = 'למחוק את «';

var MSG_DEL_POST = '»?';

var MSG_UNDO = 'בטל';

var MSG_DELETED = 'נמחק';

var MSG_EMPTY_PRE = 'חודש טוב! עוד לא נרשם כלום ב-';

var MSG_SUM_INCOME = 'הכנסות החודש';

var MSG_SUM_TZEDAKAH = 'צדקה החודש';

var MSG_SUM_SELF = 'אישית · ';

var MSG_SUM_OTHERS = 'לאחרים · ';

// כותרת אחידה בשני הרכיבים — שני ניסוחים לאותו מספר נקראים כשני מושגים.
var MSG_LEFT_SUM = 'סכום שנשאר: ';

var MSG_PART_MONTH = 'החודש ';

var MSG_PART_CARRY = 'יתרה ';

var MSG_ADD_INCOME = 'הכנסה';

var MSG_ADD_TZEDAKAH = 'צדקה';

var MSG_ORDERS_TITLE = 'הוראות קבע';

var MSG_SETTINGS_TITLE = 'הגדרות';

var MSG_BACK = 'חזרה';

var MSG_EDIT = 'עריכה';

var MSG_ORDER_NEW = 'הוראת קבע חדשה';

var MSG_ORDER_FROM = 'חודש תחילת פעילות';

var MSG_WAY_INCOME = 'אופני הכנסה';

var MSG_WAY_TZEDAKAH = 'אופני צדקה';

var MSG_WAY_NEW = 'אופן חדש';

var MSG_WAY_LABEL = 'שם האופן';

var MSG_NEED_LABEL = '⚠️ נא למלא שם לאופן';

var MSG_NO_ORDERS = 'עוד לא נרשמה הוראת קבע';

var MSG_ARCH_EMPTY = 'אין כאן עדיין כלום';

var MSG_WAY_DUP = '⚠️ אופן בשם הזה כבר קיים';

var MSG_PLEDGE_EDIT = 'יעד הפלעדזש · ';

var MSG_NEED_DAY = '⚠️ יום החיוב חסר — נא להזין מספר בין 1 ל-30';

// ── תצורה ──
// טבלה שנכתבת מקומית ואינה ב-PUSH_TABLES — שורותיה אינן עולות לעולם; והאב לפני הבן, אחרת הבן נקרא כיתום.
var KV_TABLE = 'k_settings';

var PUSH_TABLES = ['k_pledges', 'k_standing_orders',
                   'k_so_instances', 'k_entries', 'k_lookups', KV_TABLE];

// ── מטא-הטבלאות ──
// שם, מפתח ועמודת התנגשות במקום אחד — שם שנכתב פעמיים מתפצל ביום שאחד האתרים נערך.
var TABLES = [
  { t: 'k_pledges',         key: 'client_id' },
  { t: 'k_standing_orders', key: 'client_id' },
  { t: 'k_so_instances',   key: 'client_id' },
  { t: 'k_entries',        key: 'client_id' },
  { t: 'k_lookups',        key: 'client_id' },
  { t: KV_TABLE,           key: 'key' }
];

// ── קבועים משותפים ──
var K_CAT_SELF = 'אישי';

// חודש שטרם הגיע מציג פסים ריקים, ונקרא כחודש שלא עמדנו בו.
// תשרי תשפ״ז הוא החודש שממנו האפליקציה מנהלת, ואין רשומות שקודמות לו.
var ARCH_FIRST = '5787-01';

var SRC_DEFAULT = ['מזומן', 'ביט', 'אשראי מענדי', 'אשראי חני', 'העברה', 'אחר'];

var METHOD_DEFAULT = ['העברה ישירה', 'ביט ופייבוקס', 'מזומן', 'צ׳קים'];

var CAT_LIST = ['לאחרים', K_CAT_SELF];

// מפתח שאין לו מסך — הלחיצה עוברת והמסך אינו מתחלף.
var TABS = [
  { k: 'month',    lab: 'בית',    ic: 'home' },
  { k: 'archive',  lab: 'ארכיון', ic: 'archive' },
  { k: 'settings', lab: MSG_SETTINGS_TITLE, ic: 'gear' }
];

export { ARCH_FIRST, CAT_LIST, EPS, KV_TABLE, K_CAT_SELF, METHOD_DEFAULT,
         MSG_ADD_INCOME, MSG_ADD_TZEDAKAH, MSG_ARCH_EMPTY, MSG_BACK, MSG_CLOSER,
         MSG_DELETED, MSG_DEL_POST, MSG_DEL_PRE, MSG_EDIT, MSG_EMPTY_PRE, MSG_LEFT_SUM,
         MSG_NEED_AMOUNT, MSG_NEED_DAY, MSG_NEED_DESC, MSG_NEED_LABEL, MSG_NO_ORDERS,
         MSG_OPENER, MSG_ORDERS_TITLE, MSG_ORDER_FROM, MSG_ORDER_NEW, MSG_PART_CARRY,
         MSG_PART_MONTH, MSG_PLEDGE_EDIT, MSG_SETTINGS_TITLE, MSG_SLIDE_KUPA,
         MSG_SLIDE_SUB, MSG_SLIDE_WALLET, MSG_SUM_INCOME, MSG_SUM_OTHERS, MSG_SUM_SELF,
         MSG_SUM_TZEDAKAH, MSG_TZ_BLESS, MSG_UNDO, MSG_WAY_DUP, MSG_WAY_INCOME,
         MSG_WAY_LABEL, MSG_WAY_NEW, MSG_WAY_TZEDAKAH, PUSH_TABLES, SRC_DEFAULT,
         SUPABASE_ANON_KEY, SUPABASE_URL, TABLES, TABS };
