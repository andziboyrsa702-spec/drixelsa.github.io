import React,{useEffect,useRef,useState} from 'react';
import {Link,useLocation} from 'react-router-dom';
import {useCart} from '../context/CartContext.jsx';
import {useMarket} from '../context/MarketContext.jsx';
import './CartReminder.css';
const BLOCKED=/(?:\/checkout(?:\/|$)|\/cart(?:\/|$)|\/bag(?:\/|$)|\/payment(?:\/|$)|\/order-confirmation(?:\/|$)|\/member\/orders(?:\/|$)|\/admin(?:\/|$))/i;
export default function CartReminder(){
 const cart=useCart(),{money,path}=useMarket(),location=useLocation();
 const [visible,setVisible]=useState(false),[dismissed,setDismissed]=useState(false),[recentlyAdded,setRecentlyAdded]=useState(false);
 const previous=useRef({path:null,count:null});
 const count=cart.count,allowed=!BLOCKED.test(location.pathname);
 useEffect(()=>{
  const prior=previous.current,changedRoute=prior.path!==location.pathname,added=prior.count!==null&&count>prior.count;
  previous.current={path:location.pathname,count};
  if(!count||!allowed){setVisible(false);setDismissed(false);return}
  if(added){setRecentlyAdded(true);setVisible(true);setDismissed(false)}
  else if(changedRoute){setRecentlyAdded(false);setVisible(true);setDismissed(false)}
 },[location.pathname,count,allowed]);
 useEffect(()=>{if(!visible)return;const timer=setTimeout(()=>setVisible(false),30000);return()=>clearTimeout(timer)},[visible,location.pathname,count]);
 if(!allowed||!count)return null;
 const item=cart.items[cart.items.length-1]||cart.items[0],photo=item?.image||item?.frontImage||'';
 return <div className="dx-cart-nudge-wrap" aria-live="polite">
  {visible?<aside className="dx-cart-nudge" aria-label="Your DRIXEL shopping bag">
   <div className="dx-cart-nudge-top"><span className="dx-cart-nudge-brand"><img src="/favicon-32x32.png" alt="" width="24" height="24"/> DRIXEL <small>YOUR BAG</small></span><button aria-label="Dismiss bag reminder" onClick={()=>{setVisible(false);setDismissed(true)}} type="button">×</button></div>
   <div className="dx-cart-nudge-content">{photo&&<img className="dx-cart-nudge-image" src={photo} alt={item?.name||'Item in your bag'}/>}<div><span className="dx-cart-nudge-eyebrow">{recentlyAdded?'ADDED TO YOUR BAG':'STILL THINKING IT OVER?'}</span><h2>{recentlyAdded?'Great choice.':'Your pieces are waiting.'}</h2><p>{count} {count===1?'item':'items'} in your bag</p><strong>{money(cart.subtotal)}</strong></div></div>
   <div className="dx-cart-nudge-actions"><Link className="dx-cart-nudge-primary" to={path('/za/checkout')} onClick={()=>setVisible(false)}>Complete checkout <span>↗</span></Link><Link className="dx-cart-nudge-secondary" to={path('/za/cart')} onClick={()=>setVisible(false)}>View your bag</Link></div>
   <p className="dx-cart-nudge-footer">Saved while you browse. Payment is only confirmed after secure verification.</p>
  </aside>:dismissed?<button className="dx-cart-nudge-pill" onClick={()=>{setVisible(true);setDismissed(false)}} type="button">DRIXEL BAG · {count} <span>↑</span></button>:null}
 </div>;
}
