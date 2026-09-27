// app.config.js — תצורת האפליקציה
self.APP = Object.freeze({
  // ממנו נגזרים ה-scope, קידומת המטמון ושם הפרויקט באנדרואיד
  id: 'ha-kupa',
  name: 'הקופה',
  shortName: 'הקופה',
  description: 'מעקב חומש ופלעדזש — צדקה, הכנסות והוראות קבע.',
  prefix: 'k_',
  colors: { theme: '#9C7FD0', background: '#F6F2FA' },
  // דף האופליין של ה-service worker — הכהה לפי אסימוני הערכה הכהה של האפליקציה
  offline: { light: { bg: '#F6F2FA', ink: '#352B3F' }, dark: { bg: '#1B1420', ink: '#EFE8F5' }, mark: '📴' },
  // מפתח anon ציבורי ולא מפתח שירות — ההרשאות נאכפות במסד.
  supabase: {
    url: 'https://zrftjkghhjhqzopvdzou.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyZnRqa2doaGpocXpvcHZkem91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzMDc4MzQsImV4cCI6MjEwMDg4MzgzNH0.DWcW3o4Y9Is3jGx1frHkrUz7cc045aH1m1uKsrwRhIA'
  },
  android: {
    package: 'com.ha.kupa',
    // ממנה נגזר המקור היחיד שגשר השיתוף מקבל
    url: 'https://ygtotlrl-lab.github.io/ha-kupa/',
    // משפט שלם ולא שם בלבד — הפועל מתאים למין השם
    offlineLine: 'הקופה לא הצליחה להתחבר.',
    // צבע כפתור הניסיון החוזר בדף האופליין של המעטפת
    accent: '#9c7fd0',
    // לעולם אינו יורד — בלי קידום המכשיר המותקן אינו מקבל את ה-APK החדש.
    versionCode: 10,
    versionName: '2.0',
    launcherBg: { kind: 'solid', color: '#9C7FD0' },
    // FileProvider ו-androidx — רק באפליקציה שמייצאת קובץ
    share: false
  },
  // sign-apk.sh מסרב לחתום בכל מפתח אחר
  signSha256: '3C:25:41:21:83:93:BB:37:ED:7D:89:2E:8F:1F:02:18:EF:BE:B2:CA:EA:0D:06:D4:91:2B:C8:19:94:22:0C:9D',
  icon: {
    // svg הוא מאסטר גיאומטרי שנקרא ונצבע, ו-master רסטרי הוא ציור שהוקטן — ותואם את סיומת המאסטר.
    art: 'svg',
    master: 'design/icon-master.svg',
    // ריקים ולא נשמטים — המאסטר הגיאומטרי נושא בעצמו את הרקע, הדיו ותיבת הסמל; שדה חסר נקרא לא נשאל.
    ink: null,
    bg: null,
    mark: null,
    bgKey: null,
    keyTol: null,
  }
});
