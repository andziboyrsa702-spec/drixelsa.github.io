import test from 'node:test';
import assert from 'node:assert/strict';
import {ozowReadiness,ozowBase,validOzowRedirect,ozowPaymentRequest} from '../src/ozow.mjs';
test('Ozow is never advertised as enabled before payment verification is implemented',()=>{assert.equal(ozowReadiness({OZOW_MODE:'live',OZOW_CLIENT_ID:'a',OZOW_CLIENT_SECRET:'b',OZOW_SITE_CODE:'c',OZOW_WEBHOOK_SECRET:'d',OZOW_ENABLED:'true'}).enabled,false)});
test('Ozow URLs cannot redirect a customer to unrelated providers',()=>{assert.equal(validOzowRedirect('https://pay.ozow.com/secure'),true);assert.equal(validOzowRedirect('https://ozow.com.evil.test'),false);assert.equal(validOzowRedirect('http://pay.ozow.com'),false)});
test('payment request uses ZAR, server-owned reference and safe return URL',()=>{const p=ozowPaymentRequest({id:'order1',orderNumber:'DRX-123',paymentStatus:'pending',paymentMethod:'ozow',currency:'ZAR',total:320},'SITE','https://drixelsa.co.za');assert.equal(p.amount.currency,'ZAR');assert.equal(p.merchantReference,'order1');assert.ok(p.returnUrl.startsWith('https://drixelsa.co.za/'))});
