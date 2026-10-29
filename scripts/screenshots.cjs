// Render only the hand-authored local demo. Never connects to a real X account.
const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs/promises');
const { startServer } = require('./server.cjs');
(async()=>{
 const server=await startServer();let browser;
 try {
  browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL ? {channel:process.env.PLAYWRIGHT_CHANNEL} : {})});
  const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
  const external=[];
  await page.route('**/*',route=>{
   if(new URL(route.request().url()).origin===server.url)return route.continue();
   external.push(route.request().url());return route.abort();
  });
  const output=path.resolve(__dirname,'../docs/screenshots');await fs.mkdir(output,{recursive:true});
  await page.goto(server.url+'/preview.html?layout=office&skin=classic&writing=terminal');
  await page.locator('.x-etax-record-toggle').first().waitFor({state:'visible'});
  await page.evaluate(()=>document.fonts.ready);
  await page.screenshot({path:path.join(output,'office-classic.png')});
  await page.getByRole('button',{name:'表示管理',exact:true}).click();
  await page.getByRole('dialog',{name:'表示管理',exact:true}).waitFor({state:'visible'});
  await page.setViewportSize({width:1440,height:680});
  await page.screenshot({path:path.join(output,'display-settings.png')});
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(server.url+'/preview.html?layout=standard&skin=win95&writing=native');
  await page.locator('html[data-x-etax-skin="win95"]').waitFor();
  await page.screenshot({path:path.join(output,'retro-win95.png')});
  if(external.length)throw new Error('Unexpected external requests: '+external.join(', '));
  console.log('Saved 3 screenshots of fictional data; 0 external requests.');
 } finally {await browser?.close();await server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
