export function loginDestination(market='za',requested){
 const root=`/${market}`;
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
