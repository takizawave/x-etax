const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context=vm.createContext({});
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../extension/config.js'),'utf8'),context);
const config=context.XEtaxConfig;
test('all fifty layout and skin combinations and every preset are valid',()=>{
  assert.equal(Object.keys(config.layouts).length*Object.keys(config.skins).length,50);
  for(const layout of Object.keys(config.layouts))for(const skin of Object.keys(config.skins)){
    assert.equal(config.normalize('layout',layout),layout);assert.equal(config.normalize('skin',skin),skin);
  }
  for(const preset of config.presets){assert(config.layouts[preset.layout]);assert(config.skins[preset.skin]);}
});
test('old boolean settings survive and corrupt enum values cannot enter attributes',()=>{
  assert.equal(config.normalize('enabled',false),false);assert.equal(config.normalize('compact',true),true);
  for(const value of ['<script>',null,42,{},'constructor']){assert.equal(config.normalize('skin',value),'official');assert.equal(config.normalize('layout',value),'portal');}
});
test('routes distinguish detail, DM, notifications, search, saved posts and settings',()=>{
  for(const [path,expected] of Object.entries({'/home':'home','/alex/status/1':'detail','/messages/1':'messages','/i/chat/1':'messages','/notifications/mentions':'notifications','/search':'search','/i/bookmarks':'bookmarks','/settings/account':'settings','/alex':'profile','/compose/post':'compose'}))assert.equal(config.route(path).key,expected);
});

test('writing modes normalize independently from skins and layouts',()=>{
  for(const value of ['native','service','terminal'])assert.equal(config.normalize('writing',value),value);
  assert.equal(config.normalize('writing','invalid'),'native');
  for(const preset of config.presets)if(preset.writing)assert(config.writings[preset.writing]);
});
