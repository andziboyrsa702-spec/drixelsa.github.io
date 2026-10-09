import {test} from 'node:test';
import assert from 'node:assert/strict';
import {productReadiness} from '../src/utils/productReadiness.js';
test('catalogue readiness reports genuine missing data without making up stock',()=>{
 const p={name:'Tee',price:300,stock:0};const issues=productReadiness(p);assert.ok(issues.includes('No stock'));assert.ok(issues.includes('Front/back photos incomplete'));assert.ok(issues.includes('Missing description'));assert.equal(p.stock,0);
});
test('variant stock is checked independently of product stock',()=>{
 const issues=productReadiness({name:'Tee',price:300,description:'Heavyweight cotton',stock:0,variants:[{size:'M',stock:3}],image:'/front.png',images:['/front.png','/back.png']});assert.ok(!issues.includes('No stock'));
});
