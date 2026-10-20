import React from 'react';
export default class StoreErrorBoundary extends React.Component {
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 componentDidCatch(error){
  console.error('DRIXEL page render failed:',error);
  const detail=String(error?.message||'');
  const chunkFailure=/dynamically imported module|loading chunk|chunkloaderror|failed to fetch.*module/i.test(detail);
  if(chunkFailure){
   try {
    const key='drixel_asset_retry:'+location.pathname;
    if(sessionStorage.getItem(key)!=='1'){
     sessionStorage.setItem(key,'1');
     location.reload();
    }
   }catch{}
  }
 }
 render(){
  if(!this.state.failed)return this.props.children;
  return <main className="dx-empty" role="alert" style={{minHeight:'65vh',display:'grid',placeContent:'center',justifyItems:'center',textAlign:'center',padding:'28px 20px',background:'#fff'}}>
   <h1 style={{fontSize:26,letterSpacing:'-.04em'}}>This page couldn't load</h1>
   <p style={{maxWidth:420}}>Please try again. Your saved bag and payment status have not been changed.</p>
   <button type="button" onClick={()=>location.reload()} style={{background:'#111',color:'#fff',border:0,borderRadius:8,padding:'13px 23px',cursor:'pointer'}}>Try again</button>
   <p><a href="/za">Visit the DRIXEL store</a></p>
  </main>;
 }
}
