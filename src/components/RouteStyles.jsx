import React,{useEffect,useState} from 'react';
import {useLocation} from 'react-router-dom';

// Load route-specific CSS before revealing the route. Do not flash unstyled markup.
// Keep CSS split by route to avoid global collisions between checkout, admin, and shop.
const cssFor=path=>{
 if(/\/t\//.test(path))return import('../styles/product.css');
 if(/\/cart$/.test(path))return import('../styles/cart.css');
 if(/\/checkout$/.test(path))return import('../styles/checkout.css');
 if(/\/member\/(?:profile|orders)(?:\/|$)/.test(path))return import('../styles/account.css');
 if(/\/member\/(?:login|drixel-callback)(?:\/|$)/.test(path))return import('../styles/auth.css');
 if(/\/order-confirmation\//.test(path))return import('../styles/order-confirmation.css');
 if(/\/admin(?:\/|$)/.test(path))return import('../styles/admin-react.css');
 return Promise.resolve();
};
const loaded=new Set();
export default function RouteStyles({children}){
 const {pathname}=useLocation();
 const [ready,setReady]=useState(loaded.has(pathname));
 useEffect(()=>{
  let live=true;
  if(loaded.has(pathname)){setReady(true);return()=>{live=false}};
  setReady(false);
  cssFor(pathname).then(()=>{loaded.add(pathname);if(live)setReady(true)})
   .catch(error=>{console.error('DRIXEL route style failed to load',pathname,error);
    // Avoid hiding the page forever if a stylesheet request fails.
    if(live)setReady(true);
   });
  return()=>{live=false};
 },[pathname]);
 if(!ready)return <div role="status" aria-live="polite" style={{minHeight:'100dvh',display:'flex',alignItems:'center',justifyContent:'center',background:'#fff',color:'#111',fontFamily:'Arial, sans-serif',letterSpacing:'.1em'}}>
  <div style={{textAlign:'center'}}><strong style={{fontSize:26,letterSpacing:'-.06em'}}>DRIXEL</strong><p style={{fontSize:11,letterSpacing:'.18em',marginTop:18}}>OPENING THE STORE</p></div>
 </div>;
 return children;
}
