# הקופה

אפליקציית PWA לניהול צדקה. עברית מלאה, RTL, מותאמת למובייל.

**https://ygtotlrl-lab.github.io/ha-kupa/**

## הפעלה ראשונה

1. הריצו את `migrations/000_initial_schema.sql` מול פרויקט ה-Supabase
   דרך ה-SQL Editor. הקובץ אידמפוטנטי.
2. הריצו את המיגרציות שאחריו לפי סדרן.
3. הזינו את השנה, חודשיה והפלעזדש ב-SQL Editor — ⛔ אין מסך שיוצר אותם.

## מסכים

- **החודש** — הכנסות, כרטיס החומש, כרטיס הפלעזדש, ופירוט הרישומים.
- **רישום** — מסך אחר מסך, שדה אחד בכל פעם, ואישור בהחלקת מטבע.
- **הגדרות** — הוראות קבע, רשימת המקורות, סדרת החודשים מול היעד, ומתג
  המשוב החושי.

## פיתוח

הכל בקובץ אחד: `index.html`. אין build.

```bash
node tools/check-js.mjs          # מהירה — בזמן העבודה
node tools/check-js.mjs --full   # מלאה — חובה לפני כל push
node tools/gen-icons.mjs   # מחדש את האייקונים (PWA + APK)
```

<!-- SHARED:start id="readme-gate" -->
השער מחלץ את ה-JS המוטבע מ-`index.html`, מריץ `node --check` עליו ועל `sw.js`,
ומריץ את כל שערי האחידות ואת חבילות בדיקות הסבבים.
<!-- SHARED:end -->

⚠️ קידום `CACHE_NAME` ב-`sw.js` הוא חובה בכל שינוי קוד — בלי זה המשתמשים
ממשיכים לקבל את הקליפה הישנה מהמטמון.

<!-- SHARED:start id="readme-apk" -->
## APK

מעטפת אנדרואיד מסוג **WebView** (⛔ לא TWA) ב-[`android/`](android/README.md),
שטוענת את כתובת ה-Pages מהרשת. בנייה: Actions → **Build APK** → Run workflow.
שחרור קוד web אינו מצריך APK חדש.

<!-- SHARED:end -->