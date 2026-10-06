import test from 'node:test';
import assert from 'node:assert/strict';
import {validCart,readCart,writeCart} from '../src/utils/cartStorage.js';
test('corrupt and malformed saved carts cannot break checkout',()=>{
 assert.deepEqual(validCart({items:[]}),[]);
 assert.deepEqual(readCart({getItem:()=>'{broken'}),[]);
 assert.deepEqual(validCart([null,{productId:'tee',price:-1},{price:20}]),[]);
 const cart=validCart([{productId:'tee',price:'250',quantity:Infinity},{productId:'hoodie',price:500,quantity:2.9}]);
 assert.equal(cart[0].quantity,1);assert.equal(cart[1].quantity,2);
 assert.equal(validCart([{productId:'tee',price:250,quantity:999}])[0].quantity,99);
});
test('blocked browser storage keeps the cart usable',()=>{
 assert.deepEqual(readCart({getItem:()=>{throw Error('blocked')}}),[]);
 assert.doesNotThrow(()=>writeCart({setItem:()=>{throw Error('quota')}},[]));
});

test('Pages deep-link restoration preserves query and hash and rejects external paths', async()=>{
 const {readFileSync}=await import('node:fs');const {runInNewContext}=await import('node:vm');
 const source=readFileSync('src/main.jsx','utf8');
 const restore=source.slice(source.indexOf('const incomingRoute'),source.indexOf('createRoot(document'));
 for(const [route,expected] of [['/za/search?q=tee#results','/za/search?q=tee#results'],['//example.com',undefined],['/\\example.com',undefined]]){
  let changed;runInNewContext(restore,{URLSearchParams,location:{search:'?__drixel_route='+encodeURIComponent(route)},history:{replaceState:(state,title,url)=>{changed=url}}});assert.equal(changed,expected);
 }
});
