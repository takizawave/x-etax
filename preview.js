'use strict';
for (const key of ['enabled', 'compact']) {
  const input = document.getElementById(`demo-${key}`);
  if (!input) continue;
  chrome.storage.local.get(XEtaxConfig.defaults).then(settings => { input.checked = settings[key]; });
  input.addEventListener('change', () => chrome.storage.local.set({ [key]: input.checked }));
}
if (new URLSearchParams(location.search).has('mini')) document.documentElement.classList.add('demo-mini');
document.querySelectorAll('a[href="#"]').forEach(link => link.addEventListener('click', event => event.preventDefault()));
document.querySelector('form[role="search"]')?.addEventListener('submit', event => event.preventDefault());
// Every interaction here affects sample data only.
document.addEventListener('click', event => {
  const like = event.target.closest('[data-demo-like]');
  if (like) { const active = like.getAttribute('aria-pressed') !== 'true'; like.setAttribute('aria-pressed', String(active)); like.setAttribute('data-testid', active ? 'unlike' : 'like'); const counter=like.querySelector('[data-demo-count]'); if(counter)counter.textContent=active?'129':'128';else like.textContent = active ? '♥ 129' : '♡ 128'; }
  const follow = event.target.closest('[data-demo-follow]');
  if (follow) { const active = follow.getAttribute('aria-pressed') !== 'true'; follow.setAttribute('aria-pressed', String(active)); follow.setAttribute('data-testid', active ? 'sample-unfollow' : 'sample-follow'); follow.textContent = active ? 'フォロー中' : 'フォローする'; }
});

// Fixture-only analytics links keep the preview on sample data.
document.querySelectorAll('a[href$="/analytics"]').forEach(link=>link.addEventListener('click',event=>event.preventDefault()));

// Public demo only: prevent app navigation and form submission; no real account actions.
document.addEventListener('click', event => {
  const link=event.target.closest('a');
  if(link && (link.origin!==location.origin || /^\/(sample|compose|settings|home|explore|notifications|messages|i)($|\/)/.test(link.pathname)))event.preventDefault();
});
document.addEventListener('submit', event => event.preventDefault());
