# הקופה — Native WebView APK

מעטפת אנדרואיד מקורית מבוססת **WebView** — **לא TWA**. היא טוענת את האתר החי:

```
https://ygtotlrl-lab.github.io/ha-kupa/
```

## מה בפנים

| | |
|---|---|
| **Package ID** | `com.ha.kupa` — זהה ל-TWA שהוא מחליף (חובה, אחרת זו אפליקציה נפרדת) |
| **שם** | הקופה |
| **טוען** | `https://ygtotlrl-lab.github.io/ha-kupa/` — מהרשת, לא מנכסים מוטבעים |
| **versionCode** | 4 — קודם בסבב 148 (המאסטר `design/icon-master.svg` הוא מקור האייקון: המחולל קורא אותו וגוזר ממנו, ו-16 הנכסים נוצרו מחדש). 2 — קודם בסבב 147 (שם האפליקציה במעטפת וגוון הזהות יושרו לאפליקציה הזו). 1 — המעטפת הראשונה. ⛔ versionCode לעולם אינו יורד — מספר נמוך ממה שמותקן במכשיר חוסם את העדכון |
| **minSdk / targetSdk** | 21 / 34 |
| **WebView** | JavaScript, DOM storage (localStorage — שם יושב ה-session), DB |
| **סכמות שאינן http** | נמסרות למערכת ב-`ACTION_VIEW`. כל `http`/`https` נשאר בתוך המעטפת |
| **בורר קבצים** | `WebChromeClient.onShowFileChooser` מחובר ל-`<input type=file>` |
| **אופליין** | ה-service worker של האתר. המעטפת מציגה דף שגיאה בעברית רק בהפעלה ראשונה בלי רשת |

<!-- SHARED:start id="android-web-update" -->
**עדכוני קוד web לא מצריכים APK חדש.** כל דחיפה ל-`main` מגיעה למכשירים דרך
אותו מנגנון service worker + באנר "גרסה חדשה זמינה" שכבר עובד בדפדפן. APK חדש
נדרש רק כששינוי נוגע במעטפת עצמה.
<!-- SHARED:end -->

<!-- SHARED:start id="android-origin-switch" -->
## ⚠️ מעבר-origin חד-פעמי — ולפני כל הפצת APK

ה-WebView של האפליקציה מחזיק **מחיצת אחסון משלו**, נפרדת מזו של הדפדפן באותו
מכשיר. מי שעבד עד עכשיו בדפדפן ועובר ל-APK מתחיל עם localStorage **ריק**:
כניסה מחדש, והעותק המקומי נטען מהענן — שהוא ממילא מקור האמת.

⛔ **מה שכן יכול ללכת לאיבוד: רשומה שנרשמה במכשיר וטרם עלתה לענן.** לכן —
**לפני כל הפצת APK, ודא בכל מכשיר שההגדרות ← «⏳ ממתין לסנכרון» מציג 0.**
רשומה שמסומנת ⏳ יושבת רק באותה מחיצת אחסון, ומעבר ה-origin ישאיר אותה מאחור.

⚠️ **ואותו מעבר קורה גם בהחלפת חתימה, לא רק בהחלפת origin:** התקנה ראשונה של
בנייה שנחתמה במפתח קבוע חדש מחייבת **הסרה חד-פעמית** של האפליקציה הישנה
(חתימה שונה ⇒ אנדרואיד רואה אפליקציה זרה ⇒ `INSTALL_FAILED_UPDATE_INCOMPATIBLE`),
וההסרה מוחקת את מחיצת האחסון שלה. מאותה נקודה ואילך ההתקנות חלקות.
⛔ **גם כאן «⏳ ממתין לסנכרון» נבדק לפני ההסרה ולא אחריה** — אחריה כבר אין מה
לבדוק.
<!-- SHARED:end -->

<!-- SHARED:start id="android-icons" -->
## אייקונים

אייקוני המעטפת יושבים ב-`android/app/src/main/res/` — **עשרה קובצי `mipmap`**
(`ic_launcher.png` ו-`ic_launcher_foreground.png` בכל אחת מחמש הרזולוציות)
ו**קובץ XML אדפטיבי אחד**, `mipmap-anydpi-v26/ic_launcher.xml`, שהרקע שלו הוא
`res/drawable/ic_launcher_background.xml`.
⭐ **נמדד בכל הריפו — אותו מבנה בדיוק בכולן.**

⛔ **אין לערוך את קובצי ה-`mipmap` ידנית** — כולם נגזרים ממקור גרפי אחד, וכל
עריכה ידנית היא גרסה שנייה שתידרס בגזירה הבאה בלי שאיש יידע.
⚠️ **המקור עצמו נבדל פר-אפליקציה**, והוא מתועד בשורה שמתחת.
<!-- SHARED:end -->
### הסט כאן
`node tools/gen-icons.mjs` מייצר את כל ה-PNG-ים מחישוב פיקסלים (ללא
ספריות), לשני יעדים: `icons/` (PWA ופאביקון) ו-`android/app/src/main/res/
mipmap-*/` — `ic_launcher.png` ו-`ic_launcher_foreground.png` (הסימן בלבד
על רקע שקוף; הרקע מ-`ic_launcher_background.xml`), עם `pad` שמכניס את
החזית לאזור הבטוח של 66dp מתוך 108dp.
⛔ **אין לערוך את הקבצים ידנית** — משנים את הסקריפט ומריצים מחדש. הוא
דטרמיניסטי: הרצה חוזרת בלי שינוי קוד מייצרת קבצים זהים בית-לבית.

⚠️ **המאסטר הוא `design/icon-master.svg`** — ⛔ המחולל קורא אותו וגוזר ממנו את 16 הנכסים,
⚠️ ואין נכס שנערך ביד: ⭐ והצורה מוצהרת ב-`APP.art` שבמחולל.

<!-- SHARED:start id="android-shell-split" -->
## המעטפת — ליבה משותפת ומעטפת פר-אפליקציה (סבב 41)

`MainActivity.java` היה עד סבב 41 **עותקים חופשיים** של אותה מעטפת:
hanhala ו-schar כמעט זהות בית-לבית, gius נבדלת בניסוח, ו-yoman כפולה בגלל
גשר השיתוף. שער החתימה של סבב 40 הקפיא את המצב, ⛔ אך לא איחד אותו.

מעכשיו הקוד מפוצל לשניים:

| קובץ | מה יש בו |
|---|---|
| `ShellActivity.java` | **הליבה המשותפת** — הגדרות ה-WebView, בורר הקבצים, `shouldOverrideUrlLoading`, דף האופליין, כפתור החזרה ושמירת המצב. ⭐ **זהה בית-לבית בכל הריפו** פרט לשורת ה-`package`. |
| `MainActivity.java` | **זהות בלבד** — הכתובת, משפט האופליין וצבע הכפתור, דרך שלוש מתודות. |

⛔ **אין להוסיף לוגיקה ל-`MainActivity`** (סבב 41) — התנהגות שנוספת
לאפליקציה אחת בלבד מחזירה בדיוק את כל העותקים שהחילוץ החליף. מה שנחוץ
לכולן נכנס ל-`ShellActivity`; מה שנחוץ לאחת עובר דרך שתי הווים שהליבה
חושפת — `installBridge()` ו-`onShellNavigation(String)` — ונרשם כחריגה
מנומקת.

⚠️ **החריגה היחידה היום היא גשר השיתוף של yoman-avoda**, והיא מדודה: הליבה
נושאת חתימה אחת בכולן (`d8efd10bc6d47354`), ורק המעטפת של yoman נבדלת.
`tools/test_shell.mjs` אוכף את שתי החתימות, ו⛔ **נכשל אם נמצא גשר
בליבה** — גשר שם היה מגיע לכל האפליקציות בבת אחת.
<!-- SHARED:end -->

## Build

### הדרך המומלצת — GitHub Actions (לא צריך שום דבר מותקן)

`.github/workflows/build-apk.yml`: Actions → **Build APK** → **Run workflow**.
ה-APK **החתום** יורד כ-artifact בשם `ha-kupa-apk`.

החתימה נעשית ב-`signing/sign-apk.sh` מול המפתח שמגיע מ-GitHub Secrets —
**ואין קלט ידני**, ולכן אין דרך לבנות בטעות APK במפתח אחר. הסקריפט
מסרב לחתום אם טביעת האצבע של ה-keystore אינה `3C:25:41:21:...:0C:9D`, ואחרי
החתימה מוודא שה-APK אכן נושא את התעודה הזו — ה-workflow נכשל בכל אחד מהמקרים.

> ⚠️ **המפתח הוחלף ב-2026-09-15 (סבב 148).** APK חדש ⛔ אינו מתקין על גבי התקנה
> שנחתמה במפתח הישן — נדרשת הסרה והתקנה מחדש, פעם אחת..

### בנייה מקומית (דורשת Android SDK + Gradle)

```bash
cd android && gradle wrapper --gradle-version 8.7 && ./gradlew :app:assembleRelease
# פלט לא חתום: android/app/build/outputs/apk/release/app-release-unsigned.apk
```

## Sign with the PERMANENT key (required so it installs over previous builds)

```bash
../signing/sign-apk.sh app/build/outputs/apk/release/app-release-unsigned.apk ha-kupa.apk
```

הסקריפט מריץ `zipalign` ואז `apksigner`, ⛔ ואוכף את טביעת האצבע לפני
ואחרי החתימה.

### פרטי המפתח הקבוע

| | |
|---|---|
| **קובץ** | ⛔ אינו בריפו — GitHub Secret `KEYSTORE_B64`, מפוענח לקובץ זמני בזמן בנייה ונמחק אחריה (PKCS12, RSA 4096) |
| **נוצר** | 2026-09-15 (סבב 148), `keytool -genkeypair` |
| **Package ID** | `com.ha.kupa` |
| **alias** | ⛔ אינו מוקלד — `sign-apk.sh` גוזר אותו מהמפתח עצמו |
| **storepass / keypass** | ⛔ אינה בריפו — GitHub Secret `KEYSTORE_PASS` |
| **תוקף** | 10,000 יום — 2026-09-15 עד 2054-01-31 |
| **SHA256** | `3C:25:41:21:83:93:BB:37:ED:7D:89:2E:8F:1F:02:18:EF:BE:B2:CA:EA:0D:06:D4:91:2B:C8:19:94:22:0C:9D` |
| **SHA1** | `D9:EC:74:83:F5:A8:B3:1D:41:EB:1E:C1:73:96:DE:C4:AD:87:3B:3A` |
| **DN** | `CN=ha-kupa, OU=Yeshiva, O=Yeshiva, L=Rishon LeZion, ST=Israel, C=IL` |

### פרטי המעטפת
`applicationId` חייב להישאר `com.ha.kupa`, ו-`versionCode` גבוה מזה של
ה-TWA שהוחלף (ה-TWA היה 1; המעטפת היא 2).

⚠️ **בסביבת הענן אין Android SDK ו-`dl.google.com` חסום** — הדרך המעשית
היא ה-workflow. ⛔ ולא PWABuilder: הוא יודע לייצר TWA בלבד.

<!-- SHARED:start id="android-smali-scope" -->
## תיקון URL ב-APK קיים ובנוי (בלי מקור) — smali בלבד

⚠️ **הפרק הזה רלוונטי רק ל-APK ישן שנבנה לפני `android/`.** בנייה רגילה היום
היא מ-`android/` דרך `.github/workflows/build-apk.yml`, והמעטפת טוענת מהרשת —
ולכן אין בה URL שצריך לתקן.
⛔ **smali בלבד — לא binary patch.** עריכה בינארית של ה-APK שוברת את החתימה
ואינה ניתנת לאימות, ⛔ והחתימה מחדש היא במפתח הקבוע של הריפו בלבד — ר' הפרק
«Sign with the PERMANENT key» שלמעלה.
⭐ **שני הקבצים שנושאים את ה-URL הם `MainActivity.smali` ו-`MainActivity$2.smali`**
— ⛔ וההוראה זהה בכל הריפו; הכתובת עצמה, שם תיקיית העבודה והמפתח הם
פר-אפליקציה, ⛔ ויושבים בבלוק שמתחת.
<!-- SHARED:end -->

```bash
apktool d <app>.apk -o /tmp/hakupa_work -f
rm -rf /tmp/hakupa_work/build          # חובה לפני בנייה חוזרת
apktool b /tmp/hakupa_work -o built.apk
zipalign -f 4 built.apk aligned.apk
SIGN_KEYSTORE=<עותק מקומי של המפתח> SIGN_PASS=<הערך שב-KEYSTORE_PASS> \
  signing/sign-apk.sh aligned.apk output.apk
```

⭐ **וכל חתימה היא ב-`signing/kupa.keystore`** — ⛔ הקובץ אינו בריפו,
⚠️ והוא נמשך מ-GitHub Secrets בזמן הבנייה.

<!-- SHARED:start id="android-cache-apk" -->
### ⚠️ Cache APK — כלל זהב

שם קובץ חוזר נתפס במטמון — של הדפדפן, של מנהל ההורדות ושל המכשיר — והמשתמש
מתקין שוב את הבנייה **הקודמת** בלי לדעת. ⛔ **תמיד שם חדש בכל בנייה**, עם
חותמת זמן:
<!-- SHARED:end -->

```bash
TS=$(date +%s) && apksigner sign ... --out ha-kupa-${TS}.apk
```
