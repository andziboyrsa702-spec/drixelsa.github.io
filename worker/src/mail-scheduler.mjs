// Both queues get a turn. An order receipt must not starve marketing campaigns.
export async function runMailQueues({order,campaign,health,now=Date.now}){
 const failures=[];
 for(const [name,tick] of [['orderMail',order],['campaignWorker',campaign]]){
  try{await tick();await health(name,{status:'ok',lastFinishedAt:now(),lastError:'',errorCode:''});}
  catch(error){const status=Number(error.status)||0;await health(name,{status:'failed',lastFinishedAt:now(),errorCode:error.code||'',lastError:error.code==='FAILED_PRECONDITION'?'Firestore query prerequisite failed. Deploy firestore:indexes for drixel-sa and wait until the index is enabled.':'Queue processing failed'+(status?' (HTTP '+status+')':'')}).catch(()=>{});failures.push(error);}
 }
 if(failures.length)throw new AggregateError(failures,'Email queue processing failed. Check operations_health and provider logs.');
}
