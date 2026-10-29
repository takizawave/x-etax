/* A reversible UI vocabulary layer. Never reads or rewrites post bodies or drafts. */
(() => {
  const pairs = {
    '本日のニュース':['ニュース一覧','ニュース一覧'], 'おすすめユーザー':['利用者のご案内','おすすめ利用者一覧'],
    'Xでライブ放送する':['放送中の番組','ライブ放送一覧'], '「いま」を見つけよう':['話題の一覧','話題一覧'],
    'ホーム':['投稿一覧','投稿一覧'], 'Home':['投稿一覧','投稿一覧'],
    'タイムライン':['投稿一覧','投稿一覧'],
    '話題を検索':['情報を探す','投稿検索'], 'Explore':['情報を探す','投稿検索'],
    '情報を探す':['情報を探す','投稿検索'],
    '通知':['通知一覧','通知一覧'], 'Notifications':['通知一覧','通知一覧'],
    'メッセージ':['連絡一覧','メッセージ管理'], 'チャット':['連絡一覧','メッセージ管理'], 'Messages':['連絡一覧','メッセージ管理'],
    'ブックマーク':['保存した投稿','保存情報管理'], 'Bookmarks':['保存した投稿','保存情報管理'], '保存した投稿':['保存した投稿','保存情報管理'],
    'プロフィール':['利用者情報','利用者情報'], 'Profile':['利用者情報','利用者情報'], 'プロフィール・投稿一覧':['利用者情報・投稿一覧','利用者情報'],
    '設定':['利用設定','利用環境設定'], 'Settings':['利用設定','利用環境設定'], '各種設定':['利用設定','利用環境設定'],
    'もっと見る':['その他の操作','その他業務'], 'More':['その他の操作','その他業務'],
    'ポストする':['投稿を作成','投稿作成'], 'Post':['投稿を作成','投稿作成'],
    '投稿の詳細':['投稿内容','投稿内容確認'], '投稿・返信':['投稿・返信の作成','投稿作成'],
    'ポスト':['投稿一覧','投稿一覧'], 'Posts':['投稿一覧','投稿一覧'],
    '返信':['返信一覧','返信履歴'], 'Replies':['返信一覧','返信履歴'],
    'メディア':['画像・動画一覧','画像・動画一覧'], 'Media':['画像・動画一覧','画像・動画一覧'],
    'おすすめ':['おすすめ一覧','おすすめ'], 'フォロー中':['フォロー中の投稿','フォロー先'],
    'すべて':['通知一覧','通知一覧'], 'すべての通知':['通知一覧','通知一覧'], 'All':['通知一覧','通知一覧'],
    'タイムラインを見る':['投稿一覧を見る','投稿一覧'], '話題・キーワードを探す':['情報を探す','投稿検索'],
    '新しい投稿を作成':['投稿を作成','投稿作成'], '通知を確認する':['通知一覧を見る','通知一覧'],
    'メッセージを開く':['連絡一覧を見る','メッセージ管理'], '設定を開く':['利用設定を開く','利用環境設定'],
    '投稿一覧':['投稿一覧','投稿一覧'], '情報検索':['情報を探す','投稿検索'],
    '通知確認':['通知一覧','通知一覧'], '個別連絡':['連絡一覧','メッセージ管理'],
    '保存一覧':['保存した投稿','保存情報管理'], '利用設定':['利用設定','利用環境設定']
  };
  const captions = {
    '戻る':['前の画面へ','前画面'], '検索':['情報を探す','情報検索'],
    '要約':['要約を見る','要約表示'], '詳細':['操作を選ぶ','操作一覧'],
    'その他':['その他の操作','各種操作'], 'メッセージ':['連絡画面を開く','メッセージ作成'],
    '通知オン':['通知を有効にする','通知有効化'], '通知オフ':['通知を無効にする','通知無効化'],
    '添付':['画像・動画を添付','画像・動画添付'], '日時':['予約日時を選ぶ','予約日時設定'],
    '場所':['場所を選ぶ','位置情報設定'], '閉じる':['画面を閉じる','閉じる']
  };
  globalThis.XDisplayWording = {
    create(document) {
      const texts=new Map(), attributes=new Map();
      function restore() {
        for(const [node,{before,after}] of texts)if(node.nodeValue===after)node.nodeValue=before;
        for(const [node,entries] of attributes)for(const [name,{before,after}] of entries)if(node.getAttribute(name)===after){if(before===null)node.removeAttribute(name);else node.setAttribute(name,before);}
        texts.clear();attributes.clear();
      }
      function refresh(mode) {
        const seenTexts=new Set(), seenAttributes=new Set();
        const index=mode==='service'?0:mode==='terminal'?1:-1;
        if(index<0){restore();return;}
        const page=document.documentElement.getAttribute('data-x-etax-page');
        const selectors=[
          '#react-root header nav a', '#react-root [data-testid="AppTabBar_More_Menu"]',
          '#react-root [data-testid="SideNav_NewTweet_Button"]',
          '#react-root [data-testid="primaryColumn"] [role="tab"]',
          '#react-root [data-x-etax-component="side-heading"]',
          '.x-etax-nav a','.x-etax-task-card a','.x-etax-office-group a span',
          '.x-etax-section-title h1','.x-etax-breadcrumb > span:last-child'
        ];
        if(['home','detail','notifications','search','bookmarks','messages'].includes(page))selectors.push('#react-root [data-x-etax-component="page-heading"] h2');
        function translate(value, dict) {
          const key=value?.trim();
          if(!key || !Object.hasOwn(dict,key))return value;
          if(dict===pairs && key==='すべて' && page!=='notifications')return value;
          // A detail heading says ポスト, while the profile tab means a list.
          const target=dict===pairs && page==='detail' && key==='ポスト' ? ['投稿内容','投稿内容確認'][index] : dict[key][index];
          return value.replace(key,target);
        }
        function attribute(node,name,dict) {
          seenAttributes.add(node);
          const current=node.getAttribute(name),previous=attributes.get(node)?.get(name);
          const before=previous && current===previous.after ? previous.before : current;
          const after=translate(before,dict);
          if(current!==after)node.setAttribute(name,after);
          if(before===after){attributes.get(node)?.delete(name);return;}
          if(!attributes.has(node))attributes.set(node,new Map());
          attributes.get(node).set(name,{before,after});
        }
        for(const node of document.querySelectorAll(selectors.join(','))) {
          if(node.closest('article,[data-testid="UserName"],[contenteditable="true"],[data-testid="tweetText"],[data-testid="UserDescription"]'))continue;
          // Do not rename dynamic list/community tabs or profile names based on their text.
          if(node.matches('[role="tab"]')) {
            if(node.querySelector('[data-testid^="UserAvatar"]'))continue;
            const original=document.createTreeWalker(node,4);let label='';
            for(let text=original.nextNode();text;text=original.nextNode()) {
              const previous=texts.get(text);
              label+=previous && text.nodeValue===previous.after ? previous.before : text.nodeValue;
            }
            label=label.trim();
            const known={home:['おすすめ','フォロー中'],profile:['ポスト','Posts','返信','Replies','メディア','Media'],notifications:['すべて','すべての通知','All']};
            if(!known[page]?.includes(label))continue;
            if(page==='home' && [...node.closest('[role="tablist"]').querySelectorAll('[role="tab"]')].indexOf(node)>1)continue;
          }
          const sideHeading=node.matches('[data-x-etax-component="side-heading"]');
          const dictionary=sideHeading ? {...pairs, 'おすすめ': node.closest('[data-x-etax-component="side-card"]')?.querySelector('[data-testid="UserCell"]') ? ['利用者のご案内','おすすめ利用者一覧'] : ['おすすめ','おすすめ']} : pairs;
          const walker=document.createTreeWalker(node,4);
          for(let text=walker.nextNode();text;text=walker.nextNode()) {
            if(text.parentElement.closest('svg,[aria-hidden="true"]'))continue;
            if(seenTexts.has(text))continue;
            seenTexts.add(text);
            const current=text.nodeValue,previous=texts.get(text);
            const before=previous && current===previous.after ? previous.before : current;
            const after=translate(before,dictionary);
            if(current!==after)text.nodeValue=after;
            if(before!==after)texts.set(text,{before,after});else texts.delete(text);
          }
          attribute(node,'aria-label',pairs);
        }
        for(const [node,{before,after}] of texts)if(!seenTexts.has(node)) {
          if(node.nodeValue===after)node.nodeValue=before;
          texts.delete(node);
        }
        for(const [node,entries] of attributes)if(!seenAttributes.has(node)) {
          for(const [name,{before,after}] of entries)if(node.getAttribute(name)===after){if(before===null)node.removeAttribute(name);else node.setAttribute(name,before);}
          attributes.delete(node);
        }
      }
      function caption(value,mode) {
        const index=mode==='service'?0:mode==='terminal'?1:-1;
        return index>=0 && Object.hasOwn(captions,value) ? captions[value][index] : value;
      }
      return {refresh,clear:restore,caption};
    }
  };
})();
