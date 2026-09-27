// app/state.js — המצב המשותף בין המודולים

// מצב שמודולים שונים כותבים — אובייקט אחד, כי קישור מיובא אינו ניתן להשמה.
export const S = {
  sb: null,
  // העד נכתב רק אחרי דחיפה שחזרה ok — עד שמתעדכן גם במשיכה מוחק מהדיסק רשומה שמעולם לא עלתה.
  _kPushedAt: {},
  _kSeenTs: null,
  _lastSeenOk: 0,
  _kPushEp: 0,
  _syncBusy: false,
  _kPullLogged: false
};
