const labels=value=>[...new Set((Array.isArray(value)?value:typeof value==='string'?value.split(','):[]).filter(x=>typeof x==='string').map(x=>x.trim()).filter(Boolean))];
export function productOptions(product={},color=''){
 const variants=Array.isArray(product.variants)?product.variants.filter(v=>v&&typeof v==='object'):[];
 const colors=variants.length?labels(variants.map(v=>v.color)):labels(product.colors||product.colours);
 const sizes=variants.length?labels(variants.filter(v=>!color||v.color===color).map(v=>v.size)):labels(product.sizes);
 return {variants,colors,sizes};
}
export function selectedVariant(product={},size='',color=''){
 const {variants,colors}=productOptions(product),hasSize=variants.some(v=>v.size);
 if((colors.length&&!color)||(hasSize&&!size))return undefined;
 return variants.find(v=>(!color||v.color===color)&&(!size||v.size===size));
}
export const optionStock=(product,variant)=>Number(variant?variant.stock??variant.quantity??0:product.stock??product.quantity??0);
