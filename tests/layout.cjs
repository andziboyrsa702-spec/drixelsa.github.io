const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {mockStorefront}=require('./browser-fixtures.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH,args:['--no-sandbox']} : {})});
 const context=await browser.newContext({viewport:{width:1280,height:900}});
 await mockStorefront(context);
 // Exercise each static detail URL with its matching product, not an empty state.
 await context.addInitScript(()=>{ window.__layoutAudit=true; });
 const page=await context.newPage();
 const paths=fs.readdirSync('.', {recursive:true}).filter(p=>p.endsWith('.html')&&!p.includes('node_modules')&&!p.startsWith('.git'));
 const results=[];
 for(const width of [320,360,390,768,1024,1440]) {
  await page.setViewportSize({width,height:900});
  for(const path of paths) {
   await page.goto('http://127.0.0.1:8765/'+path+(path==='product.html'?'?id=tee':path==='orderConfirmation.html'?'?order=order123':''));
   await page.waitForFunction(()=>window.firebaseAuthInitialized===true);
   await page.waitForFunction(()=>document.querySelector('.newsletter-section'));
   await page.evaluate(()=>document.fonts.ready);
   if(path==='product.html'||/products\/[^/]+\/[^/]+\/index.html/.test(path)) {
    await page.waitForFunction(()=>document.querySelector('.product-info h1'));
   }
   await page.locator('#cookieConsent').evaluateAll(es=>es.forEach(e=>e.remove()));
   const over=await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width&&r.height&&s.visibility==='visible'&&s.display!=='none'&&(r.right>innerWidth+2||r.left< -2)&&!e.closest('.video-carousel-container,.hero,.nav-links,.toast-container,.cart-drawer:not(.active)')}).map(e=>({tag:e.tagName,cls:e.className,x:Math.round(e.getBoundingClientRect().x),w:Math.round(e.getBoundingClientRect().width)})).slice(0,8));
   if(path==='checkout.html') {
    for(const card of await page.locator('.payment-method-card').all()) {
     const radio=await card.locator('input').boundingBox(),label=await card.locator('.pm-text').boundingBox();
     assert(radio.x+radio.width<=label.x, 'Payment label overlaps its radio');
    }
    const columns=await page.locator('.checkout-container > *').all();
    const a=await columns[0].boundingBox(),b=await columns[1].boundingBox();
    assert(a.y+a.height<=b.y+1||a.x+a.width<=b.x+1,'Checkout columns overlap');
   }
   if(width<=768 && path==='index.html') {
    await page.locator('#mobileMenuBtn').click();
    await page.waitForFunction(()=>getComputedStyle(document.getElementById('navLinks')).visibility==='visible');
    const menu=await page.locator('#navLinks').boundingBox(),header=await page.locator('.navbar').boundingBox();
    assert(menu.y>=header.y+header.height-1 && menu.y<900,'Mobile menu is not below the header');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#mobileMenuBtn').getAttribute('aria-expanded'),'false');
   }
   if(over.length)results.push({width,path,over});
   if(process.env.SCREENSHOT_DIR && ['checkout.html','cart.html','contact.html','auth.html','products.html','product.html','orderConfirmation.html'].includes(path)&&[360,1024].includes(width))await page.screenshot({path:process.env.SCREENSHOT_DIR+'/layout-'+path+'-'+width+'.png',fullPage:true});
  }
 }
 console.log(JSON.stringify({pages:paths.length,widths:6,issues:results}));await browser.close();assert.deepEqual(results,[],'Visible content extends beyond viewport');
})().catch(e=>{console.error(e);process.exit(1)});
