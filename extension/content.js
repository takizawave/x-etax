(() => {
  'use strict';
  const config = globalThis.XEtaxConfig;
  const root = document.documentElement;
  const storage = globalThis.chrome?.storage;
  const settings = { ...config.defaults };
  const changedDuringLoad = new Set();
  const records = new Map();
  const components = globalThis.XDisplayDOM?.create(document, window);
  const wording = globalThis.XDisplayWording?.create(document);
  let writingSelect;
  let banner, title, crumb, portal, modeSelect, skinSelect, modeDescription, brandName, brandSubtitle, heroDescription, managementToggle, managementDialog, previewTools, previewToolsHome;
  let office, officeTitle, officeCrumb;
  let listening = false, observer, scheduled = false, presentationKey;
  const owned = 'data-x-etax-owned';
  const part = 'data-x-etax-part';
  const rowSelector = 'article[data-testid="tweet"]';

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }
  function setText(node, value) { if (node.textContent !== value) node.textContent = value; }
  function save(values) {
    if (storage) return storage.local.set(values);
    for (const [key, value] of Object.entries(values)) settings[key] = config.normalize(key, value);
    apply();
    return Promise.resolve();
  }
  function select(label, entries, key) {
    const wrapper = element('label', 'x-etax-select');
    wrapper.append(element('span', '', label));
    const input = element('select');
    input.setAttribute('aria-label', label);
    for (const [value, item] of Object.entries(entries)) {
      const option = element('option', '', item.name);
      option.value = value; input.append(option);
    }
    input.addEventListener('change', () => {
      input.disabled = true;
      save({ [key]: input.value }).catch(() => {
        input.value = settings[key];
        setText(modeDescription, '設定を保存できませんでした。もう一度お試しください。');
      }).finally(() => { input.disabled = false; });
    });
    wrapper.append(input);
    return { wrapper, input };
  }
  function shortcut(label, path, testId) {
    const link = element('a', '', label);
    link.href = `https://x.com/${path}`;
    if (testId) link.setAttribute('data-x-etax-source', testId);
    return link;
  }
  function createBanner() {
    const shell = element('div'); shell.id = 'x-etax-theme-banner'; shell.setAttribute(owned, 'shell');
    shell.setAttribute('role', 'region'); shell.setAttribute('aria-label', 'X Display Studio 非公式外観テーマ');
    const masthead = element('div', 'x-etax-masthead');
    const brand = element('div', 'x-etax-brand');
    brandName = element('strong', '', 'X Display Studio');
    brandSubtitle = element('span', '', 'X 閲覧システム');
    brand.append(brandName, brandSubtitle);
    const themeTools = element('div', 'x-etax-theme-note');
    themeTools.append(element('span', '', '非公式テーマ'));
    const nav = element('nav', 'x-etax-nav'); nav.setAttribute('aria-label', 'テーマのショートカット');
    nav.append(shortcut('ホーム', 'home', 'AppTabBar_Home_Link'), shortcut('話題を検索', 'explore', 'AppTabBar_Explore_Link'), shortcut('通知', 'notifications', 'AppTabBar_Notifications_Link'), shortcut('メッセージ', 'messages', 'AppTabBar_DirectMessage_Link'));
    masthead.append(brand, themeTools, nav);
    const breadcrumb = element('div', 'x-etax-breadcrumb');
    crumb = element('span'); breadcrumb.append(shortcut('X ホーム', 'home'), element('span', '', '›'), crumb);
    const hero = element('div', 'x-etax-section-title');
    title = element('h1'); heroDescription = element('p'); hero.append(title, heroDescription);
    const controls = element('div', 'x-etax-view-controls'); controls.id = 'x-etax-view-controls';
    const modes = select('情報の配置', config.layouts, 'layout'); modeSelect = modes.input;
    const skins = select('外観パターン', config.skins, 'skin'); skinSelect = skins.input;
    const writing = select('文言パターン', config.writings, 'writing'); writingSelect = writing.input;
    controls.append(modes.wrapper, skins.wrapper, writing.wrapper);
    modeDescription = element('p', 'x-etax-mode-description'); modeDescription.setAttribute('role', 'status');
    portal = element('div', 'x-etax-portal');
    const groups = [
      ['01', '読む・探す', '知りたい情報へアクセス', [['タイムラインを見る', 'home', 'AppTabBar_Home_Link'], ['話題・キーワードを探す', 'explore', 'AppTabBar_Explore_Link']]],
      ['02', '発信・やりとり', '投稿とメッセージの入口', [['新しい投稿を作成', 'compose/post', 'SideNav_NewTweet_Button'], ['通知を確認する', 'notifications', 'AppTabBar_Notifications_Link'], ['メッセージを開く', 'messages', 'AppTabBar_DirectMessage_Link']]],
      ['03', '保存・管理', 'あとで読む情報と利用設定', [['保存した投稿', 'i/bookmarks', ''] , ['設定を開く', 'settings/account', '']]]
    ];
    for (const [number, name, description, links] of groups) {
      const card = element('section', 'x-etax-task-card');
      card.append(element('small', '', number), element('h2', '', name), element('p', '', description));
      for (const [label, path, testId] of links) card.append(shortcut(label, path, testId));
      portal.append(card);
    }
    const top = element('button', 'x-etax-top', '↑'); top.type = 'button';
    top.setAttribute('aria-label', 'ページの先頭へ戻る');
    top.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'auto' }));
    managementToggle = element('button', 'x-etax-management-toggle', '表示管理');
    managementToggle.type = 'button';
    managementToggle.setAttribute('aria-controls', 'x-etax-management-dialog');
    managementToggle.setAttribute('aria-haspopup', 'dialog');
    managementToggle.setAttribute('aria-expanded', 'false');
    managementDialog = element('dialog', 'x-etax-management-dialog');
    managementDialog.id = 'x-etax-management-dialog';
    managementDialog.setAttribute('aria-labelledby', 'x-etax-management-title');
    const dialogHeading = element('div', 'x-etax-management-heading');
    const dialogTitle = element('h2', '', '表示管理'); dialogTitle.id = 'x-etax-management-title';
    const close = element('button', 'x-etax-management-close', '閉じる ×'); close.type = 'button';
    close.setAttribute('autofocus', ''); close.setAttribute('aria-label', '表示管理を閉じる');
    close.addEventListener('click', closeManagement);
    dialogHeading.append(dialogTitle, close);
    managementDialog.append(dialogHeading, masthead, breadcrumb, hero, controls, modeDescription, portal);
    managementDialog.addEventListener('cancel', event => { event.preventDefault(); closeManagement(); });
    managementDialog.addEventListener('close', () => {
      root.classList.remove('x-etax-management-open');
      managementToggle.setAttribute('aria-expanded', 'false');
    });
    let backdropPress = false;
    const outside = event => {
      const rect = managementDialog.getBoundingClientRect();
      return event.target === managementDialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom);
    };
    managementDialog.addEventListener('pointerdown', event => { backdropPress = outside(event); });
    managementDialog.addEventListener('click', event => {
      if (backdropPress && outside(event)) closeManagement();
      backdropPress = false;
      if (event.target.closest('a')?.getAttribute('href')?.startsWith('#')) closeManagement();
    });
    managementToggle.addEventListener('click', () => {
      if (!managementDialog.open) managementDialog.showModal();
      managementToggle.setAttribute('aria-expanded', 'true');
      root.classList.add('x-etax-management-open');
    });
    shell.append(managementDialog, top, managementToggle);
    return shell;
  }

  function closeManagement() {
    if (managementDialog?.open) managementDialog.close();
    root.classList.remove('x-etax-management-open');
    managementToggle?.setAttribute('aria-expanded', 'false');
  }
  function mountPreviewTools() {
    // Only the explicitly marked local preview toolbar is ours to move.
    const tools = document.querySelector('[data-x-etax-management-tools]');
    if (!tools || managementDialog.contains(tools)) return;
    previewTools = tools;
    previewToolsHome = { parent: tools.parentNode, next: tools.nextSibling };
    managementDialog.append(tools);
  }

  // Independent of the dismissible management shell; native React nodes stay put.
  function refreshOffice(route) {
    const primary = document.querySelector('[data-testid="primaryColumn"]');
    if (settings.layout !== 'office' || !primary) { office?.remove(); return; }
    if (!office) {
      office = element('section', 'x-etax-office');
      office.setAttribute(owned, 'office');
      office.setAttribute('aria-label', '業務メニュー');
      const heading = element('div', 'x-etax-office-heading');
      heading.append(element('strong', '', '情報閲覧システム'), element('span', '', '業務メニュー'));
      const menu = element('details', 'x-etax-office-menu'); menu.open = true;
      menu.append(element('summary', '', '業務選択・メニューを開閉'));
      const grid = element('nav', 'x-etax-office-grid'); grid.setAttribute('aria-label', '業務番号から選択');
      const groups = [
        ['01', '閲覧・検索', [['01-1', '投稿一覧', 'home', 'home', 'AppTabBar_Home_Link'], ['01-2', '情報検索', 'explore', 'search', 'AppTabBar_Explore_Link']]],
        ['02', '連絡業務', [['02-1', '通知確認', 'notifications', 'notifications', 'AppTabBar_Notifications_Link'], ['02-2', '個別連絡', 'i/chat', 'messages', 'AppTabBar_DirectMessage_Link']]],
        ['03', '保管・設定', [['03-1', '保存一覧', 'i/bookmarks', 'bookmarks', ''], ['03-2', '利用設定', 'settings/account', 'settings', '']]]
      ];
      for (const [number, label, entries] of groups) {
        const group = element('section', 'x-etax-office-group');
        group.append(element('h2', '', `${number}　${label}`));
        for (const [code, name, path, key, testId] of entries) {
          const link = shortcut('', path, testId); link.setAttribute('data-office-page', key);
          link.append(element('small', '', code), element('span', '', name), element('b', '', '›'));
          group.append(link);
        }
        grid.append(group);
      }
      menu.append(grid);
      officeCrumb = element('p', 'x-etax-office-location');
      officeTitle = element('h2', 'x-etax-office-title');
      const hint = element('p', 'x-etax-office-help', '一覧の件名から「内容確認」を押すと本文を表示します。表示順は上のタブで切り替えられます。');
      hint.setAttribute('data-office-help', '');
      office.append(heading, menu, officeCrumb, officeTitle, hint);
    }
    if (office.parentElement !== primary) primary.prepend(office);
    const labels = { home: '投稿一覧', search: '投稿検索', profile: '投稿者別一覧', bookmarks: '保存情報管理', detail: '投稿内容確認', notifications: '通知確認', messages: '個別連絡', settings: '利用設定', compose: '投稿作成' };
    setText(officeTitle, labels[route.key] || route.name);
    setText(officeCrumb, `業務選択　›　${['notifications','messages'].includes(route.key) ? '連絡業務' : route.key === 'settings' || route.key === 'bookmarks' ? '保管・設定' : '閲覧・検索'}　›　${labels[route.key] || route.name}`);
    office.querySelector('[data-office-help]').hidden = !['home', 'search', 'profile', 'bookmarks'].includes(route.key);
    for (const link of office.querySelectorAll('[data-office-page]')) {
      if (link.getAttribute('data-office-page') === route.key) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
  }

  // Mark existing nodes; never reparent React-owned nodes or replace its HTML.
  function mark(record, node, value) {
    if (!record.attributes.has(node)) record.attributes.set(node, node.getAttribute(part));
    if(node.getAttribute(part)!==value)node.setAttribute(part, value);
  }
  function cleanupRecord(article, record) {
    record.toggle?.remove();
    for (const [node, previous] of record.attributes) {
      if (previous === null) node.removeAttribute(part); else node.setAttribute(part, previous);
    }
    article.removeAttribute('data-x-etax-record'); article.removeAttribute('data-x-etax-expanded');
  }
  function adaptArticle(article) {
    const meta = article.querySelector('[data-testid="User-Name"]');
    const text = article.querySelector('[data-testid="tweetText"]');
    const actions = article.querySelector('[role="group"]');
    const attachment = article.querySelector('[data-testid="tweetPhoto"], [data-testid="videoPlayer"], video, [data-testid="card.wrapper"]');
    if (!meta || (!text && !attachment)) return;
    let body = meta.parentElement;
    const content = text || attachment;
    while (body && body !== article && !(body.contains(content) && (!actions || body.contains(actions)))) body = body.parentElement;
    // Unknown shapes stay in the original presentation instead of hiding content.
    const headerPart = body && [...body.children].find(child => child.contains(meta));
    const contentPart = body && [...body.children].find(child => child.contains(content));
    if (!body || body === article || !headerPart || !contentPart || headerPart === contentPart) {
      const previous = records.get(article);
      if (previous) { cleanupRecord(article, previous); records.delete(article); }
      return;
    }
    let record = records.get(article);
    const signature = article.querySelector('a[href*="/status/"]')?.getAttribute('href') || `${meta.textContent}|${text?.textContent || ''}`;
    if (record && (record.body !== body || record.meta !== meta || record.text !== text || record.signature !== signature || !record.toggle.isConnected)) {
      cleanupRecord(article, record); records.delete(article); record = null;
    }
    if (!record) {
      record = { body, meta, text, signature, attributes: new Map() };
      mark(record, body, 'record-body');
      for (const child of [...body.children]) {
        mark(record, child, child.contains(meta) ? 'record-header' : child.contains(actions) ? 'record-actions' : 'record-content');
      }
      const avatar = article.querySelector('[data-testid^="UserAvatar-Container"]');
      if (avatar) {
        let avatarColumn = avatar;
        if (body.parentElement.contains(avatar)) {
          while (avatarColumn.parentElement !== body.parentElement && avatarColumn.parentElement !== article) avatarColumn = avatarColumn.parentElement;
        }
        mark(record, avatarColumn, 'record-avatar');
      }
      const button = element('button', 'x-etax-record-toggle'); button.type = 'button';
      button.setAttribute(owned, 'disclosure'); button.setAttribute('aria-expanded', 'false');
      const summary = element('span', 'x-etax-record-summary');
      const facts = element('small', 'x-etax-record-facts');
      const state = element('strong', 'x-etax-record-state', '本文を表示 ＋');
      button.append(summary, facts, state);
      button.addEventListener('click', event => {
        event.stopPropagation();
        const expanded = article.getAttribute('data-x-etax-expanded') !== 'true';
        article.setAttribute('data-x-etax-expanded', String(expanded));
        button.setAttribute('aria-expanded', String(expanded));
        setText(state, settings.layout === 'office' ? (expanded ? '一覧に戻す −' : '内容確認 ＋') : (expanded ? '本文を閉じる −' : '本文を表示 ＋'));
      });
      record.toggle = button; record.summary = summary; record.facts = facts; record.state = state;
      const header = [...body.children].find(child => child.contains(meta));
      body.insertBefore(button, header?.nextSibling || null);
      article.setAttribute('data-x-etax-record', 'ready'); article.setAttribute('data-x-etax-expanded', 'false');
      records.set(article, record);
    }
    const expanded = article.getAttribute('data-x-etax-expanded') === 'true';
    setText(record.state, settings.layout === 'office' ? (expanded ? '一覧に戻す −' : '内容確認 ＋') : (expanded ? '本文を閉じる −' : '本文を表示 ＋'));
    // A reused virtualized node can gain children without replacing its text node.
    for (const child of [...body.children]) {
      if (child.hasAttribute(owned)) continue;
      mark(record, child, child.contains(meta) ? 'record-header' : child.contains(actions) ? 'record-actions' : 'record-content');
    }
    const summaryText = (text?.textContent || attachment?.textContent || '添付資料を含む投稿').trim().replace(/\s+/g, ' ');
    setText(record.summary, summaryText.length > 160 ? `${summaryText.slice(0, 160)}…` : summaryText);
    const facts = [];
    const photos = [...article.querySelectorAll('[data-testid="tweetPhoto"]')].filter(node => !node.closest('[data-testid="videoPlayer"],[data-testid="videoComponent"]'));
    if (photos.length) facts.push(`画像 ${photos.length}点`);
    if (article.querySelector('[data-testid="videoPlayer"],video')) facts.push('動画あり');
    if (article.querySelector('[data-testid="card.wrapper"]')) facts.push('リンク先情報あり');
    setText(record.facts, facts.join(' ／ '));
    if(record.facts.hidden !== (facts.length===0))record.facts.hidden = facts.length === 0;
  }

  function refresh() {
    scheduled = false;
    if (!settings.enabled) return;
    observer?.disconnect();
    components?.refresh(value => wording?.caption(value,settings.writing) ?? value);
    const route = config.route(window.location.pathname);
    root.setAttribute('data-x-etax-page', route.key);
    const nextPresentationKey=JSON.stringify([route.key,route.name,settings.layout,settings.skin,settings.writing]);
    if(presentationKey!==nextPresentationKey || (settings.layout==='office' && !office?.isConnected)) {
    presentationKey=nextPresentationKey;
    refreshOffice(route);
    setText(crumb, route.name);
    const names = { win95: 'X 95', yahoo: 'X Directory!', aol: 'X Online', craigslist: 'x-list', geocities: '★ My X Page ★' };
    setText(brandName, names[settings.skin] || 'X Display Studio');
    setText(title, settings.layout === 'portal' && route.key === 'home' ? 'Xをご利用の方' : settings.layout === 'ledger' ? `${route.name}台帳` : settings.layout === 'inbox' && route.key !== 'messages' ? '投稿メッセージボックス' : route.name);
    if (route.key === 'home' && settings.skin === 'aol') setText(title, 'You’ve got posts!');
    if (route.key === 'home' && settings.skin === 'geocities') setText(title, 'Welcome to my homepage!');
    if (route.key === 'home' && settings.skin === 'yahoo') setText(title, 'Your guide to the World Wide X.');
    const originalClassic = settings.skin === 'classic' && settings.layout === 'standard';
    setText(brandSubtitle, originalClassic ? 'ソーシャル閲覧システム' : 'X 閲覧システム');
    if (originalClassic) { setText(brandName, 'X 閲覧ソフト'); setText(title, '閲覧・投稿・通知'); }
    setText(heroDescription, originalClassic ? 'タイムラインの利用' : '投稿・通知・メッセージを、いつものXで。');
    const nostalgic = Object.hasOwn(names, settings.skin);
    const englishRoutes = { home: 'Timeline', profile: 'Profile & posts', detail: 'Post details', messages: 'Messages', notifications: 'Notifications', search: 'Explore', bookmarks: 'Saved posts', settings: 'Settings', compose: 'Compose' };
    if (nostalgic) {
      setText(crumb, englishRoutes[route.key]);
      if (route.key !== 'home') setText(title, englishRoutes[route.key]);
      else if (settings.skin === 'win95') setText(title, 'Post Manager — X 95');
      else if (settings.skin === 'craigslist') setText(title, 'community · posts · discussions');
    }
    const cardCopy = nostalgic ? [
      ['Read & discover', 'Your daily dose of the World Wide Web.', 'Read your timeline', 'Explore the directory'],
      ['Post & connect', 'Your friends are just a click away.', 'Compose a post', 'Check notifications', 'Open your mailbox'],
      ['Saved & settings', 'All your favorite places, in one place.', 'Saved posts', 'Account settings']
    ] : [
      ['読む・探す', '知りたい情報へアクセス', 'タイムラインを見る', '話題・キーワードを探す'],
      ['発信・やりとり', '投稿とメッセージの入口', '新しい投稿を作成', '通知を確認する', 'メッセージを開く'],
      ['保存・管理', 'あとで読む情報と利用設定', '保存した投稿', '設定を開く']
    ];
    [...portal.children].forEach((card, index) => {
      setText(card.querySelector('h2'), cardCopy[index][0]);
      setText(card.querySelector('p'), cardCopy[index][1]);
      [...card.querySelectorAll('a')].forEach((link, linkIndex) => setText(link, cardCopy[index][linkIndex + 2]));
    });
    const navCopy = nostalgic ? ['Home', 'Explore', 'Notifications', 'Messages'] : ['ホーム', '話題を検索', '通知', 'メッセージ'];
    [...banner.querySelectorAll('.x-etax-nav a')].forEach((link,index) => setText(link,navCopy[index]));
    }
    for (const link of document.querySelectorAll('[data-x-etax-owned] [data-x-etax-source]')) {
      const source = document.querySelector(`#react-root [data-testid="${link.getAttribute('data-x-etax-source')}"]`);
      const href = source?.getAttribute('href');
      if (href?.startsWith('/') && !href.startsWith('//') && link.href!==`https://x.com${href}`) link.href = `https://x.com${href}`;
    }
    const supportsRecords = ['home', 'profile', 'search', 'bookmarks'].includes(route.key);
    if (supportsRecords && ['ledger', 'inbox', 'office'].includes(settings.layout)) {
      for (const [article, record] of records) if (!article.isConnected) { cleanupRecord(article, record); records.delete(article); }
      document.querySelectorAll(rowSelector).forEach(adaptArticle);
    } else {
      for (const [article, record] of records) cleanupRecord(article, record);
      records.clear();
    }
    wording?.refresh(settings.writing);
    observer?.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['href', 'data-testid', 'aria-label'] });
  }
  function scheduleRefresh() {
    if (!scheduled) { scheduled = true; window.requestAnimationFrame(refresh); }
  }
  function updateScroll() { root.classList.toggle('x-etax-scrolled', settings.enabled && window.scrollY > 160); }
  function apply() {
    root.classList.toggle('x-etax-enabled', settings.enabled);
    root.classList.toggle('x-etax-compact', settings.enabled && settings.compact);
    if (settings.enabled) {
      root.setAttribute('data-x-etax-layout', settings.layout); root.setAttribute('data-x-etax-skin', settings.skin);
      root.setAttribute('data-x-etax-media', settings.media);
      root.setAttribute('data-x-etax-writing', settings.writing);
      root.setAttribute('data-x-etax-sidebar', settings.sidebar === 'auto' ? (['ledger', 'inbox', 'office'].includes(settings.layout) ? 'hide' : 'show') : settings.sidebar);
      root.setAttribute('data-x-etax-management-collapsed', 'true');
      if (!banner) banner = createBanner();
      if (document.body && !banner.isConnected) document.body.prepend(banner);
      mountPreviewTools();
      modeSelect.value = settings.layout; skinSelect.value = settings.skin; writingSelect.value = settings.writing;
      setText(modeDescription, config.layouts[settings.layout].description);
      if (!listening) {
        window.addEventListener('scroll', updateScroll, { passive: true });
        window.addEventListener('popstate', scheduleRefresh);
        window.addEventListener('resize', scheduleRefresh, { passive: true });
        observer = new MutationObserver(mutations => {
          if (mutations.some(mutation => {
            const target=mutation.target.nodeType===3 ? mutation.target.parentElement : mutation.target;
            return !target?.closest?.(`[${owned}]`);
          })) scheduleRefresh();
        });
        listening = true;
      }
      refresh();
    } else {
      observer?.disconnect(); observer = undefined;
      presentationKey=undefined;
      wording?.clear();
      components?.clear();
      for (const [article, record] of records) cleanupRecord(article, record);
      records.clear(); closeManagement();
      if (previewTools && previewToolsHome) {
        const { parent, next } = previewToolsHome;
        parent.insertBefore(previewTools, next?.parentNode === parent ? next : null);
        previewTools = previewToolsHome = undefined;
      }
      banner?.remove(); office?.remove();
      for (const name of ['layout', 'skin', 'writing', 'media', 'sidebar', 'page', 'management-collapsed']) root.removeAttribute(`data-x-etax-${name}`);
      if (listening) { window.removeEventListener('scroll', updateScroll); window.removeEventListener('popstate', scheduleRefresh); window.removeEventListener('resize', scheduleRefresh); }
      listening = false;
    }
    updateScroll();
  }
  storage?.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    for (const key of Object.keys(config.defaults)) if (Object.hasOwn(changes, key)) {
      changedDuringLoad.add(key); settings[key] = config.normalize(key, changes[key].newValue);
    }
    apply();
  });
  if (storage) {
    storage.local.get(config.defaults).then(saved => {
      for (const key of Object.keys(config.defaults)) if (!changedDuringLoad.has(key)) settings[key] = config.normalize(key, saved[key]);
      apply();
    }).catch(apply);
  } else apply();
})();
