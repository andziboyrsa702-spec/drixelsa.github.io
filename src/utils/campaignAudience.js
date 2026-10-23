export function campaignAudience(subscribers, orders, filters = {}) {
 if(filters.kind==='order_customers'){const recipients=new Map();for(const o of orders){const address=String(o.customer?.email||'').trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)||!filters.orderStatus||o.status!==filters.orderStatus||filters.market&&o.market!==filters.market)continue;recipients.set(address,{email:address});}return [...recipients.values()];}
 const paid=new Set(orders.filter(o=>o.paymentStatus==='paid').map(o=>String(o.customer?.email||'').trim().toLowerCase()));
 const affected=new Set(orders.filter(o=>!filters.orderStatus||o.status===filters.orderStatus).map(o=>String(o.customer?.email||'').trim().toLowerCase()));
 return [...new Map(subscribers.filter(s=>!s.suppressed&&(!s.status||s.status==='active')&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s.email||'').trim())&&(!filters.source||s.source===filters.source)&&(!filters.market||s.market===filters.market)&&(filters.purchase!=='buyers'||paid.has(s.email.trim().toLowerCase()))&&(filters.purchase!=='nonbuyers'||!paid.has(s.email.trim().toLowerCase()))&&(!filters.orderStatus||affected.has(s.email.trim().toLowerCase()))).map(s=>[s.email.trim().toLowerCase(),s])).values()];
}
export function scheduleUtc(local) {
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local))throw Error('Choose a valid send date and time.');
 const date=new Date(local+':00+02:00');if(!Number.isFinite(date.getTime())||date.getTime()<=Date.now()||date.getTime()>Date.now()+365*86400000)throw Error('Choose a future send time.');return date.toISOString();
}
