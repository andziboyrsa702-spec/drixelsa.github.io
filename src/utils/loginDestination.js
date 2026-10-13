export function loginDestination(market='za',requested){
 const root=`/${market}`;
 if(['bag','wishlist','bag-reminder','wishlist-reminder'].includes(requested))return `${root}/${requested.startsWith('bag')?'cart':'wishlist'}${requested.endsWith('-reminder')?'?restore=reminder':''}`;
 if(requested==='checkout')return `${root}/checkout`;
 if(requested==='admin')return `${root}/admin/dashboard`;
 if(typeof requested==='string'&&!requested.includes('\\')){
  try{
  const path=new URL(requested,'https://drixelsa.co.za').pathname;
  if(requested.startsWith('/')&&!requested.startsWith('//')&&(path===`${root}/admin`||path.startsWith(`${root}/admin/`)))return requested;
  }catch{}
 }
 return `${root}/member/profile`;
}
