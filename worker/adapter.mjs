// Git on Windows may check out CRLF. Normalize before matching shared handlers.
export function adaptSource(source){
source=source.replace(/\r\n?/g,'\n');
source=source.replace(/const functions = require\("firebase-functions\/v1"\);[\s\S]*?const ALLOWED_ADMIN_EMAILS/,`const {functions,getAuth,getFirestore,FieldValue}=require('../src/runtime.mjs');\nconst admin={auth:getAuth,firestore:getFirestore};\nconst {submitBatch,unsubscribeMarkup,deliveryKey,pause}=require('../../functions/marketing-delivery');\nconst {sendMail}=require('../src/email.mjs');\nconst ALLOWED_ADMIN_EMAILS`);
source=source.replace(/const commerce = require\('\.\/commerce'\);[\s\S]*?\/\/ Background marketing queue/, '// Background marketing queue');
source=source.replace('require("./campaign-engine")','require("../../functions/campaign-engine")').replace("require('./campaign-engine')","require('../../functions/campaign-engine')");
source=source.replace('db:admin.firestore(),FieldValue,requireAdmin,cors:marketingCors','db:admin.firestore(),FieldValue,requireAdmin,cors:marketingCors,send:async(messages,key)=>{await require("../src/email.mjs").reserveEmailQuota(key,messages.length);return submitBatch(messages,key);}');
source=source.replace('process.env.FUNCTIONS_EMULATOR==="true"','process.env.ALLOW_LOCAL_ORIGINS==="true"');
source=source.replace(/async function createYocoCheckout\([\s\S]*?(?=exports.verifyYocoPayment)/, 'async function createYocoCheckout(input){return require("../src/payments.mjs").startCheckout(input)}\n');
source=source.replace(/const MARKET_CONFIG=\{[^\n]*\};/, 'const MARKET_CONFIG=require("../../src/i18n/markets.js").MARKETS;');
source=source.replace(/async function marketRate\(market\)\{[^\n]*\}/, 'async function marketRate(market){const cfg=marketConfig(market);return cfg.currency==="ZAR"?1:(await require("../src/market-pricing.mjs").marketPricing.rateFor(cfg.currency)).rate}');
source=source.replaceAll('require("crypto")','require("node:crypto")');
source=source.replace(/async function requireAdmin\(req\) \{[\s\S]*?(?=exports\.sendCampaign)/,'async function requireAdmin(req){return require("../src/auth.mjs").adminUser(req)}\n\n');
source=source.replace('const MAX_CHECKOUT_ITEMS = 40','const MAX_CHECKOUT_ITEMS = 8');
source=source.replace('tx.set(orderRef,{orderNumber', 'const orderPayload={orderNumber').replace('updatedAt:FieldValue.serverTimestamp()});\n        tx.set(keyRef', 'updatedAt:FieldValue.serverTimestamp()};tx.set(orderRef,orderPayload);require("../src/order-mail.mjs").reserveReceipt(tx,orderPayload,orderRef.id);\n        tx.set(keyRef');
if(source.includes('firebase-admin')||source.includes('firebase-functions')||!source.includes('reserveReceipt(tx,orderPayload,orderRef.id)')||!source.includes('startCheckout(input)')||!source.includes('CAMPAIGN')&& !source.includes('reserveEmailQuota'))throw Error('Source adapter did not match current Firebase handlers. Update build mappings before deploying.');
return source;
}
