export function productImages(product={}) {
 const list=[product.frontImage||product.image,product.backImage,...(product.images||[])];
 return [...new Set(list.filter(x=>typeof x==='string'&&x.trim()).map(x=>x.trim()))];
}
export function productPrice(product={},variant){
 const override=variant?.price;
 return Number(override!==''&&override!=null?override:product.price);
}
