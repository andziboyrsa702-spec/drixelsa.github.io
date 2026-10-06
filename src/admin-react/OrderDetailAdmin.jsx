import React, {useState} from 'react';
import {Link, useParams} from 'react-router-dom';
import {orderAction} from './adminApi.js';
import {useDialog} from '../components/DialogProvider.jsx';
import {useMarket} from '../context/MarketContext.jsx';
import useAdminRecord from './useAdminRecord.js';
import AdminDataState from './AdminDataState.jsx';
const money=(value,currency='ZAR')=>new Intl.NumberFormat('en-ZA',{style:'currency',currency}).format(Number(value)||0);
export default function OrderDetailAdmin(){
 const {orderId}=useParams(),{market}=useMarket(),dialog=useDialog(),connection=useAdminRecord('orders',orderId),[busy,setBusy]=useState('');
 const order=connection.data;
 async function act(action){
  if(busy)return;
  const cancel=action==='cancel',paid=action==='mark_paid';
  const confirmed=await dialog.confirm({title:cancel?'Cancel order':paid?'Confirm payment':'Update fulfilment',message:cancel?'Cancel this unpaid order and restore its reserved stock?':paid?'Confirm you have verified receipt of this manual payment. This action is recorded in the audit log.':`Move this order to ${action}? This action is recorded in the audit log.`,confirmLabel:cancel?'Cancel order':paid?'Mark paid':'Update order',danger:cancel});
  if(!confirmed)return;
  setBusy(action);
  try{await orderAction(orderId,action);dialog.toast(cancel?'Order cancelled and reserved inventory restored.':paid?'Manual payment verified.':`Fulfilment updated to ${action}.`,'success');}
  catch(error){dialog.toast(error.message||'Order could not be updated.','error');}finally{setBusy('');}
 }
 if(connection.loading||connection.error)return <AdminDataState {...connection}/>;
 if(!order)return <section className="ra-panel"><h2>Order not found</h2><Link to={`/${market}/admin/orders`}>Back to orders</Link></section>;
 const cancelled=order.status==='cancelled'||order.fulfillmentStatus==='cancelled',paid=order.paymentStatus==='paid',refunded=order.paymentStatus==='refunded',provider=order.paymentProvider||order.paymentMethod,manual=['bank','bank_transfer','eft','manual'].includes(provider);
 const fulfilment=order.fulfillmentStatus||order.status||'processing',next={pending:'processing',pending_payment:'processing',processing:'packed',packed:'shipped',shipped:'delivered'}[fulfilment];
 const customer=order.customer||{},address=order.shippingAddress||customer,currency=order.currency||'ZAR';
 const created=order.createdAt?.seconds?new Date(order.createdAt.seconds*1000):new Date(order.createdAt);
 return <section className="ra-panel">
  <div className="ra-panel-head"><div><p className="ra-eyebrow">ORDER DETAILS</p><h2>{order.orderNumber||order.id}</h2><p>{!isNaN(created)?created.toLocaleString('en-ZA'):'Creation date unavailable'}</p></div><Link className="ra-cell-link" to={`/${market}/admin/orders`}>Back to orders</Link></div>
  {order.paymentStatus==="test_paid"&&<p className="ra-notice">TEST ORDER: no real funds were collected. Do not dispatch.</p>}{["yoco","snapscan"].includes(provider)&&order.paymentStatus==="pending"&&<p className="ra-notice">Provider confirmation is pending. Reconcile the payment with the provider before cancellation. Reserved stock stays protected while the payment can complete.</p>}<div className="ra-admin-actions">
   {!paid&&!cancelled&&!refunded&&manual&&<button disabled={!!busy} onClick={()=>act('mark_paid')}>Mark manual payment paid</button>}
   {!paid&&!cancelled&&!refunded&&manual&&<button className="danger" disabled={!!busy} onClick={()=>act('cancel')}>Cancel unpaid order</button>}
   {paid&&!cancelled&&order.status!=="payment_review"&&next&&<button disabled={!!busy} onClick={()=>act(next)}>{busy?'Updating…':`Mark ${next}`}</button>}
  </div>
  <div className="ra-metrics" style={{marginTop:24}}>
   <Metric label="Payment" value={order.paymentStatus||'pending'} note={provider||'Method unavailable'}/>
   <Metric label="Fulfilment" value={fulfilment}/><Metric label="Order total" value={money(order.total,currency)}/>
   <Metric label="Inventory" value={order.inventoryStatus||'Not recorded'}/>
  </div>
  <div className="ra-order-details"><section><h3>Customer</h3><p>{[customer.firstName,customer.lastName].filter(Boolean).join(' ')||'Name unavailable'}{'\n'}{customer.email||'Email unavailable'}{'\n'}{customer.phone||'Phone unavailable'}</p></section>
   <section><h3>Delivery address</h3><p>{[address.address||address.street,address.city,address.province,address.postalCode,address.country].filter(Boolean).join('\n')||'No delivery address recorded.'}</p></section></div>
  <h3>Order items</h3><div className="ra-table-wrap"><table><thead><tr><th>Product</th><th>Variant / SKU</th><th>Quantity</th><th>Line total</th></tr></thead><tbody>{(order.items||[]).map((item,index)=><tr key={item.sku||index}><td>{item.name||item.title||item.productId}</td><td>{[item.color,item.size,item.sku].filter(Boolean).join(' / ')||'—'}</td><td>{item.quantity}</td><td>{money(item.lineTotal??Number(item.price||0)*Number(item.quantity||0),currency)}</td></tr>)}</tbody></table></div>
  {!order.items?.length&&<p className="ra-empty">No line items recorded.</p>}
  <div className="ra-order-totals"><div><span>Subtotal</span><span>{order.subtotal!=null?money(order.subtotal,currency):'Not recorded'}</span></div>
   {!!order.discount&&<div><span>Discount</span><span>−{money(order.discount,currency)}</span></div>}
   <div><span>Shipping</span><span>{order.shipping!=null?money(order.shipping,currency):'Not recorded'}</span></div><div><span>Total</span><span>{money(order.total,currency)}</span></div></div>
 </section>;
}
function Metric({label,value,note}){return <div className="ra-metric"><span>{label}</span><strong>{value}</strong>{note&&<small>{note}</small>}</div>;}
