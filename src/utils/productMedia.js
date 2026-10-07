export function productImages(product={},color='') {
 const rows=Array.isArray(product.colorImages)?product.colorImages:[];
 const chosen=color||product.mainColor;
 const row=rows.find(x=>String(x.color||'').toLowerCase()===String(chosen||'').toLowerCase());
 const list=row?[row.frontImage,row.backImage,...(row.images||[])]:color&&rows.length?[]:[product.frontImage||product.image,product.backImage,...(product.images||[])];
 return [...new Set(list.filter(x=>typeof x==='string'&&x.trim()).map(x=>x.trim()))];
}
export function productPrice(product={},variant){
 const override=variant?.price;
 return Number(override!==''&&override!=null?override:product.price);
}
