import React from 'react';
export default class AdminErrorBoundary extends React.Component {
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){
  if(!this.state.failed)return this.props.children;
  return <section className="ra-panel ra-data-state" role="alert"><p className="ra-eyebrow">WORKSPACE ERROR</p><h2>This workspace could not open</h2><p>Try opening it again, or choose another page from the navigation. Your saved store records are unaffected.</p><button type="button" onClick={()=>this.setState({failed:false})}>Try again</button></section>;
 }
}
