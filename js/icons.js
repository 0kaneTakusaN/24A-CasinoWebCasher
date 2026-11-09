// ===== ピクトグラム（SVG） =====
// すべて viewBox 0 0 64 64、currentColor で描画（背景色に合わせて白/黒が自動で切り替わる）
(function () {
  const S = 'fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"';
  const F = 'fill="currentColor"';

  const ICONS = {
    // --- カジノ系 ---
    chip: { label: 'チップ', group: 'カジノ', svg:
      `<circle cx="32" cy="32" r="26" ${S}/><circle cx="32" cy="32" r="14" ${S}/>` +
      `<path d="M32 6v8M32 50v8M6 32h8M50 32h8M13.6 13.6l5.7 5.7M44.7 44.7l5.7 5.7M13.6 50.4l5.7-5.7M44.7 19.3l5.7-5.7" ${S}/>` +
      `<circle cx="32" cy="32" r="4" ${F}/>` },
    chips: { label: 'チップの山', group: 'カジノ', svg:
      `<ellipse cx="32" cy="46" rx="22" ry="8" ${S}/><path d="M10 46v-8M54 46v-8" ${S}/>` +
      `<ellipse cx="32" cy="38" rx="22" ry="8" ${S}/><path d="M10 38v-8M54 38v-8" ${S}/>` +
      `<ellipse cx="32" cy="30" rx="22" ry="8" ${S}/><path d="M24 30h16" ${S}/>` },
    dice: { label: 'サイコロ', group: 'カジノ', svg:
      `<rect x="8" y="8" width="48" height="48" rx="10" ${S}/>` +
      `<circle cx="21" cy="21" r="4.5" ${F}/><circle cx="43" cy="21" r="4.5" ${F}/><circle cx="32" cy="32" r="4.5" ${F}/>` +
      `<circle cx="21" cy="43" r="4.5" ${F}/><circle cx="43" cy="43" r="4.5" ${F}/>` },
    card: { label: 'トランプ', group: 'カジノ', svg:
      `<rect x="12" y="4" width="40" height="56" rx="6" ${S}/>` +
      `<path d="M32 18c-6 7-12 10-12 16a6 6 0 0 0 11 3l-2 7h6l-2-7a6 6 0 0 0 11-3c0-6-6-9-12-16z" ${F}/>` },
    coin: { label: 'コイン', group: 'カジノ', svg:
      `<circle cx="32" cy="32" r="26" ${S}/><circle cx="32" cy="32" r="19" ${S} stroke-width="2.5"/>` +
      `<path d="M24 22l8 12 8-12M32 34v12M25 37h14M25 43h14" ${S} stroke-width="3.5"/>` },
    slot: { label: 'スロット', group: 'カジノ', svg:
      `<rect x="6" y="14" width="44" height="40" rx="6" ${S}/><path d="M17 22v24M28 22v24M39 22v24" ${S} stroke-width="2.5"/>` +
      `<path d="M50 30h4v-14" ${S}/><circle cx="54" cy="12" r="4" ${F}/>` +
      `<text x="11.5" y="40" font-size="13" font-weight="900" font-family="Arial" ${F}>7</text>` +
      `<text x="22.5" y="40" font-size="13" font-weight="900" font-family="Arial" ${F}>7</text>` +
      `<text x="33.5" y="40" font-size="13" font-weight="900" font-family="Arial" ${F}>7</text>` },
    roulette: { label: 'ルーレット', group: 'カジノ', svg:
      `<circle cx="32" cy="32" r="26" ${S}/><circle cx="32" cy="32" r="8" ${S}/>` +
      `<path d="M32 6v18M32 40v18M6 32h18M40 32h18M13.6 13.6l12.7 12.7M37.7 37.7l12.7 12.7M13.6 50.4l12.7-12.7M37.7 26.3l12.7-12.7" ${S} stroke-width="2.5"/>` +
      `<circle cx="46" cy="18" r="3.5" ${F}/>` },
    ticket: { label: 'チケット', group: 'カジノ', svg:
      `<path d="M6 20a4 4 0 0 1 4-4h44a4 4 0 0 1 4 4v6a6 6 0 0 0 0 12v6a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4v-6a6 6 0 0 0 0-12z" ${S}/>` +
      `<path d="M40 18v28" ${S} stroke-dasharray="4 4"/><path d="M16 28h16M16 36h12" ${S}/>` },

    // --- お菓子・フード系 ---
    cookie: { label: 'クッキー', group: 'お菓子', svg:
      `<path d="M32 6a26 26 0 1 0 26 26 8 8 0 0 1-9-9 8 8 0 0 1-9-9 8 8 0 0 1-8-8z" ${S}/>` +
      `<circle cx="22" cy="26" r="3.5" ${F}/><circle cx="34" cy="38" r="3.5" ${F}/><circle cx="22" cy="44" r="3.5" ${F}/><circle cx="44" cy="46" r="3" ${F}/>` },
    candy: { label: 'キャンディ', group: 'お菓子', svg:
      `<circle cx="32" cy="32" r="13" ${S}/><path d="M23 23L8 14l4 14M41 41l15 9-4-14" ${S}/>` +
      `<path d="M26 26c4 0 8 4 8 8M30 22c5 2 10 7 12 12" ${S} stroke-width="2.5"/>` },
    lollipop: { label: 'ペロペロキャンディ', group: 'お菓子', svg:
      `<circle cx="32" cy="24" r="18" ${S}/><path d="M32 42v18" ${S}/>` +
      `<path d="M32 24a6 6 0 1 1 6 6 12 12 0 1 1-12-12" ${S} stroke-width="3"/>` },
    donut: { label: 'ドーナツ', group: 'お菓子', svg:
      `<circle cx="32" cy="32" r="26" ${S}/><circle cx="32" cy="32" r="8" ${S}/>` +
      `<path d="M18 20l3 3M44 16l-2 4M48 36l-4 1M22 44l3-3M36 48l-1-4M14 34l4-1" ${S} stroke-width="3"/>` },
    cake: { label: 'ケーキ', group: 'お菓子', svg:
      `<path d="M8 56h48M12 56V34h40v22" ${S}/><path d="M12 42c5 4 9 4 13 0s9-4 14 0 9 4 13 0" ${S}/>` +
      `<path d="M32 34V22" ${S}/><path d="M32 8c3 4 3 8 0 9-3-1-3-5 0-9z" ${F}/>` },
    icecream: { label: 'アイス', group: 'お菓子', svg:
      `<path d="M18 30l14 30 14-30" ${S}/><path d="M16 30a16 16 0 0 1 32 0z" ${S}/>` +
      `<path d="M24 38l12 8M28 46l6-4" ${S} stroke-width="2.5"/>` },
    popcorn: { label: 'ポップコーン', group: 'お菓子', svg:
      `<path d="M14 26l6 32h24l6-32z" ${S}/><path d="M26 26l2 32M38 26l-2 32" ${S} stroke-width="2.5"/>` +
      `<path d="M14 26a6 6 0 0 1 4-10 7 7 0 0 1 12-6 7 7 0 0 1 12 2 6 6 0 0 1 8 14" ${S}/>` },
    crepe: { label: 'クレープ', group: 'お菓子', svg:
      `<path d="M16 14l16 46 16-46" ${S}/><path d="M12 18c4-8 10-8 12-4 2-6 10-8 14-2 4-4 12-2 14 4z" ${S}/>` +
      `<path d="M20 26h24M24 38h16" ${S} stroke-width="2.5"/>` },
    onigiri: { label: 'おにぎり', group: 'フード', svg:
      `<path d="M32 6c6 0 26 34 26 42a8 8 0 0 1-8 8H14a8 8 0 0 1-8-8C6 40 26 6 32 6z" ${S}/>` +
      `<rect x="22" y="38" width="20" height="18" ${F}/>` },
    takoyaki: { label: 'たこ焼き', group: 'フード', svg:
      `<path d="M6 40h52l-6 14H12z" ${S}/><circle cx="18" cy="32" r="8" ${S}/><circle cx="32" cy="30" r="8" ${S}/><circle cx="46" cy="32" r="8" ${S}/>` +
      `<path d="M50 6L34 26" ${S}/>` },
    fries: { label: 'ポテト', group: 'フード', svg:
      `<path d="M20 24V6M28 24V4M36 24V6M44 24V8" ${S}/><path d="M12 24h40l-6 34H18z" ${S}/>` +
      `<path d="M24 38a8 8 0 0 0 16 0" ${S} stroke-width="3"/>` },
    burger: { label: 'バーガー', group: 'フード', svg:
      `<path d="M10 28a22 18 0 0 1 44 0z" ${S}/><path d="M8 36h48" ${S}/><path d="M10 44h44v4a8 8 0 0 1-8 8H18a8 8 0 0 1-8-8z" ${S}/>` +
      `<circle cx="24" cy="20" r="1.8" ${F}/><circle cx="34" cy="16" r="1.8" ${F}/><circle cx="40" cy="22" r="1.8" ${F}/>` },

    // --- 飲み物系 ---
    juice: { label: 'ジュース', group: '飲み物', svg:
      `<path d="M14 20h36l-5 38H19z" ${S}/><path d="M36 20l6-14h8" ${S}/><path d="M16 32h32" ${S} stroke-width="2.5"/>` },
    hotdrink: { label: 'ホット', group: '飲み物', svg:
      `<path d="M10 28h36v14a14 14 0 0 1-14 14h-8a14 14 0 0 1-14-14z" ${S}/><path d="M46 32h4a6 6 0 0 1 0 12h-5" ${S}/>` +
      `<path d="M20 20c-3-4 3-6 0-10M28 20c-3-4 3-6 0-10M36 20c-3-4 3-6 0-10" ${S} stroke-width="3"/>` },
    bottle: { label: 'ペットボトル', group: '飲み物', svg:
      `<path d="M26 4h12v8l6 8v36a4 4 0 0 1-4 4H24a4 4 0 0 1-4-4V20l6-8z" ${S}/><path d="M20 30h24v14H20z" ${S}/>` },
    can: { label: '缶', group: '飲み物', svg:
      `<path d="M18 10h28l2 6v34l-2 6H18l-2-6V16z" ${S}/><path d="M16 18h32M16 48h32" ${S} stroke-width="2.5"/>` +
      `<path d="M28 6h8" ${S}/>` },
    tapioca: { label: 'タピオカ', group: '飲み物', svg:
      `<path d="M14 18h36l-5 40H19z" ${S}/><path d="M34 18l4-14" ${S}/>` +
      `<circle cx="25" cy="50" r="3" ${F}/><circle cx="33" cy="51" r="3" ${F}/><circle cx="40" cy="49" r="3" ${F}/><circle cx="29" cy="44" r="3" ${F}/><circle cx="37" cy="43" r="3" ${F}/>` },

    // --- その他 ---
    star: { label: 'スター', group: 'その他', svg:
      `<path d="M32 6l7.6 16.4L58 24.6 44.6 37.2 48 56 32 47 16 56l3.4-18.8L6 24.6l18.4-2.2z" ${S}/>` },
    gift: { label: 'プレゼント', group: 'その他', svg:
      `<rect x="8" y="22" width="48" height="12" rx="2" ${S}/><path d="M12 34v22h40V34M32 22v34" ${S}/>` +
      `<path d="M32 22c-4-10-16-12-16-4 0 4 8 4 16 4zM32 22c4-10 16-12 16-4 0 4-8 4-16 4z" ${S}/>` },
    heart: { label: 'ハート', group: 'その他', svg:
      `<path d="M32 56S6 40 6 22a13 13 0 0 1 26-4 13 13 0 0 1 26 4c0 18-26 34-26 34z" ${S}/>` },
    tag: { label: 'タグ', group: 'その他', svg:
      `<path d="M6 30V8a2 2 0 0 1 2-2h22l28 28-24 24z" ${S}/><circle cx="18" cy="18" r="4" ${F}/>` }
  };

  function iconSvg(key, size) {
    const ic = ICONS[key] || ICONS.tag;
    const s = size || 48;
    return `<svg viewBox="0 0 64 64" width="${s}" height="${s}" aria-hidden="true">${ic.svg}</svg>`;
  }

  window.ICONS = ICONS;
  window.iconSvg = iconSvg;
})();
