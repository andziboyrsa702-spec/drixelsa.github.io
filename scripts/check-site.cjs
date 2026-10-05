const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.name==='node_modules'||e.name.startsWith('.')?[]:e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);}
for(const file of files('.').filter(f=>f.endsWith('.js'))) execFileSync(process.execPath,['--check',file]);
const js=fs.readFileSync('index.js','utf8');
assert(!js.includes("id: 'tok_live_'"));assert(!/localStorage\.setItem\(['"]drixel_(yoco_secret_key|resend_api_key)/.test(js));
for(const file of files('.').filter(f=>f.endsWith('.html'))) {const text=fs.readFileSync(file,'utf8');assert(!/id="(?:cardNumber|cvc|yocoPaymentModal)"/.test(text),file+' contains legacy card inputs');assert(text.includes('<title>'),file+' has no title');}
assert(JSON.parse(fs.readFileSync('firebase.json')).firestore.rules==='firestore.rules');
console.log('JavaScript syntax, safe checkout assets and deployment configuration checks passed.');
