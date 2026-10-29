/* Boundaries verified on signed-in X, 2026-09-25. No React-owned nodes move. */
(() => {
  'use strict';
  globalThis.XDisplayDOM = {
    create(document, window) {
      const attribute = 'data-x-etax-component';
      const marked = new Map();
      const captions = new Map();
      const labels = { userActions:'その他', sendDMFromProfile:'メッセージ', reply:'返信', retweet:'再投稿', unretweet:'再投稿済', like:'いいね', unlike:'いいね済', bookmark:'保存', removeBookmark:'保存済', gifSearchButton:'GIF', createPollButton:'投票', scheduleOption:'日時', geoButton:'場所', contentDisclosureButton:'表示情報', grokImgGen:'画像生成', caret:'詳細', GrokDrawerHeader:'Grok', 'chat-drawer-main':'チャット', 'app-bar-back':'戻る' };
      const captionAttribute='data-x-etax-caption';
      const extraCaptions = [
        ['[data-testid="primaryColumn"] :is([aria-label="プロフィールの要約"],[aria-label="Profile summary"])','要約'],
        ['[data-x-etax-component="page-heading"] :is([aria-label="検索"],[aria-label="Search"])','検索'],
        ['[data-x-etax-component="profile-actions"] :is([aria-label="ポスト通知をオンにする"],[aria-label="Turn on post notifications"])','通知オン'],
        ['[data-x-etax-component="profile-actions"] :is([aria-label="ポスト通知をオフにする"],[aria-label="Turn off post notifications"])','通知オフ'],
        ['[data-testid="toolBar"] [aria-label="画像や動画を追加"]','添付'],
        ['[data-testid="toolBar"] [aria-label="絵文字を追加"]','絵文字'],
        ['[data-testid="tweet"] [role="group"] a[href$="/analytics"]','閲覧数'],
        ['[data-testid="tweet"] :is([aria-label="ポストを共有"],[aria-label="Share post"])','共有'],
        ['[data-testid="tweet"] [aria-label="Grokのアクション"]','解説'],
        ['[data-testid="primaryColumn"] [aria-label="タイムラインを管理"]','管理'],
        ['[data-testid="primaryColumn"] :is([aria-label="前"],[aria-label="Previous"])','◀'],
        ['[data-testid="primaryColumn"] :is([aria-label="次へ"],[aria-label="Next"])','▶'],
        ['[role="dialog"] :is([aria-label="閉じる"],[aria-label="Close"])','閉じる'],
        ['[data-testid="sidebarColumn"] :is([aria-label="Close"],[aria-label="閉じる"]),[data-x-etax-component="side-card"] > aside > button:first-child','×']
      ];
      function captionFor(node) {
        return labels[node.getAttribute('data-testid')] || extraCaptions.find(([selector])=>node.matches(selector))?.[1];
      }
      function updateCaptions(translate) {
        for(const [node,previous] of captions)if(!node.isConnected||!captionFor(node)){
          if(previous===null)node.removeAttribute(captionAttribute);else node.setAttribute(captionAttribute,previous);
          captions.delete(node);
        }
        for(const node of document.querySelectorAll([...Object.keys(labels).map(id=>'[data-testid="'+id+'"]'),...extraCaptions.map(([selector])=>selector)].join(','))){
          if(!captions.has(node))captions.set(node,node.getAttribute(captionAttribute));
          const value=translate(captionFor(node));
          if(node.getAttribute(captionAttribute)!==value)node.setAttribute(captionAttribute,value);
        }
      }
      function mark(node, kind) {
        if (!node || marked.has(node)) return;
        marked.set(node, node.getAttribute(attribute)); node.setAttribute(attribute, kind);
      }
      function nearestPosition(node, boundary, kind, positions) {
        for (let parent=node?.parentElement;parent && parent!==boundary;parent=parent.parentElement) {
          if (parent.hasAttribute(attribute)) return;
          if (positions.includes(window.getComputedStyle(parent).position)) { mark(parent, kind); return; }
        }
      }
      function refresh(translateCaption = value => value) {
        for (const [node, previous] of marked) if (!node.isConnected) {
          if(previous===null)node.removeAttribute(attribute);else node.setAttribute(attribute,previous);
          marked.delete(node);
        }
        const primary=document.querySelector('[data-testid="primaryColumn"]');
        if(primary)for(const tabs of primary.querySelectorAll('[role="tablist"]')) {
          if(tabs.closest('article,[role="dialog"]'))continue;
          nearestPosition(tabs,primary,'timeline-tabs',['sticky']);
        }
        if(primary)for(const back of primary.querySelectorAll('[data-testid="app-bar-back"]')) nearestPosition(back,primary,'page-heading',['sticky']);
        for(const input of document.querySelectorAll('[data-testid="SearchBox_Search_Input"]')) {
          const side=input.closest('[data-testid="sidebarColumn"]');
          if(side)nearestPosition(input,side,'search-fixed',['fixed']);
        }
        for(const toolbar of document.querySelectorAll('[data-testid="toolBar"]')) {
          nearestPosition(toolbar,toolbar.closest('[role="dialog"]') || primary,'composer-sticky',['sticky']);
          if(toolbar.querySelector('nav'))mark(toolbar,'composer-toolbar');
        }
        // Profile boundaries are confirmed by semantic siblings, not X's generated classes.
        const name=primary?.querySelector('[data-testid="UserName"]');
        const panel=name?.parentElement;
        if(panel && panel.querySelector('[data-testid^="UserAvatar-Container"]') && panel.querySelector('[data-testid="UserProfileHeader_Items"]')) {
          mark(panel,'profile-sheet');
          const avatar=panel.querySelector('[data-testid^="UserAvatar-Container"]');
          const top=[...panel.children].find(n=>n.contains(avatar));
          if(top && top!==name) {
            mark(top,'profile-top'); mark(avatar,'profile-avatar');
            for(const sibling of top.children) if(sibling!==avatar && sibling.querySelector('button,[role="button"]'))mark(sibling,'profile-actions');
          }
          for(const child of panel.children) {
            if(child.querySelector('[data-testid="UserDescription"]'))mark(child,'profile-description');
            if(child.querySelector('a[href$="/following"]') && child.querySelector('a[href$="/verified_followers"],a[href$="/followers"]'))mark(child,'profile-counts');
            if(child.querySelector('a[href$="/followers_you_follow"]'))mark(child,'profile-connections');
          }
          const cover=panel.previousElementSibling;
          if(cover && cover.querySelector('[style*="padding-bottom: 33.3333%"]')) {
            const hasImage=cover.querySelector('img') || [...cover.querySelectorAll('[style]')].some(n=>/url\(/.test(n.style.backgroundImage));
            const kind=hasImage?'profile-cover':'profile-cover-empty';
            if(marked.has(cover))cover.setAttribute(attribute,kind);else mark(cover,kind);
          }
        }
        // news_sidebar is a 1px marker. The visual card is its bordered ancestor.
        const side=document.querySelector('[data-testid="sidebarColumn"]');
        const news=side?.querySelector('[data-testid="news_sidebar"]');
        if(news?.parentElement.querySelector('h2,[data-testid^="news_sidebar_article_"]'))mark(news.parentElement,'side-card');
        // A card may already be square (or have a rounded inner aside). Discover
        // semantic panels first so outer geometry is not the only recognition cue.
        if(side)for(const aside of side.querySelectorAll('aside')) {
          let card=aside;
          if(!aside.querySelector('h2,[role="heading"],[data-testid="UserCell"]'))continue;
          for(let n=aside,i=0;n && n!==side && i<3;n=n.parentElement,i++) {
            if(parseFloat(window.getComputedStyle(n).borderTopWidth)>0){card=n;}
          }
          if(!card.parentElement.closest('[data-x-etax-component="side-card"]'))mark(card,'side-card');
        }
        if(side)for(const node of side.querySelectorAll('div,section,aside')) {
          if(marked.has(node)||node.parentElement.closest('[data-x-etax-component="side-card"]')||node.querySelector('[data-x-etax-component="side-card"]'))continue;
          const rect=node.getBoundingClientRect();
          if(rect.width===0)continue; // Revisit when the responsive sidebar becomes visible.
          if(rect.width<200||rect.height<60||node.closest('form'))continue;
          const style=window.getComputedStyle(node);
          if(parseFloat(style.borderTopWidth)>0&&parseFloat(style.borderTopLeftRadius)>0)mark(node,'side-card');
        }
        for(const card of document.querySelectorAll('[data-x-etax-component="side-card"]')) {
          for(const row of card.querySelectorAll('[data-testid^="news_sidebar_article_"],[data-testid="trend"],[aria-label^="ライブ放送"]'))mark(row,'side-row');
          for(const row of card.querySelectorAll('[data-testid="UserCell"]'))mark(row,'side-user');
          if(card.querySelector('[data-x-etax-component="side-heading"]'))continue;
          const heading=[...card.querySelectorAll('h2,[role="heading"]')].find(node=>{const box=node.getBoundingClientRect();return box.width>32&&box.height>12;})||[...card.querySelectorAll('div,span')].find(node=>{
            if(node.closest('button,a,[role="button"]'))return false;
            const style=window.getComputedStyle(node);
            const box=node.getBoundingClientRect();
            return box.width>32 && box.height>12 && Number(style.fontWeight)>=600 && node.textContent.trim();
          });
          if(heading)mark(heading,'side-heading');
        }
        if(side)for(const pill of side.querySelectorAll('[data-testid="pill-contents-container"]')) {
          for(let n=pill.parentElement,i=0;n && n!==side && i<4;n=n.parentElement,i++) {
            if(!n.hasAttribute('style') || !n.style.animationDuration)break;
            mark(n,'live-count-frame');
          }
        }
        updateCaptions(translateCaption);
        for(const dialog of document.querySelectorAll('[role="dialog"]')) {
          mark(dialog,dialog.querySelector('[role="dialog"]')?'dialog-host':'dialog-surface');
        }
      }
      function clear() {
        for(const [node,previous] of marked) {
          if(previous===null)node.removeAttribute(attribute);else node.setAttribute(attribute,previous);
        }
        marked.clear();
        for(const [node,previous] of captions){
          if(previous===null)node.removeAttribute(captionAttribute);else node.setAttribute(captionAttribute,previous);
        }
        captions.clear();
      }
      return { refresh, clear };
    }
  };
})();
