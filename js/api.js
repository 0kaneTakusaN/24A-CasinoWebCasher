// ===== バックエンド通信 =====
// 本番: Google Apps Script（認証・メニュー・ログ）
// デモ: GAS_URL 未設定かつ localhost のときだけ、ブラウザ内の擬似サーバーで動作
(function () {
  const CFG = window.APP_CONFIG;
  const isLocal = ['localhost', '127.0.0.1', '[::1]', ''].includes(location.hostname);
  const DEMO = !CFG.GAS_URL && isLocal;

  class ApiError extends Error {
    constructor(code, detail) { super(code); this.code = code; this.detail = detail; }
  }

  async function callGas(payload) {
    if (!CFG.GAS_URL) throw new ApiError('not_configured');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), CFG.REQUEST_TIMEOUT_MS);
    let res;
    try {
      // Content-Type を text/plain にすることで CORS のプリフライトを回避
      res = await fetch(CFG.GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
        redirect: 'follow'
      });
    } catch (e) {
      throw new ApiError(e.name === 'AbortError' ? 'timeout' : 'network');
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) throw new ApiError('http_' + res.status);
    let data;
    try { data = await res.json(); } catch (e) { throw new ApiError('bad_response'); }
    if (!data.ok) throw new ApiError(data.error || 'error', data.detail);
    return data;
  }

  // ---------- デモ用擬似サーバー ----------
  const demoStore = {
    get(k, d) { try { return JSON.parse(localStorage.getItem('demo_' + k)) ?? d; } catch (e) { return d; } },
    set(k, v) { localStorage.setItem('demo_' + k, JSON.stringify(v)); }
  };
  function demoSeed() {
    return {
      genres: [
        { id: 'g1', name: 'カジノ', color: '#1e7a46' },
        { id: 'g2', name: 'お菓子', color: '#d9467a' },
        { id: 'g3', name: '飲み物', color: '#2a6fd6' }
      ],
      menus: [
        { id: 'm1', name: 'チップ10枚', genreId: 'g1', icon: 'chip', price: 100, active: true },
        { id: 'm2', name: 'チップ30枚', genreId: 'g1', icon: 'chips', price: 250, active: true },
        { id: 'm3', name: 'ルーレット1回', genreId: 'g1', icon: 'roulette', price: 50, active: true },
        { id: 'm4', name: 'クッキー', genreId: 'g2', icon: 'cookie', price: 150, active: true },
        { id: 'm5', name: 'キャンディ', genreId: 'g2', icon: 'candy', price: 50, active: true },
        { id: 'm6', name: 'ポップコーン', genreId: 'g2', icon: 'popcorn', price: 200, active: false },
        { id: 'm7', name: 'ジュース', genreId: 'g3', icon: 'juice', price: 120, active: true },
        { id: 'm8', name: 'お茶', genreId: 'g3', icon: 'bottle', price: 100, active: true }
      ]
    };
  }
  async function callDemo(p) {
    await new Promise(r => setTimeout(r, 300));
    if (demoStore.get('failLog', false) && p.action === 'log') throw new ApiError('network');
    if (p.action === 'login') {
      if (p.user === 'demo' && p.pass === 'demo') return { ok: true, token: 'demo.' + (Date.now() + 14 * 3600e3), expiresInHours: 14 };
      throw new ApiError('invalid_credentials');
    }
    if (!p.token || !String(p.token).startsWith('demo.')) throw new ApiError('unauthorized');
    switch (p.action) {
      case 'getMenu': return { ok: true, data: demoStore.get('menu', null) || demoSeed() };
      case 'saveMenu': demoStore.set('menu', p.data); return { ok: true };
      case 'log': {
        const logs = demoStore.get('log', []);
        if (!logs.some(l => l.id === p.tx.id)) logs.push(p.tx);
        demoStore.set('log', logs);
        return { ok: true };
      }
      case 'ping': return { ok: true };
    }
    throw new ApiError('unknown_action');
  }

  function call(payload) { return DEMO ? callDemo(payload) : callGas(payload); }

  const ERROR_TEXT = {
    invalid_credentials: 'ユーザー名またはパスワードが違います',
    locked: 'ログイン失敗が続いたため一時ロック中です（約10分後に再試行）',
    not_configured: 'サーバー未設定です（js/config.js の GAS_URL を設定してください）',
    unauthorized: 'ログインの有効期限が切れました。再ログインしてください',
    timeout: '通信がタイムアウトしました',
    network: 'ネットワークに接続できません',
    bad_response: 'サーバーの応答が不正です',
    server_error: 'サーバーでエラーが発生しました'
  };
  function errorText(e) {
    const code = e && e.code;
    return ERROR_TEXT[code] || ('エラー: ' + (code || (e && e.message) || '不明'));
  }

  window.Api = { call, DEMO, ApiError, errorText };
})();
