import {MARKETS} from '../i18n/markets.js';
export const categories={
 'new-featured':['New & Featured Streetwear','Explore the latest Drixel collection: T-shirts, hoodies, sweaters and accessories.'],
 tees:['Streetwear T-Shirts','Discover Drixel tees and T-shirts. Browse product photos, available colours and sizes.'],
 hoodies:['Streetwear Hoodies','Explore Drixel hoodies and find available colours, sizes and product details.'],
 sweaters:['Streetwear Sweaters','Browse Drixel sweaters, view garment details and choose your available size.'],
 accessories:['Streetwear Accessories','Explore Drixel accessories and the details that complete your everyday look.']
};
export const information={
 about:['About Drixel SA','Discover the story and vision of Drixel SA, a South African streetwear brand founded in 2025.'],
 contact:['Contact Drixel','Get in touch with Drixel customer care for product questions and order support.'],
 'size-guide':['Clothing Size Guide','Use the Drixel size guide to compare measurements and choose your clothing fit.'],
 community:['Drixel Community','Explore the Drixel community and membership experience.'],
 feedback:['Feedback & Concerns','Share feedback or report a concern to the Drixel team.'],
 customize:['Custom Apparel — Coming Soon','Find out about the upcoming Drixel custom apparel studio.'],
 'help/terms-of-use':['Terms & Conditions','Read the terms and conditions for shopping with Drixel SA.'],
 'help/returns-policy':['Returns & Refunds','Read Drixel’s returns and refund policy before placing your order.'],
 'help/shipping-policy':['Shipping & Delivery','Read Drixel’s shipping policy for delivery information and order guidance.'],
 'help/privacy-policy':['Privacy Policy','Learn how Drixel handles personal information and your privacy choices.']
};
export const cleanPath=path=>path==='/'?'/':path.replace(/\/+$/,'');
export function pageMetadata(path){
 const [market,...parts]=cleanPath(path).slice(1).split('/'),info=MARKETS[market];
 if(!info)return null;
 const suffix=parts.join('/');
 if(!suffix)return {title:`Drixel ${info.country} | South African Streetwear`,description:`Shop Drixel T-shirts, hoodies, sweaters and accessories. Explore South African streetwear with prices in ${info.currency} for ${info.country}.`};
 const entry=suffix.startsWith('w/')?categories[suffix.slice(2)]:information[suffix];
 return entry?{title:`${entry[0]} | Drixel ${info.country}`,description:entry[1]+(suffix.startsWith('w/')?` View prices in ${info.currency} for ${info.country}.`:'')}:null;
}
export function alternates(path,origin){
 const parts=cleanPath(path).split('/');if(!MARKETS[parts[1]])return [];
 return [...Object.entries(MARKETS).filter(([m])=>m!=='eu').map(([m,info])=>({lang:'en-'+info.countryCode,url:origin+'/'+m+'/'+parts.slice(2).join('/')})),{lang:'x-default',url:origin+'/za/'+parts.slice(2).join('/')}].map(x=>({...x,url:x.url.replace(/\/$/,'')}));
}
