const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const base = path.join(__dirname, '../extension');
const configCode = fs.readFileSync(path.join(base, 'config.js'), 'utf8');
const code = fs.readFileSync(path.join(base, 'content.js'), 'utf8');

function fixture(saved = {}, delayed = false) {
  const classes = new Set();
  const children = [];
  let onChange, resolve;
  const makeElement = (tag = "div") => ({
    tag,
    isConnected: false, children: [], events: {},
    attributes: {},
    classList: { values: new Set(), contains(name) { return this.values.has(name); }, toggle(name) { if (this.values.has(name)) { this.values.delete(name); return false; } this.values.add(name); return true; } },
    setAttribute(name, value) { this.attributes[name] = value; },
    getAttribute(name) { return this.attributes[name] ?? null; },
    removeAttribute(name) { delete this.attributes[name]; },
    querySelectorAll(selector) {
      const all = this.children.flatMap(node => [node, ...node.querySelectorAll('*')]);
      return selector === '*' ? all : all.filter(node => node.tag === selector);
    },
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; },
    addEventListener(name, callback) { this.events[name] = callback; },
    append(...nodes) { this.children.push(...nodes); },
    remove() { this.isConnected = false; const index = children.indexOf(this); if (index >= 0) children.splice(index, 1); }
  });
  const document = {
    documentElement: { setAttribute() {}, removeAttribute() {}, classList: { add(name) { classes.add(name); }, remove(name) { classes.delete(name); }, toggle(name, on) { on ? classes.add(name) : classes.delete(name); } } },
    createElement: makeElement,
    querySelectorAll() { return []; },
    querySelector() { return null; },
    body: { prepend(node) { children.unshift(node); node.isConnected = true; } }
  };
  const chrome = { storage: {
    local: { get: defaults => delayed ? new Promise(r => { resolve = () => r({ ...defaults, ...saved }); }) : Promise.resolve({ ...defaults, ...saved }) },
    onChanged: { addListener(listener) { onChange = listener; } }
  } };
  const scrollListeners = new Set();
  const window = {
    scrollY: 0, location: { pathname: '/home' },
    requestAnimationFrame(callback) { setImmediate(callback); },
    addEventListener(name, callback) { if (name === 'scroll') scrollListeners.add(callback); },
    removeEventListener(name, callback) { if (name === 'scroll') scrollListeners.delete(callback); },
    scrollTo({ top }) { this.scrollY = top; scrollListeners.forEach(callback => callback()); }
  };
  const context = vm.createContext({ document, chrome, window, MutationObserver: class { observe() {} disconnect() {} } });
  vm.runInContext(configCode, context);
  vm.runInContext(code, context);
  return { classes, children, window, scrollListeners, change: (changes, area = 'local') => onChange(changes, area), resolve: () => resolve() };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('default applies decoration; disabling removes every injected element and root flag', async () => {
  const f = fixture(); await settle();
  assert(f.classes.has('x-etax-enabled'));
  assert.equal(f.children.length, 1);
  f.change({ compact: { newValue: true } });
  assert(f.classes.has('x-etax-compact'));
  f.change({ enabled: { newValue: false } });
  assert.equal(f.classes.size, 0);
  assert.equal(f.children.length, 0);
  f.change({ enabled: { newValue: true } });
  f.change({ enabled: { newValue: true } });
  assert.equal(f.children.length, 1);
  assert(f.classes.has('x-etax-compact'));
});
test('saved disabled setting does not briefly insert the theme', async () => {
  const f = fixture({ enabled: false, compact: true });
  assert.equal(f.classes.size, 0);
  await settle();
  assert.equal(f.classes.size, 0);
  assert.equal(f.children.length, 0);
});
test('a live toggle wins over an older asynchronous initial read', async () => {
  const f = fixture({ enabled: true, compact: true }, true);
  f.change({ enabled: { newValue: false } });
  f.resolve(); await settle();
  assert.equal(f.classes.size, 0);
  assert.equal(f.children.length, 0);
  f.change({ enabled: { newValue: true } });
  assert(f.classes.has('x-etax-compact'), 'unrelated saved settings survive the race');
});
test('other storage areas are ignored; removed settings restore defaults', async () => {
  const f = fixture(); await settle();
  f.change({ enabled: { newValue: false } }, 'sync');
  assert(f.classes.has('x-etax-enabled'));
  f.change({ enabled: { newValue: false } });
  f.change({ enabled: {} });
  assert(f.classes.has('x-etax-enabled'));
});
test('invalid settings fall back to boolean defaults', async () => {
  const f = fixture({ enabled: 'false', compact: 1 }); await settle();
  assert(f.classes.has('x-etax-enabled'));
  assert(!f.classes.has('x-etax-compact'));
});
test('scroll shrinks the masthead; top button restores it; disable cleans up the listener', async () => {
  const f = fixture(); await settle();
  assert.equal(f.scrollListeners.size, 1);
  f.window.scrollTo({ top: 600 });
  assert(f.classes.has('x-etax-scrolled'));
  const button = f.children[0].children.find(node => node.className === 'x-etax-top');
  button.events.click();
  assert.equal(f.window.scrollY, 0);
  assert(!f.classes.has('x-etax-scrolled'));
  f.window.scrollTo({ top: 700 });
  f.change({ enabled: { newValue: false } });
  assert.equal(f.classes.size, 0);
  assert.equal(f.scrollListeners.size, 0);
  f.change({ enabled: { newValue: true } });
  f.change({ compact: { newValue: true } });
  assert.equal(f.scrollListeners.size, 1);
  assert(f.classes.has('x-etax-scrolled'));
});
test('package uses MV3, storage only, scoped hosts, and existing assets', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(base, 'manifest.json'), 'utf8'));
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions, ['storage']);
  assert.equal(manifest.background, undefined);
  assert.deepEqual(manifest.content_scripts[0].matches, ['https://x.com/*', 'https://twitter.com/*', 'https://www.x.com/*', 'https://www.twitter.com/*']);
  const assets = [manifest.action.default_popup, ...manifest.content_scripts.flatMap(s => [...s.js, ...s.css])];
  for (const asset of assets) assert(fs.existsSync(path.join(base, asset)), asset);
  const html = fs.readFileSync(path.join(base, manifest.action.default_popup), 'utf8');
  for (const match of html.matchAll(/(?:src|href)="([^" :]+\.(?:css|js))"/g)) assert(fs.existsSync(path.join(base, match[1])));
  const scripts = [code, fs.readFileSync(path.join(base, 'popup.js'), 'utf8')].join('\n');
  assert(!/\b(fetch|XMLHttpRequest|WebSocket)\s*\(/.test(scripts));
});

test('legacy management settings never auto-open the modal or disable the theme', async () => {
  const f=fixture({managementCollapsed:true});await settle();
  const toggle=f.children[0].children.find(n=>n.className==='x-etax-management-toggle');
  assert.equal(toggle.textContent,'表示管理');assert.equal(toggle.attributes['aria-expanded'],'false');
  assert(f.classes.has('x-etax-enabled'));
  f.change({managementCollapsed:{newValue:false}});
  assert.equal(toggle.textContent,'表示管理');assert.equal(toggle.attributes['aria-expanded'],'false');
});
