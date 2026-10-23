export const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function safeEmailUrl(value){if(typeof value!=='string'||!value.trim())return '';try{const url=new URL(value,'https://drixelsa.co.za');return url.protocol==='https:'&&!url.username&&!url.password?url.href:''}catch{return ''}}
export function emailMoney(value,currency='ZAR'){if(!Number.isFinite(Number(value)))return '—';try{return new Intl.NumberFormat('en-ZA',{style:'currency',currency}).format(Number(value))}catch{return 'ZAR '+Number(value).toFixed(2)}}
export function productEmailRows(items=[],{currency='ZAR',baseCurrency='ZAR',order=false}={}){
 return '<table role="presentation" style="width:100%;border-collapse:collapse;table-layout:fixed">'+items.map(item=>{
  const lineCurrency=order&&item.displayUnitPrice==null&&item.displayLineTotal==null?baseCurrency:currency,image=safeEmailUrl(item.image),quantity=Math.max(1,Number(item.quantity)||1),unit=order?(item.displayUnitPrice??item.unitPrice??item.price):item.price,total=order?(item.displayLineTotal??item.lineTotal??Number(unit)*quantity):Number(unit)*quantity;
  return '<tr><td style="width:76px;padding:12px 12px 12px 0;border-bottom:1px solid #ddd;vertical-align:top">'+(image?'<img src="'+escapeHtml(image)+'" alt="" width="64" style="display:block;max-width:64px;height:auto;background:#eee">':'')+'</td><td style="overflow-wrap:anywhere;padding:12px 0;border-bottom:1px solid #ddd"><strong>'+escapeHtml(item.name||'Drixel product')+'</strong><br><span>'+escapeHtml([item.color,item.size,item.sku].filter(Boolean).join(' · '))+'</span><br>Qty '+escapeHtml(quantity)+' · '+escapeHtml(emailMoney(unit,lineCurrency))+' each</td><td style="padding:12px 0 12px 8px;border-bottom:1px solid #ddd;width:96px;text-align:right;vertical-align:top;overflow-wrap:anywhere">'+escapeHtml(emailMoney(total,lineCurrency))+'</td></tr>';
 }).join('')+'</table>';
}
export function orderSummary(order){
 const currency=order.displayCurrency||order.currency||'ZAR',baseCurrency=order.currency||'ZAR';
 const amount=(display,base)=>escAmount(display!=null?display:base,display!=null?currency:baseCurrency);
 return '<h2 style="font-size:20px">Your items</h2>'+productEmailRows(order.items||[],{currency,baseCurrency,order:true})+'<p>Subtotal: '+amount(order.displaySubtotal,order.subtotal)+(Number(order.discount)>0?'<br>Discount: −'+amount(order.displayDiscount,order.discount):'')+'<br>Delivery: '+amount(order.displayShipping,order.shipping)+'<br><strong>Total: '+amount(order.displayTotal,order.total)+'</strong></p>';
}
const escAmount=(amount,currency)=>escapeHtml(emailMoney(amount,currency));
