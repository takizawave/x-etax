'use strict';
const input = document.querySelector('[data-testid^="tweetTextarea_"][contenteditable="true"]');
const submit = document.querySelector('[data-testid="tweetButtonInline"]');
input.addEventListener('input',()=>{submit.disabled=!input.textContent.trim();});
submit.addEventListener('click',()=>{document.getElementById('compose-status').textContent='サンプル内で入力を確認しました。外部への投稿はありません。';});
const dialog=document.getElementById('reply-dialog');
for(const id of ['open-reply','sample-reply'])document.getElementById(id).addEventListener('click',()=>dialog.showModal());
for(const id of ['close-reply','demo-reply-send'])document.getElementById(id).addEventListener('click',()=>dialog.close());
const menu=document.getElementById('demo-menu'), menuButton=document.getElementById('open-menu');
function closeMenu(){menu.hidden=true;menuButton.setAttribute('aria-expanded','false');menuButton.focus();}
menuButton.addEventListener('click',()=>{menu.hidden=!menu.hidden;menuButton.setAttribute('aria-expanded',String(!menu.hidden));});
menu.addEventListener('click',closeMenu);document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!menu.hidden)closeMenu();});
document.getElementById('demo-dm-send').addEventListener('click',()=>{document.getElementById('dm-status').textContent='サンプルを確認しました。DMは送信していません。';});
document.getElementById('retry').addEventListener('click',event=>{event.target.parentElement.textContent='再試行を確認しました（サンプル）。';});
document.querySelectorAll('[role="tab"]').forEach(tab=>tab.addEventListener('click',()=>{document.querySelectorAll('[role="tab"]').forEach(item=>item.setAttribute('aria-selected',String(item===tab)));}));
let count=1;
document.getElementById('append-post').addEventListener('click',()=>{
  count++;
  const article=document.createElement('article');article.setAttribute('data-testid','tweet');
  const avatar=document.createElement('div');avatar.setAttribute('data-testid','UserAvatar-Container-new');avatar.textContent='NW';
  const body=document.createElement('div');body.className='tweet-body';
  const name=document.createElement('div');name.setAttribute('data-testid','User-Name');name.textContent='New User '+count;
  const text=document.createElement('div');text.setAttribute('data-testid','tweetText');text.textContent='動的に追加した投稿 '+count+'。追加入力にも同じ表示を適用します。';
  const actions=document.createElement('div');actions.setAttribute('role','group');
  const like=document.createElement('button');like.setAttribute('data-demo-like','');like.setAttribute('data-testid','like');like.textContent='♡ 128';actions.append(like);
  body.append(name,text,actions);article.append(avatar,body);document.getElementById('sample-feed').append(article);
});
document.getElementById('recycle-post').addEventListener('click',()=>{
  const article=document.querySelector('article[data-testid="tweet"]');
  article.querySelector('[data-testid="tweetText"]').textContent='仮想スクロールで差し替えた別の投稿。';
  article.querySelector('a[href*="/status/"]').href='https://x.com/sample/status/99';
});
