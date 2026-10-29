const { chromium } = require('playwright');
const { startServer } = require('./server.cjs');
(async()=>{
 const server=await startServer();let browser;
 try {
  browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL ? {channel:process.env.PLAYWRIGHT_CHANNEL} : {})});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[],external=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',route=>{
   if(new URL(route.request().url()).origin===server.url)return route.continue();
   external.push(route.request().url());return route.abort();
  });
  for(const [file,button,result] of [['browser-tests.html','検証を実行','#summary'],['flicker-tests.html','ちらつきを検証','#result']]) {
   await page.goto(server.url+'/'+file);
   await page.getByRole('button',{name:button,exact:true}).click();
   await page.locator(result+'[data-complete="true"]').waitFor({timeout:120000});
   const summary=await page.locator(result).innerText();
   const failures=await page.locator('.fail').allTextContents();
   console.log(file+': '+summary);
   if(failures.length || /^FAIL/m.test(summary))throw new Error(failures.join('\n')||summary);
  }
  if(errors.length || external.length)throw new Error(JSON.stringify({errors,external}));
  console.log('No browser errors or external requests.');
 } finally {await browser?.close();await server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
