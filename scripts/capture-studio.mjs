// Capture actual browser evidence; never replace with a generated illustration.
// Usage: node scripts/capture-studio.mjs http://localhost:4173 before
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
const base=process.argv[2]||'http://localhost:4173';
const label=(process.argv[3]||'after').replace(/[^a-zA-Z0-9_-]/g,'');
const folder='artifacts/studio/'+label;
await fs.mkdir(folder,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 for(const cfg of [{name:'desktop-1440',width:1440,height:900},{name:'mobile-390',width:390,height:844}]){
  const context=await browser.newContext({viewport:{width:cfg.width,height:cfg.height},deviceScaleFactor:1,hasTouch:cfg.width<500,isMobile:cfg.width<500});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(base.replace(/\/$/,'')+'/za/studio',{waitUntil:'domcontentloaded',timeout:45000});
  await page.locator('.dx-virtual-gallery').waitFor({timeout:30000});
  await page.waitForTimeout(3500);
  await page.screenshot({path:`${folder}/${cfg.name}.png`,fullPage:true,animations:'disabled'});
  const details=await page.evaluate(()=>({
    title:document.title,canvas:!!document.querySelector('.dx-virtual-canvas'),
    productCount:document.querySelectorAll('.dx-virtual-index button').length,
    gallery:document.querySelector('.dx-virtual-gallery')?.getBoundingClientRect().toJSON(),
    viewport:{width:innerWidth,height:innerHeight}
  }));
  await fs.writeFile(`${folder}/${cfg.name}.json`,JSON.stringify({...details,errors},null,2));
  await context.close();
 }
}finally{await browser.close()}
