import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {adaptSource} from '../adapter.mjs';
test('Windows CRLF and Unix LF create identical handlers including atomic receipts',async()=>{
 const source=(await readFile(new URL('../../functions/index.js',import.meta.url),'utf8')).replace(/\r\n?/g,'\n');
 const unix=adaptSource(source),windows=adaptSource(source.replaceAll('\n','\r\n'));
 assert.equal(windows,unix);assert.ok(windows.includes('reserveReceipt(tx,orderPayload,orderRef.id)'));assert.ok(windows.includes('reserveEmailQuota'));
});
test('changed handler source fails safely instead of dropping stock/receipt logic',()=>{assert.throws(()=>adaptSource('exports.createOrder=()=>{}'),/Source adapter/);});
