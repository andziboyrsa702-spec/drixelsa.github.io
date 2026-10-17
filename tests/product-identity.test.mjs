import test from 'node:test';
import assert from 'node:assert/strict';
import {newProductCode,fillVariantCodes,replaceProductPhoto,STANDARD_SIZES} from '../src/utils/productIdentity.js';
test('automatic product codes are unique and stable inputs to size SKUs',()=>{
 const code=newProductCode();assert.match(code,/^drx-[a-f0-9-]{36}$/);assert.notEqual(code,newProductCode());
 const variants=fillVariantCodes(STANDARD_SIZES.map(size=>({size,color:'Black',stock:0})),code);
 assert.equal(new Set(variants.map(v=>v.sku)).size,STANDARD_SIZES.length);assert.ok(variants.every(v=>v.sku.startsWith(code.toUpperCase()+'-BLACK-')));
 assert.deepEqual(fillVariantCodes(variants,'renamed-product'),variants);
 assert.equal(fillVariantCodes([{sku:'LEGACY',size:'M'}],code)[0].sku,'LEGACY');
});
test('photo replacement removes only the previous view from the gallery and updates main colour',()=>{
 const p={frontImage:'old',image:'old',backImage:'back',images:['old','back','detail'],mainColor:'Black',colorImages:[{color:'Black',frontImage:'old'},{color:'White',frontImage:'white'}]};
 const changed=replaceProductPhoto(p,'frontImage','new');assert.deepEqual(changed.images,['back','detail']);assert.equal(changed.colorImages[0].frontImage,'new');assert.equal(changed.colorImages[1].frontImage,'white');assert.equal(p.frontImage,'old');
});

test('standard sizes preserve existing stock and create only missing colour combinations',async()=>{
 const {addStandardVariants}=await import('../src/utils/productIdentity.js');
 const original={size:'M',color:'Black',sku:'KEEP-M',stock:8};
 const p={urlCode:newProductCode(),colorImages:[{color:'Black'},{color:'White'}],variants:[original]};
 const rows=addStandardVariants(p);assert.equal(rows.length,12);assert.deepEqual(rows.find(v=>v.sku==='KEEP-M'),original);assert.ok(rows.filter(v=>v.sku!=='KEEP-M').every(v=>v.stock===0));assert.deepEqual(addStandardVariants({...p,variants:rows}),rows);
});
