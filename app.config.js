/* ═══ app.config.js — תצורת האפליקציה ════════════════════════════════════
   ⛔ המקום היחיד של ערכי האפליקציה — ⚠️ הדפדפן טוען אותו בתג, ה-service
      worker ב-`importScripts`, והכלים ב-`tools/gen-app.mjs`: ⭐ ערך שכתוב
      במקום שני הוא שני מקורות שמתיישנים זה מול זה.
   ⛔ קובצי הפלטפורמה נוצרים מכאן — ⚠️ `node tools/gen-app.mjs`, ⭐ ומי שעורך
      אותם ביד נדרס בהרצה הבאה.
   ════════════════════════════════════════════════════════════════════ */
self.APP = Object.freeze({
  /*  ⛔ שם הריפו — ⚠️ ממנו נגזרים ה-scope, קידומת המטמון ושם הפרויקט באנדרואיד. */
  id: 'ha-kupa',
  name: 'הקופה',
  shortName: 'הקופה',
  description: 'מעקב חומש ופלעדזש — צדקה, הכנסות והוראות קבע.',
  /*  ⛔ תחילית הטבלאות והאחסון — ⚠️ כל אות בה פותחת מילה בשם הריפו, בסדר. */
  prefix: 'k_',
  colors: { theme: '#9C7FD0', background: '#F6F2FA' },
  /*  ⚠️ דף האופליין של ה-service worker — ⭐ רקע ודיו לכל מצב, והסמל:
      ⛔ הכהה הוא אסימוני הערכה הכהה של האפליקציה. */
  offline: { light: { bg: '#F6F2FA', ink: '#352B3F' }, dark: { bg: '#1B1420', ink: '#EFE8F5' }, mark: '📴' },
  /*  ⚠️ המפתח הוא מפתח `anon` ציבורי — ⛔ ולא מפתח שירות: ההרשאות במסד. */
  supabase: {
    url: 'https://zrftjkghhjhqzopvdzou.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyZnRqa2doaGpocXpvcHZkem91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzMDc4MzQsImV4cCI6MjEwMDg4MzgzNH0.DWcW3o4Y9Is3jGx1frHkrUz7cc045aH1m1uKsrwRhIA'
  },
  android: {
    package: 'com.ha.kupa',
    /*  ⛔ הכתובת שהמעטפת טוענת — ⚠️ וממנה נגזר המקור היחיד שגשר השיתוף מקבל. */
    url: 'https://ygtotlrl-lab.github.io/ha-kupa/',
    /*  ⚠️ המשפט שלם ⛔ ולא שם בלבד — ⭐ הפועל מתאים למין השם. */
    offlineLine: 'הקופה לא הצליחה להתחבר.',
    /*  ⚠️ צבע כפתור הניסיון החוזר בדף האופליין של המעטפת. */
    accent: '#9c7fd0',
    /*  ⛔ `versionCode` לעולם אינו יורד, ⚠️ ומקודם בכל שינוי בקובץ שנכנס ל-APK —
        ⭐ בלי קידום המכשיר המותקן אינו מקבל את ה-APK החדש. */
    versionCode: 8,
    versionName: '2.0',
    launcherBg: { kind: 'solid', color: '#9C7FD0' },
    /*  ⚠️ גשר השיתוף — ⭐ `FileProvider` ו-`androidx`, רק באפליקציה שמייצאת קובץ. */
    share: false
  },
  /*  ⛔ טביעת מפתח החתימה הקבוע — ⚠️ `sign-apk.sh` מסרב לחתום בכל מפתח אחר. */
  signSha256: '3C:25:41:21:83:93:BB:37:ED:7D:89:2E:8F:1F:02:18:EF:BE:B2:CA:EA:0D:06:D4:91:2B:C8:19:94:22:0C:9D',
  /*  ⛔ נכסי האייקון — ⚠️ `tools/gen-icons.mjs` קורא אותם. */
  icon: {
    /*  ⛔ הצורה מוצהרת, ⛔ ותואמת את סיומת המאסטר — ⚠️ `svg` הוא
        מאסטר גיאומטרי שנקרא ונצבע, ⭐ ו-`master` הוא ציור רסטרי שהוקטן. */
    art: 'svg',
    master: 'design/icon-master.svg',
    /*  ⛔ חמשת השדות ריקים ⛔ ואינם נשמטים — ⚠️ המאסטר הגיאומטרי נושא בעצמו
        את הרקע, את הדיו ואת תיבת הסמל: ⭐ שדה חסר נקרא «לא נשאל», וריק נקרא
        «נמדד ואין». */
    ink: null,
    bg: null,
    mark: null,
    bgKey: null,
    keyTol: null,
  }
});
