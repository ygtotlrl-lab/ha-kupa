// app/state.js — המצב המשותף בין המודולים

// מצב שמודולים שונים כותבים — אובייקט אחד, כי קישור מיובא אינו ניתן להשמה.
const S = {
  sb: null,
  _kSeenTs: null,
  _lastSeenOk: 0,
  _syncBusy: false,
  _kPullLogged: false
};

// ── מצב הריצה ──
// אין כאן סיכום שמור ואין עותק של הטבלאות — העותק המקומי הוא MIRROR, ושם שני לו הוא עותק שאיש אינו מסנכרן.
var view = { screen: 'month', monthKey: null, flow: null, step: 0, draft: null,
             lookOpen: null, archYear: null };

// ── מה שמסך צריך מ-main ──
// main רושם כאן בעלייה — מודול שמייבא מ-main סוגר מעגל, והרישום הוא הכיוון האחד.
const shell = { kRender: null };

export { S, shell, view };
