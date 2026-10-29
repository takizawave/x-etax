/* Shared by the isolated content script, popup, and local component lab. */
(() => {
  const layouts = {
    office: { name: '業務メニュー', description: '業務番号で入口を選び、投稿者・件名の一覧から内容を確認。昔の日本の業務端末風。' },
    standard: { name: '標準', description: 'Xの配置を保ち、各部品の外観を統一。' },
    portal: { name: '手続きポータル', description: '読む・発信する・管理する、目的別の入口を先頭に配置。' },
    ledger: { name: '一覧台帳', description: '投稿者・日時と内容を列に分けた、横に広い一覧。' },
    inbox: { name: 'メッセージボックス', description: '投稿を送信者・件名で一覧化し、必要な本文を展開。DMそのものではありません。' }
  };
  const skins = {
    official: { name: '法人サイト', description: '濃緑・白・細い罫線。実測仕様が基準。' },
    classic: { name: '窓口クラシック', description: '昔の窓口ソフトを思わせる配色。薄緑の投稿欄、薄黄色のメニュー、立体ボタン。' },
    forms: { name: '申告書', description: '生成りの用紙、紺の表題、帳票の罫線。' },
    mono: { name: '白黒帳票', description: 'モノクロと直線。色を使わず階層を整理。' },
    win95: { name: 'Windows 95風', description: '灰色の立体ウィンドウ、紺のタイトルバー、ティール背景。' },
    yahoo: { name: 'Yahoo! 90s風', description: '紫のロゴ文字と青いリンクのディレクトリ。' },
    aol: { name: 'AOL風', description: 'You’ve got posts! 青と黄色のオンラインサービス。' },
    craigslist: { name: 'Craigslist風', description: '青い下線リンク、明朝体、素朴な分類一覧。' },
    geocities: { name: 'GeoCities風', description: '星空、ネオン、個人ホームページの時代。' },
    contrast: { name: 'くっきり', description: '大きな文字、太い枠、強い選択表示。' }
  };
  const writings = {
    native: { name: 'そのまま', description: '元の画面名と操作名を保持します。' },
    service: { name: '窓口案内', description: '通知一覧・情報を探す・投稿を作成。業務ごとの入口を分かりやすく。' },
    terminal: { name: '業務端末', description: '通知一覧・保存情報管理・利用環境設定。昔の業務システム風の名称。' }
  };
  const presets = [
    { name: '一覧・管理の業務端末', layout: 'office', skin: 'classic', writing: 'terminal' },
    { name: '案内窓口のことば', layout: 'standard', skin: 'classic', writing: 'service' },
    { name: '日本の業務端末', layout: 'office', skin: 'classic' },
    { name: '窓口クラシック', layout: 'standard', skin: 'classic' },
    { name: 'You’ve got posts!', layout: 'inbox', skin: 'aol' },
    { name: 'My Computer, My Posts', layout: 'ledger', skin: 'win95' },
    { name: 'The Web Directory', layout: 'portal', skin: 'yahoo' },
    { name: 'Missed Connections', layout: 'ledger', skin: 'craigslist' },
    { name: 'Welcome to my homepage', layout: 'portal', skin: 'geocities' },
    { name: '法人の窓口', layout: 'portal', skin: 'official' },
    { name: 'なつかしい受付', layout: 'portal', skin: 'classic' },
    { name: '投稿管理台帳', layout: 'ledger', skin: 'official' },
    { name: '紙の申告書', layout: 'ledger', skin: 'forms' },
    { name: '白黒の一覧表', layout: 'ledger', skin: 'mono' },
    { name: '受信通知の確認', layout: 'inbox', skin: 'classic' },
    { name: '読みやすい受信箱', layout: 'inbox', skin: 'contrast' },
    { name: 'いつものX＋行政ポータル', layout: 'standard', skin: 'official' }
  ];
  const defaults = { enabled: true, compact: false, layout: 'portal', skin: 'official', writing: 'native', sidebar: 'auto', media: 'full' };
  function normalize(key, value) {
    if (!Object.hasOwn(defaults, key)) return undefined;
    if (typeof defaults[key] === 'boolean') return typeof value === 'boolean' ? value : defaults[key];
    const values = key === 'layout' ? Object.keys(layouts) : key === 'skin' ? Object.keys(skins) : key === 'writing' ? Object.keys(writings) : key === 'sidebar' ? ['auto', 'show', 'hide'] : ['full', 'compact', 'hidden'];
    return values.includes(value) ? value : defaults[key];
  }
  function route(pathname) {
    if (/\/status\//.test(pathname)) return { key: 'detail', name: '投稿の詳細' };
    if (/^\/compose\//.test(pathname)) return { key: 'compose', name: '投稿・返信' };
    if (/^\/(messages|i\/chat)(\/|$)/.test(pathname)) return { key: 'messages', name: 'メッセージ' };
    if (/^\/notifications(\/|$)/.test(pathname)) return { key: 'notifications', name: '通知' };
    if (/^\/(search|explore)(\/|$)/.test(pathname)) return { key: 'search', name: '情報を探す' };
    if (/^\/i\/bookmarks/.test(pathname)) return { key: 'bookmarks', name: '保存した投稿' };
    if (/^\/(settings|i\/flow)(\/|$)/.test(pathname)) return { key: 'settings', name: '各種設定' };
    if (['/', '/home', '/preview.html', '/components.html', '/native-preview.html'].includes(pathname)) return { key: 'home', name: 'タイムライン' };
    return { key: 'profile', name: 'プロフィール・投稿一覧' };
  }
  globalThis.XEtaxConfig = Object.freeze({ layouts, skins, writings, presets, defaults, normalize, route });
})();
