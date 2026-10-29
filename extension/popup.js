'use strict';
const config = globalThis.XEtaxConfig;
const fields = Object.fromEntries(Object.keys(config.defaults).map(key => [key, document.getElementById(key)]));
const status = document.getElementById('status');
let current = { ...config.defaults };
for (const key of ['layout', 'skin', 'writing']) {
  for (const [value, item] of Object.entries(key === 'layout' ? config.layouts : key === 'skin' ? config.skins : config.writings)) {
    const option = document.createElement('option'); option.value = value; option.textContent = item.name; fields[key].append(option);
  }
}
function render() {
  for (const [key, field] of Object.entries(fields)) {
    if (typeof config.defaults[key] === 'boolean') field.checked = current[key]; else field.value = current[key];
  }
  document.getElementById('layout-help').textContent = config.layouts[current.layout].description;
  document.getElementById('skin-help').textContent = config.skins[current.skin].description;
  document.getElementById('writing-help').textContent = config.writings[current.writing].description;
  status.textContent = current.enabled ? `${config.layouts[current.layout].name} × ${config.skins[current.skin].name} · ${config.writings[current.writing].name} を適用中` : 'オフ · X本来の画面を表示します。';
}
async function save(values) {
  for (const field of Object.values(fields)) field.disabled = true;
  document.querySelectorAll('[data-preset]').forEach(button => { button.disabled = true; });
  try {
    await chrome.storage.local.set(values);
    Object.assign(current, values); render();
  } catch {
    render(); status.textContent = '保存できませんでした。もう一度お試しください。';
  } finally {
    for (const field of Object.values(fields)) field.disabled = false;
    document.querySelectorAll('[data-preset]').forEach(button => { button.disabled = false; });
  }
}
for (const preset of config.presets) {
  const button = document.createElement('button'); button.type = 'button'; button.disabled = true;
  button.setAttribute('data-preset', preset.name); button.textContent = preset.name;
  button.addEventListener('click', () => save({ layout: preset.layout, skin: preset.skin, writing: preset.writing || current.writing }));
  document.getElementById('presets').append(button);
}
chrome.storage.local.get(config.defaults).then(saved => {
  for (const key of Object.keys(current)) current[key] = config.normalize(key, saved[key]);
  for (const [key, field] of Object.entries(fields)) {
    field.disabled = false;
    field.addEventListener('change', () => save({ [key]: typeof config.defaults[key] === 'boolean' ? field.checked : field.value }));
  }
  document.querySelectorAll('[data-preset]').forEach(button => { button.disabled = false; });
  render();
}).catch(() => { status.textContent = '設定を読み込めませんでした。拡張を開き直してください。'; });
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  for (const key of Object.keys(current)) if (Object.hasOwn(changes, key)) current[key] = config.normalize(key, changes[key].newValue);
  render();
});
