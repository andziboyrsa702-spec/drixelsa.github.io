const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
test('campaign default fetch keeps the runtime receiver and batch metadata', async () => {
  let calls = 0;
  const context = vm.createContext({exports: {}, require, process, AbortSignal, setTimeout});
  vm.runInContext(`globalThis.fetch = function(url, options) {
    'use strict';
    if (this !== globalThis) throw new TypeError('Illegal invocation');
    globalThis.requestBody = JSON.parse(options.body);
    return Promise.resolve({ok:true, json:async()=>({data:[{id:'provider-id'}]})});
  };`, context);
  vm.runInContext(fs.readFileSync(require('node:path').join(__dirname, '../functions/marketing-delivery.js'),'utf8'), context);
  const messages = [{to:['subscriber@example.com'], headers:{'List-Unsubscribe':'<https://example.com/unsubscribe>'}, tags:[{name:'campaign',value:'abc'}]}];
  const result = await context.exports.submitBatch(messages, 'campaign/stable/1', {pause:async()=>{calls++;}});
  assert.equal(result[0].id, 'provider-id');
  assert.equal(calls, 0);
  assert.deepEqual(JSON.parse(JSON.stringify(context.requestBody)), messages);
});
