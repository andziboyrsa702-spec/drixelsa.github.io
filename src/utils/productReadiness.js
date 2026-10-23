import {productImages} from './productMedia.js';
export function productReadiness(product){
 const issues=[];
 const variants=Array.isArray(product.variants)?product.variants:[];
 if(!(variants.length?variants.some(v=>Number(v.stock??v.quantity??0)>0):Number(product.stock??product.quantity??0)>0))issues.push('No stock');
 if(!product.name&&!product.title)issues.push('Missing name');
 if(!(Number(product.price)>0))issues.push('Missing price');
 if(productImages(product).length<2)issues.push('Front/back photos incomplete');
 if(!product.sizeGuide?.rows?.some(r=>r.size&&Number(r.chest)>0&&Number(r.length)>0))issues.push('Measurements not published');
 if(!product.description?.trim())issues.push('Missing description');
 return issues;
}
