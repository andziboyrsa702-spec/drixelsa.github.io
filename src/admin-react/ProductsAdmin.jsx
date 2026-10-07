import React,{useState} from 'react';
import {Link} from 'react-router-dom';
import {doc,writeBatch,serverTimestamp} from 'firebase/firestore';
import {db} from '../config/firebase-react.js';
import {useMarket} from '../context/MarketContext.jsx';
import {useDialog} from '../components/DialogProvider.jsx';
import {useAdminData} from './useAdminData.js';
import AdminDataState from './AdminDataState.jsx';
export default function ProductsAdmin(){
 const connection=useAdminData(['products']),{market,money,pricingError}=useMarket(),dialog=useDialog();
 const [search,setSearch]=useState(''),[filter,setFilter]=useState('all'),[selected,setSelected]=useState([]),[busy,setBusy]=useState(false);
 const products=connection.data.products||[],rows=products.filter(p=>(filter==='all'||(p.active!==false)===(filter==='active'))&&[p.name,p.title,p.category,p.urlCode].join(' ').toLowerCase().includes(search.toLowerCase()));
 async function visibility(ids,active){
  if(busy||!ids.length)return;
  if(!await dialog.confirm({title:active?'Show products':'Hide products',message:`${active?'Show':'Hide'} ${ids.length} products on the storefront? Stock quantities will be preserved.`,confirmLabel:active?'Show products':'Hide products',danger:!active}))return;
  setBusy(true);let completed=0;
  try{for(let i=0;i<ids.length;i+=400){const batch=writeBatch(db);ids.slice(i,i+400).forEach(id=>batch.update(doc(db,'products',id),{active,updatedAt:serverTimestamp()}));await batch.commit();completed+=Math.min(400,ids.length-i);}setSelected([]);dialog.toast(`${completed} products ${active?'shown':'hidden'}.`,'success');}
  catch(e){dialog.toast(`${completed} products updated. ${e.message}`,'error');}finally{setBusy(false);}
 }
 if(connection.loading||connection.error)return <AdminDataState {...connection}/>;
 return <section className="ra-panel"><div className="ra-panel-head"><div><p className="ra-eyebrow">CATALOGUE CONTROL</p><h2>Products</h2><p>{products.length} total · {products.filter(p=>p.active!==false).length} active · {products.filter(p=>p.active===false).length} hidden</p></div><Link to={`/${market}/admin/products/new`}>New product</Link></div>
 <div className="ra-catalogue-tools"><label>Search products<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name, category or URL code"/></label><label>Visibility<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All products</option><option value="active">Active</option><option value="hidden">Hidden</option></select></label></div>
 <div className="ra-filter-bar"><button disabled={busy||!rows.length} onClick={()=>setSelected(rows.map(p=>p.id))}>Select shown ({rows.length})</button><button onClick={()=>setSelected([])}>Clear selection</button><button disabled={busy||!selected.length} onClick={()=>visibility(selected,true)}>Show selected ({selected.length})</button><button disabled={busy||!selected.length} onClick={()=>visibility(selected,false)}>Hide selected</button><button disabled={busy||!products.length} onClick={()=>visibility(products.map(p=>p.id),true)}>Show all products</button><button disabled={busy||!products.length} onClick={()=>visibility(products.map(p=>p.id),false)}>Hide all products</button></div>
 {pricingError&&<p role="status">{pricingError} Configure the rate in Market settings.</p>}
 <div className="ra-table-wrap"><table><thead><tr><th>Select</th><th>Product</th><th>Price</th><th>Inventory</th><th>Visibility</th><th>Actions</th></tr></thead><tbody>{rows.map(p=><tr key={p.id}><td><input aria-label={`Select ${p.name||p.title}`} type="checkbox" checked={selected.includes(p.id)} onChange={e=>setSelected(ids=>e.target.checked?[...ids,p.id]:ids.filter(id=>id!==p.id))}/></td><td><div className="ra-catalogue-product">{(p.frontImage||p.image)&&<img src={p.frontImage||p.image} alt=""/>}<div><strong>{p.name||p.title||'Untitled product'}</strong><small>{p.category||'Uncategorised'}</small></div></div></td><td>{money(p.price)}</td><td>{p.variants?.length?p.variants.reduce((n,v)=>n+Number(v.stock??v.quantity??0),0):Number(p.stock??p.quantity??0)} units</td><td>{p.active===false?'Hidden':'Active'}</td><td><div className="ra-admin-actions"><button disabled={busy} onClick={()=>visibility([p.id],p.active===false)}>{p.active===false?'Show':'Hide'}</button><Link to={`/${market}/admin/products/${p.id}`}>Edit</Link></div></td></tr>)}</tbody></table></div>{!rows.length&&<p className="ra-empty">{products.length?'No products match these filters.':'No products yet. Create your first product.'}</p>}</section>;
}
