// ===== 学園祭レジ アプリ本体 =====
(function () {
  'use strict';
  const CFG = window.APP_CONFIG;
  const $ = (s) => document.querySelector(s);
  const yen = (n) => '¥' + Number(n || 0).toLocaleString('ja-JP');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- ローカル保存（失敗しても動作は止めない） ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { console.warn('localStorage失敗', e); } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* noop */ } }
  };

  // ---------- 状態 ----------
  const state = {
    auth: store.get('auth', null),          // { token, exp }
    menu: store.get('menuCache', { genres: [], menus: [] }),
    cart: [],                               // [{ id, name, price, genreId, qty }]
    filter: 'all',
    view: null,
    tx: null,
    busy: false
  };

  // ---------- 共通 ----------
  function toast(msg, isErr) {
    const t = $('#toast');
    t.textContent = msg;
    t.className = 'toast' + (isErr ? ' err' : '');
    t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { t.hidden = true; }, isErr ? 4500 : 2200);
  }

  function textColorFor(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return '#fff';
    const n = parseInt(m[1], 16);
    const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
      v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return L > 0.4 ? '#111' : '#fff';
  }

  function genreOf(id) { return state.menu.genres.find((g) => g.id === id); }
  function genreColor(id) { const g = genreOf(id); return g ? g.color : '#6b7280'; }
  function uid(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  function registerName() { return store.get('registerName', ''); }
  function askRegisterName() {
    $('#rf-name').value = registerName() || '1';
    $('#register-dialog').showModal();
    $('#rf-name').select();
  }
  function submitRegister(ev) {
    ev.preventDefault();
    const v = $('#rf-name').value.trim().slice(0, 12);
    if (!v) return;
    store.set('registerName', v);
    $('#register-name').textContent = v;
    $('#register-dialog').close();
  }

  // ---------- API ----------
  async function api(action, extra) {
    try {
      return await window.Api.call(Object.assign({ action, token: state.auth && state.auth.token }, extra || {}));
    } catch (e) {
      if (e.code === 'unauthorized') {
        logout(true);
        toast(window.Api.errorText(e), true);
      }
      throw e;
    }
  }

  // ---------- 画面遷移 ----------
  function show(view) {
    state.view = view;
    ['login', 'menu', 'confirm', 'done', 'admin'].forEach((v) => { $('#view-' + v).hidden = v !== view; });
    $('#appbar').hidden = view === 'login';
    document.querySelectorAll('.tab').forEach((t) => {
      const nav = t.dataset.nav;
      t.classList.toggle('active', nav === view || (nav === 'menu' && (view === 'confirm' || view === 'done')));
    });
    if (view !== 'done') $('#frame').classList.remove('frame-fail');
    if (view === 'menu') renderMenu();
    if (view === 'admin') renderAdmin();
  }

  // ---------- ログイン ----------
  function isAuthed() { return state.auth && state.auth.token && state.auth.exp > Date.now(); }

  async function onLogin(ev) {
    ev.preventDefault();
    const btn = $('#login-btn');
    $('#login-error').textContent = '';
    btn.disabled = true; btn.textContent = 'ログイン中...';
    try {
      const res = await window.Api.call({ action: 'login', user: $('#login-user').value.trim(), pass: $('#login-pass').value });
      state.auth = { token: res.token, exp: Date.now() + (res.expiresInHours || 12) * 3600e3 - 60e3 };
      store.set('auth', state.auth);
      $('#login-pass').value = '';
      await afterLogin();
    } catch (e) {
      $('#login-error').textContent = window.Api.errorText(e);
    } finally {
      btn.disabled = false; btn.textContent = 'ログイン';
    }
  }

  async function afterLogin() {
    $('#register-name').textContent = registerName() || '-';
    show('menu');
    if (!registerName()) askRegisterName();
    await loadMenu(true);
    flushPending();
  }

  function logout(silent) {
    if (!silent && state.cart.length && !confirm('注文中の内容があります。ログアウトしますか？')) return;
    state.auth = null;
    store.del('auth');
    state.cart = [];
    show('login');
  }

  // ---------- メニュー読込 ----------
  async function loadMenu(showErr) {
    try {
      const res = await api('getMenu');
      state.menu = normalizeMenu(res.data);
      store.set('menuCache', state.menu);
      if (state.view === 'menu') renderMenu();
      if (state.view === 'admin') renderAdmin();
      return true;
    } catch (e) {
      if (showErr && e.code !== 'unauthorized') toast('メニュー読込失敗（前回のデータで表示中）: ' + window.Api.errorText(e), true);
      return false;
    }
  }
  function normalizeMenu(d) {
    return {
      genres: (d && d.genres || []).map((g) => ({ id: String(g.id), name: String(g.name), color: String(g.color || '#6b7280') })),
      menus: (d && d.menus || []).map((m) => ({
        id: String(m.id), name: String(m.name), genreId: String(m.genreId), icon: String(m.icon || 'tag'),
        price: Math.max(0, Math.floor(Number(m.price) || 0)), active: m.active !== false
      }))
    };
  }

  // ========== 画面1: メニュー ==========
  function renderMenu() {
    const { genres, menus } = state.menu;
    const active = menus.filter((m) => m.active);
    if (state.filter !== 'all' && !genres.some((g) => g.id === state.filter)) state.filter = 'all';

    // ジャンル絞り込み
    const f = $('#genre-filter');
    f.innerHTML = '';
    const mk = (id, label, color) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.style.background = color; b.style.color = textColorFor(color);
      b.classList.toggle('active', state.filter === id);
      b.onclick = () => { state.filter = id; renderMenu(); };
      f.appendChild(b);
    };
    mk('all', 'すべて', '#ffffff');
    genres.forEach((g) => { if (active.some((m) => m.genreId === g.id)) mk(g.id, g.name, g.color); });

    // グリッド（ジャンルごとのセクション）
    const grid = $('#menu-grid');
    grid.innerHTML = '';
    const sections = genres.map((g) => ({ g, items: active.filter((m) => m.genreId === g.id) }));
    const orphan = active.filter((m) => !genreOf(m.genreId));
    if (orphan.length) sections.push({ g: { id: '_none', name: '未分類', color: '#6b7280' }, items: orphan });

    let shown = 0;
    sections.forEach(({ g, items }) => {
      if (!items.length) return;
      if (state.filter !== 'all' && state.filter !== g.id) return;
      shown++;
      const sec = document.createElement('div');
      sec.className = 'menu-section';
      sec.innerHTML = `<h3><span class="dot" style="background:${esc(g.color)}"></span>${esc(g.name)}</h3>`;
      const wrap = document.createElement('div');
      wrap.className = 'menu-grid';
      items.forEach((m) => wrap.appendChild(menuTile(m, true)));
      sec.appendChild(wrap);
      grid.appendChild(sec);
    });
    if (!shown) {
      grid.innerHTML = '<div class="empty">販売中のメニューがありません。<br>「メニュー管理」から追加してください。</div>';
    }
    renderCart();
  }

  function menuTile(m, clickable) {
    const color = genreColor(m.genreId);
    const el = document.createElement(clickable ? 'button' : 'div');
    el.className = 'menu-tile';
    el.style.background = color;
    el.style.color = textColorFor(color);
    const qty = clickable ? (state.cart.find((c) => c.id === m.id) || {}).qty : 0;
    el.innerHTML = `${window.iconSvg(m.icon, 54)}<div class="tile-name">${esc(m.name || '（名前未入力）')}</div>` +
      `<div class="tile-price">${yen(m.price)}</div>` + (qty ? `<div class="tile-qty">${qty}</div>` : '');
    if (clickable) {
      el.type = 'button';
      el.onclick = () => addToCart(m);
    }
    return el;
  }

  function addToCart(m) {
    const c = state.cart.find((x) => x.id === m.id);
    if (c) c.qty++;
    else state.cart.push({ id: m.id, name: m.name, price: m.price, genreId: m.genreId, qty: 1 });
    renderMenu();
  }
  function changeQty(id, d) {
    const c = state.cart.find((x) => x.id === id);
    if (!c) return;
    c.qty += d;
    if (c.qty <= 0) state.cart = state.cart.filter((x) => x.id !== id);
    renderMenu();
  }
  const cartTotal = () => state.cart.reduce((s, c) => s + c.price * c.qty, 0);

  function renderCart() {
    const ul = $('#cart-list');
    ul.innerHTML = '';
    if (!state.cart.length) {
      ul.innerHTML = '<li class="cart-empty">メニューをクリックすると<br>ここに追加されます</li>';
    }
    state.cart.forEach((c) => {
      const li = document.createElement('li');
      li.innerHTML =
        `<div class="ci-name"><span class="ci-swatch" style="background:${esc(genreColor(c.genreId))}"></span>${esc(c.name)}</div>` +
        `<div class="ci-sub">${yen(c.price * c.qty)}</div>` +
        `<div class="ci-unit">${yen(c.price)} × ${c.qty}</div>` +
        `<div class="ci-ctrl"><button data-d="-1" title="1つ減らす">−</button><span class="qty">${c.qty}</span>` +
        `<button data-d="1" title="1つ増やす">＋</button><button class="del" data-d="del">削除</button></div>`;
      li.querySelectorAll('button').forEach((b) => {
        b.onclick = () => changeQty(c.id, b.dataset.d === 'del' ? -c.qty : Number(b.dataset.d));
      });
      ul.appendChild(li);
    });
    $('#cart-total').textContent = yen(cartTotal());
    $('#cart-confirm').disabled = !state.cart.length;
    $('#cart-clear').disabled = !state.cart.length;
  }

  // ========== 画面2: 内容確定 ==========
  function goConfirm() {
    if (!state.cart.length) return;
    const tb = $('#confirm-items');
    tb.innerHTML = state.cart.map((c) =>
      `<tr><td>${esc(c.name)}</td><td class="num">${yen(c.price)}</td><td class="num">${c.qty}</td><td class="num">${yen(c.price * c.qty)}</td></tr>`
    ).join('');
    const total = cartTotal();
    $('#confirm-total').textContent = yen(total);

    // クイック金額ボタン
    const cands = [total];
    [100, 500, 1000].forEach((u) => cands.push(Math.ceil(total / u) * u));
    [1000, 2000, 5000, 10000].forEach((v) => cands.push(v));
    const uniq = [...new Set(cands)].filter((v) => v >= total && v > 0).sort((a, b) => a - b).slice(0, 6);
    const qa = $('#quick-amounts');
    qa.innerHTML = '';
    uniq.forEach((v, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = i === 0 && v === total ? `ぴったり ${yen(v)}` : yen(v);
      if (i === 0 && v === total) b.className = 'exact';
      b.onclick = () => { $('#received-input').value = String(v); validateReceived(); $('#received-input').focus(); };
      qa.appendChild(b);
    });

    $('#received-input').value = '';
    validateReceived();
    show('confirm');
    setTimeout(() => $('#received-input').focus(), 30);
  }

  function parseReceived() {
    const raw = $('#received-input').value
      .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
      .replace(/[^0-9]/g, '');
    return raw === '' ? null : Number(raw);
  }

  function validateReceived(ev) {
    const input = $('#received-input');
    const v = parseReceived();
    // 数字以外を入力欄から除去（日本語入力の変換中は触らない）
    const cleaned = v === null ? '' : String(v);
    if (!(ev && ev.isComposing) && input.value !== cleaned) input.value = cleaned;

    const total = cartTotal();
    const ok = v !== null && v >= total && v <= 1000000;
    $('#confirm-ok').disabled = !ok || state.busy;
    $('.yen-input').classList.toggle('invalid', v !== null && !ok);
    const hint = $('#received-hint');
    hint.style.color = '';
    if (v === null) { hint.textContent = 'お客様から預かった金額を入力してください'; hint.style.color = 'var(--muted)'; $('#change-preview').textContent = '-'; return ok; }
    if (v < total) { hint.textContent = `預かり金額が ${yen(total - v)} 不足しています`; $('#change-preview').textContent = '-'; return ok; }
    if (v > 1000000) { hint.textContent = '金額が大きすぎます'; $('#change-preview').textContent = '-'; return ok; }
    $('#change-preview').textContent = yen(v - total);
    if (v - total >= 10000) { hint.textContent = '⚠ お釣りが1万円以上です。入力ミスがないか確認してください'; hint.style.color = '#c2410c'; }
    else hint.textContent = '';
    return ok;
  }

  async function confirmPayment() {
    if (state.busy || !validateReceived()) return;
    state.busy = true;
    $('#confirm-ok').disabled = true;

    const total = cartTotal();
    const received = parseReceived();
    const now = new Date();
    const reg = registerName() || '-';
    const pad = (n) => String(n).padStart(2, '0');
    const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const tx = {
      id: `${reg}-${stamp}-${Math.random().toString(36).slice(2, 6)}`,
      time: now.toISOString(),
      register: reg,
      items: state.cart.map((c) => ({ id: c.id, name: c.name, price: c.price, qty: c.qty })),
      total, received, change: received - total
    };
    state.tx = tx;

    // 端末内にも履歴を保存（違算確認用バックアップ）
    const hist = store.get('txHistory', []);
    hist.push(tx);
    store.set('txHistory', hist.slice(-2000));

    // 画面3へ（お釣りはすぐ表示し、ログ送信結果は後から反映）
    state.cart = [];
    $('#done-change').textContent = yen(tx.change);
    $('#done-detail').textContent = `合計 ${yen(tx.total)} ／ お預かり ${yen(tx.received)}`;
    setLogStatus('sending');
    state.doneAt = Date.now();
    show('done');

    try {
      await api('log', { tx });
      setLogStatus('ok');
    } catch (e) {
      addPending(tx);
      setLogStatus('fail', window.Api.errorText(e));
    } finally {
      state.busy = false;
    }
  }

  // ========== 画面3: 決済完了 ==========
  function setLogStatus(kind, detail) {
    const el = $('#log-status');
    const frame = $('#frame');
    frame.classList.toggle('frame-fail', kind === 'fail');
    el.className = 'log-status ' + kind;
    if (kind === 'sending') {
      el.innerHTML = '<div class="spinner"></div><div>ログを保存中...</div>';
    } else if (kind === 'ok') {
      el.innerHTML = '<svg class="check-mark" viewBox="0 0 72 72"><circle cx="36" cy="36" r="36"/><path d="M20 37l11 11 22-24"/></svg>' +
        '<div>ログ保存に成功しました</div>';
    } else {
      el.innerHTML = '<div class="warn-mark">!</div><div>ログ保存に失敗しました' +
        `<span class="sub">${esc(detail || '')}<br>この取引は「未送信ログ」としてPC内に保管し、自動で再送します。会計自体は完了しています。</span></div>`;
    }
  }

  // ---------- 未送信ログの再送 ----------
  function pending() { return store.get('pendingLogs', []); }
  function addPending(tx) {
    const p = pending();
    if (!p.some((x) => x.id === tx.id)) p.push(tx);
    store.set('pendingLogs', p);
    renderPending();
  }
  function renderPending() {
    const n = pending().length;
    $('#pending-badge').hidden = n === 0;
    $('#pending-count').textContent = n;
  }
  let flushing = false;
  async function flushPending(manual) {
    if (flushing || !isAuthed()) return;
    const list = pending();
    if (!list.length) { if (manual) toast('未送信ログはありません'); return; }
    flushing = true;
    let sent = 0;
    try {
      for (const tx of list) {
        try {
          await api('log', { tx });
          store.set('pendingLogs', pending().filter((x) => x.id !== tx.id));
          sent++;
        } catch (e) {
          if (manual) toast('再送失敗: ' + window.Api.errorText(e), true);
          break;
        }
      }
    } finally {
      flushing = false;
      renderPending();
      if (sent) toast(`未送信ログを ${sent} 件送信しました`);
    }
  }

  // ========== 画面4: メニュー管理 ==========
  const PRESET_COLORS = ['#1e7a46', '#0f766e', '#2a6fd6', '#4338ca', '#7c3aed', '#c026d3',
    '#d9467a', '#dc2626', '#ea580c', '#f59e0b', '#facc15', '#65a30d', '#78350f', '#374151', '#000000', '#94a3b8', '#fda4af', '#a5f3fc'];

  function renderAdmin() {
    const { genres, menus } = state.menu;
    // ジャンル
    const gl = $('#genre-list');
    gl.innerHTML = '';
    if (!genres.length) gl.innerHTML = '<li class="muted">ジャンルがありません。先にジャンルを追加してください。</li>';
    genres.forEach((g, i) => {
      const used = menus.filter((m) => m.genreId === g.id).length;
      const li = document.createElement('li');
      li.innerHTML = `<span class="swatch" style="background:${esc(g.color)}"></span><span class="gname">${esc(g.name)} <span class="muted">(${used})</span></span>` +
        `<button class="icon-btn" data-a="up" ${i === 0 ? 'disabled' : ''}>▲</button>` +
        `<button class="icon-btn" data-a="down" ${i === genres.length - 1 ? 'disabled' : ''}>▼</button>` +
        `<button class="icon-btn" data-a="edit">編集</button><button class="icon-btn danger" data-a="del">削除</button>`;
      li.querySelectorAll('button').forEach((b) => { b.onclick = () => genreAction(b.dataset.a, g, i); });
      gl.appendChild(li);
    });

    // メニュー
    const tb = $('#admin-menu-list');
    tb.innerHTML = '';
    if (!menus.length) tb.innerHTML = '<tr><td colspan="7" class="muted" style="padding:20px">メニューがありません</td></tr>';
    menus.forEach((m, i) => {
      const g = genreOf(m.genreId);
      const color = g ? g.color : '#6b7280';
      const tr = document.createElement('tr');
      if (!m.active) tr.className = 'inactive';
      tr.innerHTML =
        `<td><div class="mini-tile" style="background:${esc(color)};color:${textColorFor(color)}">${window.iconSvg(m.icon, 30)}</div></td>` +
        `<td><b>${esc(m.name)}</b></td>` +
        `<td><span class="genre-pill" style="background:${esc(color)};color:${textColorFor(color)}">${esc(g ? g.name : '未分類')}</span></td>` +
        `<td class="num"><b>${yen(m.price)}</b></td>` +
        `<td class="keep">${m.active ? '<span class="state-on">● 販売中</span>' : '<span class="state-off">○ 無効</span>'}</td>` +
        `<td class="keep"><button class="icon-btn" data-a="up" ${i === 0 ? 'disabled' : ''}>▲</button> <button class="icon-btn" data-a="down" ${i === menus.length - 1 ? 'disabled' : ''}>▼</button></td>` +
        `<td class="keep"><div class="row-actions"><button class="icon-btn" data-a="edit">編集</button>` +
        `<button class="icon-btn" data-a="toggle">${m.active ? '一時無効化' : '有効にする'}</button>` +
        `<button class="icon-btn danger" data-a="del">削除</button></div></td>`;
      tr.querySelectorAll('button').forEach((b) => { b.onclick = () => menuAction(b.dataset.a, m, i); });
      tb.appendChild(tr);
    });
  }

  function cloneMenu() { return JSON.parse(JSON.stringify(state.menu)); }
  function move(arr, i, d) { const j = i + d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; }

  async function saveMenu(next, okMsg) {
    const st = $('#admin-status');
    st.textContent = '保存中...';
    document.querySelectorAll('#view-admin button').forEach((b) => { b.disabled = true; });
    try {
      await api('saveMenu', { data: next });
      state.menu = normalizeMenu(next);
      store.set('menuCache', state.menu);
      st.textContent = '保存しました ' + new Date().toLocaleTimeString('ja-JP');
      toast(okMsg || '保存しました');
      return true;
    } catch (e) {
      st.textContent = '保存失敗';
      toast('保存に失敗しました: ' + window.Api.errorText(e), true);
      return false;
    } finally {
      if (state.view === 'admin') renderAdmin();
      document.querySelectorAll('#view-admin .admin-head button, #genre-add, #menu-add').forEach((b) => { b.disabled = false; });
    }
  }

  function genreAction(a, g, i) {
    const next = cloneMenu();
    if (a === 'up' || a === 'down') { move(next.genres, i, a === 'up' ? -1 : 1); saveMenu(next, '並び順を保存しました'); }
    else if (a === 'edit') openGenreDialog(g);
    else if (a === 'del') {
      const used = next.menus.filter((m) => m.genreId === g.id).length;
      if (used) { toast(`このジャンルには ${used} 件のメニューがあります。先にメニューを移動/削除してください`, true); return; }
      if (!confirm(`ジャンル「${g.name}」を削除しますか？`)) return;
      next.genres = next.genres.filter((x) => x.id !== g.id);
      saveMenu(next, '削除しました');
    }
  }

  function menuAction(a, m, i) {
    const next = cloneMenu();
    const t = next.menus.find((x) => x.id === m.id);
    if (a === 'up' || a === 'down') { move(next.menus, i, a === 'up' ? -1 : 1); saveMenu(next, '並び順を保存しました'); }
    else if (a === 'edit') openMenuDialog(m);
    else if (a === 'toggle') { t.active = !t.active; saveMenu(next, t.active ? `「${t.name}」を販売中にしました` : `「${t.name}」を一時無効化しました`); }
    else if (a === 'del') {
      if (!confirm(`メニュー「${m.name}」を削除しますか？\n（一時的に止めたいだけなら「一時無効化」がおすすめです）`)) return;
      next.menus = next.menus.filter((x) => x.id !== m.id);
      saveMenu(next, '削除しました');
    }
  }

  // ---------- ジャンル編集ダイアログ ----------
  let editingGenre = null;
  function openGenreDialog(g) {
    editingGenre = g ? g.id : null;
    $('#genre-dialog-title').textContent = g ? 'ジャンル編集' : 'ジャンル追加';
    $('#gf-name').value = g ? g.name : '';
    $('#gf-error').textContent = '';
    const used = state.menu.genres.map((x) => x.color);
    setGenreColor(g ? g.color : (PRESET_COLORS.find((c) => !used.includes(c)) || PRESET_COLORS[0]));
    $('#genre-dialog').showModal();
    $('#gf-name').focus();
  }
  function setGenreColor(c) {
    $('#gf-color').value = c;
    const box = $('#gf-colors');
    box.innerHTML = '';
    PRESET_COLORS.forEach((pc) => {
      const b = document.createElement('button');
      b.type = 'button'; b.style.background = pc; b.title = pc;
      if (pc.toLowerCase() === c.toLowerCase()) b.className = 'sel';
      b.onclick = () => setGenreColor(pc);
      box.appendChild(b);
    });
  }
  async function submitGenre(ev) {
    ev.preventDefault();
    const name = $('#gf-name').value.trim();
    if (!name) { $('#gf-error').textContent = 'ジャンル名を入力してください'; return; }
    const color = $('#gf-color').value;
    const next = cloneMenu();
    if (editingGenre) Object.assign(next.genres.find((x) => x.id === editingGenre), { name, color });
    else next.genres.push({ id: uid('g'), name, color });
    $('#genre-dialog').close();
    await saveMenu(next);
  }

  // ---------- メニュー編集ダイアログ ----------
  let editingMenu = null;
  let selIcon = 'chip';
  function openMenuDialog(m) {
    if (!state.menu.genres.length) { toast('先にジャンルを追加してください', true); return; }
    editingMenu = m ? m.id : null;
    $('#menu-dialog-title').textContent = m ? 'メニュー編集' : 'メニュー追加';
    $('#mf-name').value = m ? m.name : '';
    $('#mf-price').value = m ? String(m.price) : '';
    $('#mf-active').checked = m ? m.active : true;
    $('#mf-genre').innerHTML = state.menu.genres.map((g) => `<option value="${esc(g.id)}">${esc(g.name)}</option>`).join('');
    $('#mf-genre').value = m && genreOf(m.genreId) ? m.genreId : (state.filter !== 'all' && genreOf(state.filter) ? state.filter : state.menu.genres[0].id);
    selIcon = m ? m.icon : 'chip';
    $('#mf-error').textContent = '';
    renderIconPicker();
    updatePreview();
    $('#menu-dialog').showModal();
    $('#mf-name').focus();
  }
  function renderIconPicker() {
    const box = $('#mf-icons');
    box.innerHTML = '';
    let lastGroup = '';
    Object.entries(window.ICONS).forEach(([key, ic]) => {
      if (ic.group !== lastGroup) {
        lastGroup = ic.group;
        const h = document.createElement('div'); h.className = 'grp'; h.textContent = ic.group; box.appendChild(h);
      }
      const b = document.createElement('button');
      b.type = 'button';
      b.className = key === selIcon ? 'sel' : '';
      b.innerHTML = window.iconSvg(key, 36) + `<span>${esc(ic.label)}</span>`;
      b.onclick = () => { selIcon = key; renderIconPicker(); updatePreview(); };
      box.appendChild(b);
    });
  }
  function readPrice() {
    const raw = $('#mf-price').value.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).replace(/[,，¥円\s]/g, '');
    return /^\d+$/.test(raw) ? Number(raw) : NaN;
  }
  function updatePreview() {
    const p = readPrice();
    const m = { name: $('#mf-name').value.trim(), genreId: $('#mf-genre').value, icon: selIcon, price: isNaN(p) ? 0 : p };
    const box = $('#mf-preview');
    const tile = menuTile(m, false);
    box.replaceWith(tile);
    tile.id = 'mf-preview';
    tile.classList.add('preview-tile');
  }
  async function submitMenu(ev) {
    ev.preventDefault();
    const name = $('#mf-name').value.trim();
    const price = readPrice();
    if (!name) { $('#mf-error').textContent = 'メニュー名を入力してください'; return; }
    if (isNaN(price) || price > 1000000) { $('#mf-error').textContent = '金額は0以上の整数（半角数字）で入力してください'; return; }
    const data = { name, genreId: $('#mf-genre').value, icon: selIcon, price, active: $('#mf-active').checked };
    const next = cloneMenu();
    if (editingMenu) Object.assign(next.menus.find((x) => x.id === editingMenu), data);
    else next.menus.push(Object.assign({ id: uid('m') }, data));
    $('#menu-dialog').close();
    await saveMenu(next);
  }

  // ---------- CSV出力（端末内履歴） ----------
  function exportCsv() {
    const hist = store.get('txHistory', []);
    if (!hist.length) { toast('この端末の取引履歴はありません'); return; }
    const rows = [['会計日時', '取引ID', 'レジ番号', '内容', '合計金額', '預かり金額', 'お釣り', 'ログ送信']];
    const pend = new Set(pending().map((x) => x.id));
    hist.forEach((t) => rows.push([
      new Date(t.time).toLocaleString('ja-JP'), t.id, t.register,
      t.items.map((i) => `${i.name}×${i.qty}(¥${i.price})`).join(' / '),
      t.total, t.received, t.change, pend.has(t.id) ? '未送信' : '済'
    ]));
    const csv = '﻿' + rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `レジ履歴_${registerName() || 'PC'}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ---------- イベント登録 ----------
  function bind() {
    $('#login-form').addEventListener('submit', onLogin);
    $('#logout-btn').onclick = () => logout(false);
    $('#register-btn').onclick = askRegisterName;
    $('#register-form').addEventListener('submit', submitRegister);
    $('#rf-cancel').onclick = () => $('#register-dialog').close();
    $('#pending-badge').onclick = () => flushPending(true);
    document.querySelectorAll('.tab').forEach((t) => {
      t.onclick = () => {
        if (state.busy) return;
        if (t.dataset.nav === 'admin') loadMenu(false);
        show(t.dataset.nav);
      };
    });

    $('#cart-clear').onclick = () => { if (confirm('注文内容をすべて取り消しますか？')) { state.cart = []; renderMenu(); } };
    $('#cart-confirm').onclick = goConfirm;

    $('#received-input').addEventListener('input', validateReceived);
    $('#received-input').addEventListener('compositionend', () => validateReceived());
    $('#confirm-back').onclick = () => show('menu');
    $('#confirm-ok').onclick = confirmPayment;

    $('#done-next').onclick = () => { if (!state.busy) { show('menu'); loadMenu(false); } };

    $('#genre-add').onclick = () => openGenreDialog(null);
    $('#menu-add').onclick = () => openMenuDialog(null);
    $('#admin-reload').onclick = async () => { if (await loadMenu(true)) toast('最新のメニューを読み込みました'); };
    $('#admin-export').onclick = exportCsv;

    $('#genre-form').addEventListener('submit', submitGenre);
    $('#gf-cancel').onclick = () => $('#genre-dialog').close();
    $('#gf-color').addEventListener('input', (e) => setGenreColor(e.target.value));

    $('#menu-form').addEventListener('submit', submitMenu);
    $('#mf-cancel').onclick = () => $('#menu-dialog').close();
    ['#mf-name', '#mf-price', '#mf-genre'].forEach((s) => $(s).addEventListener('input', updatePreview));

    // キーボード操作（Enter で次へ / Esc で戻る）
    document.addEventListener('keydown', (e) => {
      if (document.querySelector('dialog[open]')) return;
      if (e.isComposing) return;
      if (state.view === 'confirm') {
        if (e.key === 'Enter') { e.preventDefault(); confirmPayment(); }
        else if (e.key === 'Escape') show('menu');
      } else if (state.view === 'done' && e.key === 'Enter') {
        // お釣りを見ずに連打で戻らないよう、表示直後は無視
        e.preventDefault();
        if (state.busy || Date.now() - state.doneAt < 1000) return;
        e.preventDefault(); show('menu'); loadMenu(false);
      } else if (state.view === 'menu' && e.key === 'Enter' && state.cart.length && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault(); goConfirm();
      }
    });

    // 誤ってタブを閉じないように
    window.addEventListener('beforeunload', (e) => {
      if (state.cart.length || state.view === 'confirm' || state.busy) { e.preventDefault(); e.returnValue = ''; }
    });

    // 定期処理
    setInterval(() => flushPending(false), CFG.RETRY_INTERVAL_MS);
    setInterval(() => { if (isAuthed() && state.view === 'menu' && !state.cart.length) loadMenu(false); }, CFG.MENU_REFRESH_MS);
    window.addEventListener('online', () => flushPending(false));
  }

  // ---------- 起動 ----------
  function init() {
    bind();
    $('#demo-note').hidden = !window.Api.DEMO;
    $('#demo-badge').hidden = !window.Api.DEMO;
    renderPending();
    if (isAuthed()) afterLogin();
    else { state.auth = null; store.del('auth'); show('login'); $('#login-user').focus(); }
  }
  init();
})();
