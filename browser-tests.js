'use strict';
const frame=document.getElementById('fixture');
const results=document.getElementById('results');
const summary=document.getElementById('summary');
const tick=()=>new Promise(resolve=>setTimeout(resolve,60));
function assert(value,message){if(!value)throw new Error(message);}
document.getElementById('run').addEventListener('click',async event=>{
  event.target.disabled=true;results.replaceChildren();let passed=0,failed=0;
  const test=async(name,fn)=>{const item=document.createElement('li');try{await fn();item.textContent='PASS · '+name;item.className='pass';passed++;}catch(error){item.textContent='FAIL · '+name+' — '+error.message;item.className='fail';failed++;}results.append(item);summary.textContent=`${passed}件成功 / ${failed}件失敗`;};
  try{
    if(!frame.contentWindow.XEtaxConfig)await new Promise(resolve=>frame.addEventListener('load',resolve,{once:true}));
    const win=frame.contentWindow,doc=frame.contentDocument;
    const save=async values=>{await win.chrome.storage.local.set(values);await tick();};
    await save({enabled:false,layout:'standard',skin:'official',media:'full'});
    const original=doc.getElementById('react-root').innerHTML;
    const originalText=doc.querySelector('[data-testid="tweetText"]');
    const originalLike=doc.querySelector('[data-demo-like]');
    const styles=node=>win.getComputedStyle(node);
    for(const layout of Object.keys(win.XEtaxConfig.layouts))for(const skin of Object.keys(win.XEtaxConfig.skins)){
      await test(`${layout} × ${skin}`,async()=>{
        await save({enabled:true,layout,skin});
        assert(doc.documentElement.getAttribute('data-x-etax-layout')===layout,'layout mismatch');
        assert(doc.documentElement.getAttribute('data-x-etax-skin')===skin,'skin mismatch');
        assert(doc.querySelector('[data-testid="tweetText"]')===originalText,'native text node replaced');
        assert(doc.querySelector('[data-demo-like]')===originalLike,'native action node replaced');
        assert(doc.querySelectorAll('#x-etax-theme-banner').length===1,'duplicate shell');
        const disclosure=doc.querySelector('.x-etax-record-toggle');
        if(layout==='portal')assert(styles(doc.querySelector('.x-etax-portal')).display==='grid','portal not visible');
        if(layout==='ledger'){assert(styles(doc.querySelector('[data-x-etax-part="record-body"]')).display==='grid','record grid missing');assert(styles(doc.getElementById('avatar-column')).display==='none','empty avatar column remains');}
        if(layout==='inbox'||layout==='office'){
          assert(disclosure&&styles(disclosure).display!=='none','disclosure missing');
          // Reset expanded state when switching skins within this same mode.
          if(disclosure.getAttribute('aria-expanded')==='true')disclosure.click();
          assert(styles(doc.querySelector('[data-x-etax-part="record-content"]')).display==='none','collapsed content visible');
          disclosure.click();
          assert(disclosure.getAttribute('aria-expanded')==='true','expand failed');
          assert(styles(doc.querySelector('[data-x-etax-part="record-content"]')).display!=='none','expanded content hidden');
          disclosure.click();
        }
        assert(doc.documentElement.scrollWidth<=win.innerWidth+2,'horizontal page overflow');
      });
    }
    await test('管理モーダルは初期非表示で、設定変更中も開状態とフォーカスを保持',async()=>{
      await save({enabled:true,layout:'standard',skin:'classic'});
      const dialog=doc.getElementById('x-etax-management-dialog');
      const button=doc.querySelector('.x-etax-management-toggle');
      assert(!dialog.open && styles(dialog).display==='none','management visible at startup');
      button.focus();button.click();
      assert(dialog.open && dialog.matches(':modal'),'not in modal top layer');
      assert(dialog.contains(doc.activeElement),'focus not inside dialog');
      const select=doc.querySelector('[aria-label="文言パターン"]');select.focus();
      select.value='terminal';select.dispatchEvent(new win.Event('change'));await tick();
      assert((await win.chrome.storage.local.get({})).writing==='terminal','select did not save');
      assert(dialog.open && dialog.contains(doc.activeElement),'settings closed dialog or lost focus');
      doc.querySelector('.x-etax-management-close').click();await tick();
      assert(!dialog.open && doc.activeElement===button,'close did not restore launcher focus');
      await save({writing:'native'});
    });
    await test('全50パターンでモーダル表示・閉操作・背景クリック・Escを確認',async()=>{
      for(const skin of Object.keys(win.XEtaxConfig.skins))for(const layout of Object.keys(win.XEtaxConfig.layouts)) {
        await save({skin,layout});
        const button=doc.querySelector('.x-etax-management-toggle'),dialog=doc.getElementById('x-etax-management-dialog');
        assert(doc.getElementById('x-etax-theme-banner').getBoundingClientRect().height===0,'header space remains');
        assert(styles(doc.documentElement).getPropertyValue('--etax-header').trim()==='0px','sticky offset remains');
        button.click();await tick();
        assert(dialog.open && styles(dialog).display!=='none','modal hidden');
        const rect=dialog.getBoundingClientRect();
        assert(rect.width>0 && rect.left>=0 && rect.right<=win.innerWidth && rect.bottom<=win.innerHeight+1,'modal outside viewport');
        assert(styles(doc.querySelector('.x-etax-view-controls')).display!=='none','controls hidden');
        assert(styles(doc.querySelector('.x-etax-masthead')).position==='static','masthead escaped');
        dialog.dispatchEvent(new win.Event('cancel',{cancelable:true}));await tick();
        assert(!dialog.open && !doc.documentElement.classList.contains('x-etax-management-open'),'Esc did not unlock page');
        button.click();
        dialog.dispatchEvent(new win.PointerEvent('pointerdown',{clientX:0,clientY:0}));
        dialog.dispatchEvent(new win.MouseEvent('click',{clientX:0,clientY:0}));await tick();
        assert(!dialog.open,'backdrop did not close');
      }
    });
    await test('画面遷移・再有効化で管理欄は自動表示されない',async()=>{
      await save({skin:'win95'});
      win.history.pushState({},'', '/search');win.dispatchEvent(new win.PopStateEvent('popstate'));await tick();
      assert(!doc.getElementById('x-etax-management-dialog').open,'navigation reopened management');
      doc.querySelector('.x-etax-management-toggle').click();
      await save({enabled:false});assert(!doc.documentElement.classList.contains('x-etax-management-open'),'scroll lock remains');
      await save({enabled:true});assert(!doc.getElementById('x-etax-management-dialog').open,'theme toggle opened dialog');
      win.history.pushState({},'', '/components.html');win.dispatchEvent(new win.PopStateEvent('popstate'));await save({skin:'classic',layout:'standard'});
    });
    await test('オフで元のDOMとスタイルに復元',async()=>{await save({enabled:false});assert(doc.getElementById('react-root').innerHTML===original,'original DOM was not fully restored');assert(!doc.querySelector('#x-etax-theme-banner'),'shell remains');assert(doc.querySelectorAll('[data-x-etax-part]').length===0,'adapter tags remain');});
    await test('元のいいねハンドラが動作',async()=>{await save({enabled:true,layout:'inbox',skin:'aol'});doc.querySelector('.x-etax-record-toggle').click();originalLike.click();assert(originalLike.getAttribute('aria-pressed')==='true','native click handler lost');});
    await test('動的に追加した投稿にも適用',async()=>{doc.getElementById('append-post').click();await tick();assert(doc.querySelectorAll('.x-etax-record-toggle').length===2,'new post not adapted');});
    await test('再利用した投稿DOMの内容と開閉状態を更新',async()=>{doc.getElementById('recycle-post').click();await tick();const button=doc.querySelector('.x-etax-record-toggle');assert(button.textContent.includes('仮想スクロール'),'stale summary');assert(button.getAttribute('aria-expanded')==='false','old expanded state leaked');});
    await test('投稿詳細へ遷移したら折りたたみ解除',async()=>{win.history.pushState({},'', '/sample/status/99');win.dispatchEvent(new win.PopStateEvent('popstate'));await tick();assert(doc.querySelectorAll('.x-etax-record-toggle').length===0,'detail route remains collapsed');assert(doc.documentElement.getAttribute('data-x-etax-page')==='detail','route not detected');});
    await test('戻る操作で一覧表示へ復帰',async()=>{win.history.pushState({},'', '/components.html');win.dispatchEvent(new win.PopStateEvent('popstate'));await tick();assert(doc.querySelectorAll('.x-etax-record-toggle').length===2,'list not restored');});
    await test('未知の投稿構造は内容を隠さない',async()=>{const row=doc.createElement('article');row.setAttribute('data-testid','tweet');row.textContent='未知の構造でも読める投稿';doc.getElementById('sample-feed').append(row);await tick();assert(!row.hasAttribute('data-x-etax-record'),'unsafe adapter applied');assert(styles(row).display!=='none','fallback hidden');row.remove();
      const nested=doc.createElement('article');nested.setAttribute('data-testid','tweet');
      nested.innerHTML='<div><div><span data-testid="User-Name">Author</span><span data-testid="tweetText">本文が投稿者と同じラッパーにある見本</span></div><div role="group"><button>返信</button></div></div>';
      doc.getElementById('sample-feed').append(nested);await tick();
      assert(!nested.hasAttribute('data-x-etax-record'),'mixed header/content wrapper was rearranged');nested.remove();
    });
    await test('画像表示設定を切替できる',async()=>{const toggle=doc.querySelector('.x-etax-record-toggle');if(toggle.getAttribute('aria-expanded')==='false')toggle.click();await save({media:'hidden'});assert(styles(doc.querySelector('[data-testid="tweetPhoto"]')).display==='none','media still shown');await save({media:'full'});assert(styles(doc.querySelector('[data-testid="tweetPhoto"]')).display!=='none','media not restored');});
    await test('再描画してもダイアログの入力を保持',async()=>{doc.getElementById('open-reply').click();const input=doc.querySelector('[data-testid="tweetTextarea_1"]');input.textContent='下書きを保持する';await save({skin:'win95'});assert(doc.getElementById('reply-dialog').open,'dialog closed');assert(input.textContent==='下書きを保持する','draft lost');doc.getElementById('close-reply').click();});
    await test('入れ子の入力欄に枠を二重適用しない',async()=>{
      await save({skin:'classic',layout:'standard'});
      assert(styles(doc.getElementById('editor-wrapper')).borderTopWidth==='0px','wrapper has duplicate border');
      assert(styles(doc.querySelector('[data-testid="tweetTextarea_0-richTextInput"]')).borderTopWidth==='1px','editor is unthemed');
    });
    await test('React外側のダイアログも内側の文字までテーマ適用',async()=>{
      await save({skin:'geocities'});doc.getElementById('open-reply').click();
      const button=doc.getElementById('demo-reply-send');
      assert(styles(doc.getElementById('dialog-host')).backgroundColor==='rgba(0, 0, 0, 0)','outer dialog host was painted');
      assert(styles(doc.getElementById('dialog-host')).borderTopWidth==='0px','outer dialog host has an extra border');
      assert(!doc.getElementById('react-root').contains(button),'portal fixture must be outside react-root');
      assert(styles(button).backgroundColor==='rgb(255, 237, 0)','portal button kept native background');
      assert(styles(button.querySelector('span')).color===styles(button).color,'inner text did not inherit');
      assert(styles(button.querySelector('span')).backgroundColor==='rgba(0, 0, 0, 0)','inner background leaked');
      doc.getElementById('close-reply').click();
    });
    await test('divで構成したサイドカードの内側に白背景を残さない',async()=>{
      await save({skin:'classic',sidebar:'show'});
      assert(styles(doc.querySelector('#nested-side-card > div')).borderTopWidth==='0px','heading wrapper has a duplicate card border');
      assert(styles(doc.getElementById('nested-side-card')).backgroundColor==='rgb(255, 254, 244)','card wrapper unthemed');
      assert(styles(doc.querySelector('#nested-side-card .r-14lw9ot')).backgroundColor==='rgba(0, 0, 0, 0)','inner white background leaked');
    });
    await test('追加UIからテーマ由来の固有名を除去',async()=>{
      assert(!/e-tax/i.test(doc.getElementById('x-etax-theme-banner').textContent),'name remains in injected UI');
    });
    await test('不正な設定を既定値へ戻す',async()=>{await save({layout:'invalid',skin:'<script>',sidebar:'other',media:'invalid'});assert(doc.documentElement.getAttribute('data-x-etax-layout')==='portal','layout not normalized');assert(doc.documentElement.getAttribute('data-x-etax-skin')==='official','skin not normalized');});
    await save({enabled:false});
    const responsive=document.createElement('iframe');responsive.title='レスポンシブ検証';responsive.style.maxWidth='none';responsive.style.height='900px';responsive.src='preview.html?layout=standard';document.body.append(responsive);
    await new Promise(resolve=>responsive.addEventListener('load',resolve,{once:true}));
    const rw=responsive.contentWindow,rd=responsive.contentDocument;
    await test('サンプルツールを同じモーダルに収め、オフ・再有効化で操作を保持',async()=>{
      const toolbar=rd.querySelector('[data-x-etax-management-tools]');
      const checkbox=rd.getElementById('demo-enabled');
      assert(rd.getElementById('x-etax-management-dialog').contains(toolbar),'preview tools remain outside');
      rd.querySelector('.x-etax-management-toggle').click();checkbox.click();await tick();
      assert(toolbar.isConnected && !rd.getElementById('x-etax-theme-banner'),'off lost preview controls');
      checkbox.click();await tick();
      assert(rd.getElementById('x-etax-management-dialog').contains(toolbar),'reenable lost tools');
      rd.querySelector('.x-etax-management-toggle').click();toolbar.querySelector('a[href="#sample-posts"]').click();await tick();
      assert(!rd.getElementById('x-etax-management-dialog').open,'sample link leaves modal blocking posts');
    });
    await test('業務照会は管理を閉じても使え、画面遷移とモード終了に追従',async()=>{
      const doc=rd,win=rw;const save=async values=>{await rw.chrome.storage.local.set(values);await tick();};
      await save({layout:'office',skin:'classic',managementCollapsed:true});
      const panel=doc.querySelector('.x-etax-office'), menu=panel.querySelector('details');
      assert(panel.getBoundingClientRect().height>0,'work menu hidden with management');
      assert(panel.querySelectorAll('a').length===6,'service entry missing');
      assert(panel.querySelector('[aria-current="page"]').textContent.includes('投稿一覧'),'current service missing');
      menu.querySelector('summary').click();assert(!menu.open,'menu did not fold');
      await save({skin:'forms'});assert(!menu.open,'redraw reopened menu');
      win.history.pushState({},'', '/sample/status/1');win.dispatchEvent(new win.PopStateEvent('popstate'));await tick();
      assert(panel.querySelector('.x-etax-office-title').textContent==='投稿内容確認','detail heading stale');
      assert(!doc.querySelector('.x-etax-record-toggle'),'detail content folded');
      await save({layout:'standard'});assert(!doc.querySelector('.x-etax-office'),'work menu remains in standard');
      win.history.pushState({},'', '/preview.html');win.dispatchEvent(new win.PopStateEvent('popstate'));await save({managementCollapsed:false});
    });
    await test('文言パターンを切り替えても本文・元ノード・操作の意味を保持',async()=>{
      await rw.chrome.storage.local.set({enabled:true,layout:'standard',skin:'classic',writing:'native'});await tick();
      const nav=rd.querySelector('[data-testid="AppTabBar_Notifications_Link"]');
      const post=rd.querySelector('[data-testid="tweetText"]'),body=post.textContent;
      const like=rd.querySelector('[data-demo-like]'),originalLabel=nav.textContent;
      await rw.chrome.storage.local.set({writing:'service'});await tick();assert(nav.textContent.includes('通知一覧'),'service vocabulary missing');
      await rw.chrome.storage.local.set({writing:'terminal'});await tick();assert(nav.textContent.includes('通知一覧'),'terminal vocabulary missing');
      assert(post.textContent===body && rd.querySelector('[data-demo-like]')===like,'content or native node changed');
      assert(like.dataset.xEtaxCaption==='いいね','like meaning changed');
      nav.querySelector('span').textContent='新しい機能';await tick();assert(nav.textContent.includes('新しい機能'),'React update overwritten');
      await rw.chrome.storage.local.set({writing:'native'});await tick();assert(nav.textContent.includes('新しい機能'),'stale original restored over native update');
      nav.querySelector('span').textContent=originalLabel;await tick();
    });
    await test('文言変更は利用者名・任意タブを変更せず、オフで元に戻る',async()=>{
      const primary=rd.querySelector('[data-testid="primaryColumn"]');
      const heading=rd.createElement('div');heading.dataset.xEtaxComponent='page-heading';heading.innerHTML='<h2>通知</h2>';primary.prepend(heading);
      rw.history.pushState({},'', '/sample_user');rw.dispatchEvent(new rw.PopStateEvent('popstate'));
      await rw.chrome.storage.local.set({writing:'terminal'});await tick();assert(heading.textContent==='通知','profile name translated');
      rw.history.pushState({},'', '/notifications');rw.dispatchEvent(new rw.PopStateEvent('popstate'));await tick();assert(heading.textContent==='通知一覧','notification heading not translated');
      const tab=rd.createElement('a');tab.setAttribute('role','tab');tab.textContent='フォロー中';rd.querySelector('[role="tablist"]').append(tab);
      rw.history.pushState({},'', '/preview.html');rw.dispatchEvent(new rw.PopStateEvent('popstate'));await tick();assert(tab.textContent==='フォロー中','custom tab translated');
      await rw.chrome.storage.local.set({enabled:false});await tick();assert(heading.textContent==='通知','heading not restored');assert(!rd.querySelector('[data-x-etax-writing]'),'wording flag remains');
      heading.remove();tab.remove();await rw.chrome.storage.local.set({enabled:true,writing:'native'});await tick();
    });
    for(const width of [216,390,878,1280])for(const layout of Object.keys(rw.XEtaxConfig.layouts))for(const skin of Object.keys(rw.XEtaxConfig.skins)){
      await test(`${width}px · ${layout} × ${skin} 横幅`,async()=>{
        responsive.style.width=width+'px';
        await rw.chrome.storage.local.set({layout,skin,enabled:true});await tick();
        assert(rd.documentElement.scrollWidth<=rw.innerWidth+2,`overflow ${rd.documentElement.scrollWidth} > ${rw.innerWidth}`);
        rd.querySelector('.x-etax-management-toggle').click();
        const dialog=rd.getElementById('x-etax-management-dialog'),rect=dialog.getBoundingClientRect();
        const select=rd.querySelector('[aria-label="情報の配置"]');
        assert(rect.left>=0 && rect.right<=rw.innerWidth+1 && rect.bottom<=rw.innerHeight+1,'modal clipped');
        assert(dialog.scrollWidth<=dialog.clientWidth+1,'modal horizontal overflow');
        assert(select.getBoundingClientRect().right<=rect.right,'mode selector clipped');
        rd.querySelector('.x-etax-management-close').click();
        const post=rd.querySelector('[data-testid="tweetButtonInline"]');
        assert(post.getBoundingClientRect().width>=90,'post button crushed');
        assert(post.getBoundingClientRect().height<70,'post button wrapped vertically');
      });
    }
    for(const width of [216,390,878,1280])for(const writing of ['service','terminal'])await test(`${width}px · 文言 ${writing}`,async()=>{
      responsive.style.width=width+'px';await rw.chrome.storage.local.set({writing,skin:'classic',layout:'office',enabled:true});await tick();
      assert(rd.documentElement.scrollWidth<=rw.innerWidth+2,'wording causes horizontal overflow');
      assert(rd.querySelector('.x-etax-office-group').textContent.includes(writing==='terminal'?'投稿一覧':'投稿一覧'),'wording missing');
      assert(rd.querySelector('[data-testid="tweetButtonInline"]').getBoundingClientRect().width>=90,'native submit button crushed');
    });
    await rw.chrome.storage.local.set({writing:'native'});await tick();
    await rw.chrome.storage.local.set({skin:'classic',layout:'standard',enabled:true,sidebar:'show'});responsive.style.width='1280px';await tick();
    await test('全4投稿の操作20個に文字ボタンを適用',async()=>{
      const buttons=[...rd.querySelectorAll('article [role="group"] :is(button,a)')];
      assert(buttons.length===20,'expected all four posts');
      assert(buttons.every(n=>n.hasAttribute('data-x-etax-caption')&&rw.getComputedStyle(n.querySelector('svg')).display==='none'),'native action icon remains');
      assert(rd.querySelectorAll('article [data-testid="caret"][data-x-etax-caption]').length===4,'more controls omitted');
    });
    await test('文字ボタンでも件数・元ノード・状態を保持',async()=>{
      const button=rd.querySelector('[data-demo-like]'),counter=button.querySelector('[data-demo-count]');button.click();await tick();
      assert(counter.isConnected&&counter.textContent==='129','counter node lost: '+counter.textContent+' / connected='+counter.isConnected+' / state='+button.getAttribute('aria-pressed'));
      assert(button.dataset.xEtaxCaption==='いいね済','state label stale');
      button.click();await tick();assert(counter.textContent==='128'&&button.dataset.xEtaxCaption==='いいね','state did not reset');
    });
    await test('名前のない補助操作と動的ラベル変更にも適用',async()=>{
      const button=rd.createElement('button');button.setAttribute('aria-label','タイムラインを管理');rd.querySelector('[data-testid="primaryColumn"]').append(button);await tick();
      assert(button.dataset.xEtaxCaption==='管理','manage unthemed');
      button.setAttribute('aria-label','次へ');await tick();assert(button.dataset.xEtaxCaption==='▶','changed label not detected');button.remove();
    });
    await test('画面を広げた後も右サイドの丸いカードを残さない',async()=>{
      responsive.style.width='878px';await tick();responsive.style.width='1280px';await tick();
      assert([...rd.querySelectorAll('[data-testid="sidebarColumn"] :is(section,aside)')].every(n=>parseFloat(rw.getComputedStyle(n).borderRadius)<=2),'native rounded card remains');
      assert(rd.querySelectorAll('[data-x-etax-component="side-card"]').length>=2,'visible cards were not rescanned');
    });
    await test('テーマを切ると元の操作アイコンを復元',async()=>{
      await rw.chrome.storage.local.set({enabled:false});await tick();
      assert(rd.querySelectorAll('[data-x-etax-caption]').length===0,'caption attributes remain');
      assert([...rd.querySelectorAll('article [role="group"] svg')].every(n=>rw.getComputedStyle(n).display!=='none'),'original icons not restored');
    });
    responsive.remove();
  }catch(error){failed++;summary.textContent=`${passed}件成功 / ${failed}件失敗 — ${error.message}`;}
  event.target.disabled=false;summary.dataset.complete='true';
});
