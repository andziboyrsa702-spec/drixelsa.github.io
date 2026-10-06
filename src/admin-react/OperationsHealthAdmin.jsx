import React from 'react';
import {useAdminData} from './useAdminData.js';
import AdminDataState from './AdminDataState.jsx';
export default function OperationsHealthAdmin(){
 const state=useAdminData(['operations_health','email_campaigns']);
 if(state.loading||state.error)return <AdminDataState {...state}/>;
 const worker=state.data.operations_health.find(x=>x.id==='campaignWorker'),campaigns=state.data.email_campaigns||[],last=worker?.lastFinishedAt,stale=!last||Date.now()-last>15*60000;
 return <section className="ra-panel"><p className="ra-eyebrow">OPERATIONS / SERVICE HEALTH</p><h2>Campaign delivery health</h2><p role="status">{!worker?'No worker run recorded. Deploy and configure the campaign scheduler.':worker.status==='failed'?'The worker reported a failure.':stale?'No completed worker run in the last 15 minutes. Check scheduler and Function logs.':'The campaign worker has completed a recent run.'}</p><dl><dt>Last completed run</dt><dd>{last?new Intl.DateTimeFormat('en-ZA',{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Johannesburg'}).format(last)+' SAST':'Not recorded'}</dd><dt>Queued / scheduled campaigns</dt><dd>{campaigns.filter(c=>['queued','scheduled','sending'].includes(c.status)).length}</dd><dt>Campaigns requiring reconciliation</dt><dd>{campaigns.filter(c=>c.status==='delivery_unknown').length}</dd></dl>{worker?.lastError&&<p className="dx-error">{worker.lastError}</p>}<p>Accepted email is different from delivered email. Delivery counts require the signed provider webhook. Backups and production alerts must also be configured in Google Cloud.</p><button onClick={state.retry}>Refresh health</button></section>;
}
