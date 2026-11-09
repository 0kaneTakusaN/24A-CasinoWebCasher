// ===== アプリ設定 =====
// Google Apps Script をウェブアプリとしてデプロイした URL を貼り付けてください。
// 例: 'https://script.google.com/macros/s/XXXXXXXXXXXX/exec'
//
// 空のままだと、localhost で開いたときだけ「デモモード」（ログイン: demo / demo、
// データはこのPCのブラウザ内のみ）で動きます。GitHub Pages 上では動作しません。
window.APP_CONFIG = {
  GAS_URL: 'https://script.google.com/macros/s/AKfycbyidFYHepTH_IHs1uUTesN71ObdQgDdw1OtIy4aQbBX1OTYIk2Pl3Gl1X3CKMsPXRJb/exec',
  // ログ送信のタイムアウト（ミリ秒）
  REQUEST_TIMEOUT_MS: 15000,
  // 未送信ログの自動再送間隔（ミリ秒）
  RETRY_INTERVAL_MS: 30000,
  // カートが空のときにメニューを自動再読込する間隔（ミリ秒）
  MENU_REFRESH_MS: 5 * 60 * 1000
};
