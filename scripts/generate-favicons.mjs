import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
// Generate each platform icon from the same transparent vector artwork.
// Run after Playwright Chromium is installed, as part of the deployment build.
const source=await readFile(resolve('public/favicon.svg'),'utf8');
const out=resolve('dist');
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();
 const sizes={16:'favicon-16x16.png',32:'favicon-32x32.png',48:'favicon-48x48.png',64:'favicon-64x64.png',150:'mstile-150x150.png',180:'apple-touch-icon.png',192:'android-chrome-192x192.png',512:'android-chrome-512x512.png'};
 const payload=Buffer.from(source).toString('base64');
 const results=await page.evaluate(async ({payload,sizes})=>{
  const image=new Image();
  image.src='data:image/svg+xml;base64,'+payload;
  await image.decode();
  const result={};
  for(const [size,name] of Object.entries(sizes)){
   const canvas=document.createElement('canvas');canvas.width=canvas.height=Number(size);
   const ctx=canvas.getContext('2d');ctx.clearRect(0,0,Number(size),Number(size));
   ctx.drawImage(image,0,0,Number(size),Number(size));
   result[name]=canvas.toDataURL('image/png').split(',')[1];
  }
  return result;
 },{payload,sizes});
 for(const [filename,b64] of Object.entries(results))await writeFile(resolve(out,filename),Buffer.from(b64,'base64'));
 const icoSizes=[16,32,48,64],images=icoSizes.map(n=>Buffer.from(results[sizes[n]],'base64'));
 const ico=Buffer.alloc(6+16*icoSizes.length);ico.writeUInt16LE(1,2);ico.writeUInt16LE(icoSizes.length,4);
 let offset=ico.length;
 for(let i=0;i<icoSizes.length;i++){const entry=6+i*16,sz=icoSizes[i];ico[entry]=sz;ico[entry+1]=sz;ico[entry+2]=0;ico[entry+3]=0;ico.writeUInt16LE(1,entry+4);ico.writeUInt16LE(32,entry+6);ico.writeUInt32LE(images[i].length,entry+8);ico.writeUInt32LE(offset,entry+12);offset+=images[i].length}
 await writeFile(resolve(out,'favicon.ico'),Buffer.concat([ico,...images]));
 console.log('DRIXEL icons generated for desktop browsers, tablets, iOS and Android.');
}finally{await browser.close()}
