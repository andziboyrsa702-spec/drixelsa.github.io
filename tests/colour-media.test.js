import test from 'node:test';import assert from 'node:assert/strict';import {productImages} from '../src/utils/productMedia.js';
const p={frontImage:'/original-front',backImage:'/original-back',mainColor:'Black',colorImages:[{color:'Black',frontImage:'/black-front',backImage:'/black-back'},{color:'Blue',frontImage:'/blue-front',backImage:'/blue-back'}]};
test('each selected colour and main shop colour resolve to their own front/back',()=>{assert.deepEqual(productImages(p),['/black-front','/black-back']);assert.deepEqual(productImages(p,'Blue'),['/blue-front','/blue-back']);assert.deepEqual(productImages(p,'Red'),[])});
test('old product photos still work before colour photography is configured',()=>assert.deepEqual(productImages({frontImage:'/front',backImage:'/back'},'White'),['/front','/back']));
test('explicit views exclude old designs but retain deliberately selected detail photos',()=>{
 assert.deepEqual(productImages({frontImage:'new-front',backImage:'new-back',images:['old-design']}),['new-front','new-back']);
 assert.deepEqual(productImages({frontImage:'new-front',backImage:'new-back',images:['old-design'],galleryImages:['detail']}),['new-front','new-back','detail']);
 assert.deepEqual(productImages({image:'legacy-front',images:['legacy-back']}),['legacy-front','legacy-back']);
});
