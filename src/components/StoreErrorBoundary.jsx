import React from 'react';
export default class StoreErrorBoundary extends React.Component {
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 componentDidCatch(error){console.error('Drixel interface failed:',error?.name||'Error');}
 render(){return this.state.failed?<main className="dx-empty" role="alert"><h1>We could not open this page.</h1><p>Your order is not confirmed by this message. Check your orders before submitting again.</p><button onClick={()=>location.reload()}>Reload page</button><p><a href="/za">Return to the store</a></p></main>:this.props.children;}
}
