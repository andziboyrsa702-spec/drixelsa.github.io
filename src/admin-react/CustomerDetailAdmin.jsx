import React from 'react';
import {Link,useParams} from 'react-router-dom';
import {useMarket} from '../context/MarketContext.jsx';
import useAdminRecord from './useAdminRecord.js';
import {useAdminData} from './useAdminData.js';
import AdminDataState from './AdminDataState.jsx';
const money=value=>new Intl.NumberFormat('en-ZA',{style:'currency',currency:'ZAR'}).format(Number(value)||0);
export default function CustomerDetailAdmin(){
 const{customerId}=useParams(),{market}=useMarket(),customer=useAdminRecord('users',customerId),connection=useAdminData(['orders']);
 if(customer.loading||customer.error)return <AdminDataState {...customer}/>;
 if(connection.loading||connection.error)return <AdminDataState {...connection}/>;
 const user=customer.data;
 if(!user)return <section className="ra-panel"><h2>Customer not found</h2><Link to={`/${market}/admin/customers`}>Back to customers</Link></section>;
 const orders=(connection.data.orders||[]).filter(order=>order.customer?.uid===customerId||order.userId===customerId),paid=orders.filter(order=>order.paymentStatus==='paid');
 return <><section className="ra-panel"><div className="ra-panel-head"><div><p className="ra-eyebrow">CUSTOMER DETAILS</p><h2>{user.name||[user.firstName,user.lastName].filter(Boolean).join(' ')||user.email||'Customer'}</h2></div><Link className="ra-cell-link" to={`/${market}/admin/customers`}>Back to customers</Link></div>
 <div className="ra-metrics"><Metric label="Lifetime paid spend" value={money(paid.reduce((sum,order)=>sum+Number(order.total||0),0))}/><Metric label="Orders" value={orders.length}/><Metric label="Email" value={user.email||'—'} small/><Metric label="Phone" value={user.phone||'—'} small/></div></section>
 <section className="ra-panel"><div className="ra-panel-head"><h2>Order history</h2><span>{orders.length} orders</span></div>{orders.length?<div className="ra-table-wrap"><table><thead><tr><th>Order</th><th>Payment</th><th>Fulfilment</th><th>Total</th></tr></thead><tbody>{orders.map(order=><tr key={order.id}><td><Link className="ra-cell-link" to={`/${market}/admin/orders/${order.id}`}>{order.orderNumber||order.id}</Link></td><td>{order.paymentStatus||'pending'}</td><td>{order.fulfillmentStatus||order.status||'processing'}</td><td>{money(order.total)}</td></tr>)}</tbody></table></div>:<div className="ra-empty">No orders are linked to this customer.</div>}</section></>;
}
function Metric({label,value,small}){return <div className="ra-metric"><span>{label}</span><strong className={small?'ra-small-value':''}>{value}</strong></div>;}
