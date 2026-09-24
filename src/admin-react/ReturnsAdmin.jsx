import React,{useEffect,useState}from"react";
import{addDoc,collection,doc,onSnapshot,serverTimestamp,updateDoc}from"firebase/firestore";
import{db}from"../config/firebase-react.js";
import{useDialog}from"../components/DialogProvider.jsx";

export default function ReturnsAdmin(){
  const dialog=useDialog();
  const[rows,setRows]=useState([]);
  const[orders,setOrders]=useState([]);
  const[form,setForm]=useState({orderId:"",reason:"",notes:""});

  useEffect(()=>{
    const stopReturns=onSnapshot(collection(db,"returns"),snap=>{
      setRows(snap.docs.map(item=>({id:item.id,...item.data()})));
    });
    const stopOrders=onSnapshot(collection(db,"orders"),snap=>{
      setOrders(
        snap.docs
          .map(item=>({id:item.id,...item.data()}))
          .filter(order=>order.paymentStatus==="paid")
      );
    });
    return()=>{
      stopReturns();
      stopOrders();
    };
  },[]);

  async function create(e){
    e.preventDefault();
    const order=orders.find(item=>item.id===form.orderId);
    if(!order||!form.reason.trim()){
      dialog.toast("Choose an order and enter a return reason.","error");
      return;
    }
    try{
      await addDoc(collection(db,"returns"),{
        orderId:order.id,
        orderNumber:order.orderNumber||order.id,
        customer:order.customer||{},
        reason:form.reason.trim(),
        notes:form.notes.trim(),
        status:"requested",
        createdAt:serverTimestamp(),
        updatedAt:serverTimestamp()
      });
      setForm({orderId:"",reason:"",notes:""});
      dialog.toast("Return case created.","success");
    }catch(error){
      dialog.toast(error.message||"Unable to create return.","error");
    }
  }

  async function changeStatus(item,next){
    if(next===(item.status||"requested"))return;
    const ok=await dialog.confirm({
      title:"Update return",
      message:`Change ${item.caseNumber||item.orderNumber||"this return"} to ${next}?`,
      confirmLabel:"Update"
    });
    if(!ok)return;
    try{
      await updateDoc(doc(db,"returns",item.id),{
        status:next,
        updatedAt:serverTimestamp()
      });
      dialog.toast("Return updated.","success");
    }catch(error){
      dialog.toast(error.message||"Unable to update return.","error");
    }
  }

  return(
    <div className="ra-studio-grid">
      <form className="ra-panel ra-composer" onSubmit={create}>
        <p className="ra-eyebrow">RETURNS DESK</p>
        <h2>Open return case</h2>
        <label>
          Paid order
          <select value={form.orderId} onChange={e=>setForm(current=>({...current,orderId:e.target.value}))}>
            <option value="">Select order</option>
            {orders.map(order=>(
              <option key={order.id} value={order.id}>
                {order.orderNumber||order.id} · {order.customer?.email||""}
              </option>
            ))}
          </select>
        </label>
        <label>
          Reason
          <input value={form.reason} onChange={e=>setForm(current=>({...current,reason:e.target.value}))}/>
        </label>
        <label>
          Internal notes
          <textarea rows="5" value={form.notes} onChange={e=>setForm(current=>({...current,notes:e.target.value}))}/>
        </label>
        <button type="submit">Create return</button>
      </form>

      <section className="ra-panel">
        <div className="ra-panel-head">
          <h2>Return queue</h2>
          <span>{rows.length} cases</span>
        </div>
        {rows.length?(
          <div className="ra-return-list">
            {rows.map(item=>(
              <article key={item.id}>
                <div>
                  <strong>{item.orderNumber||item.orderId}</strong>
                  <span>{item.reason}</span>
                  <small>{item.customer?.email||""}</small>
                </div>
                <div>
                  <b>{item.status||"requested"}</b>
                  <select value={item.status||"requested"} onChange={e=>changeStatus(item,e.target.value)}>
                    <option value="requested">Requested</option>
                    <option value="approved">Approved</option>
                    <option value="received">Received</option>
                    <option value="refunded">Refunded</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </article>
            ))}
          </div>
        ):(
          <div className="ra-empty">No return cases.</div>
        )}
      </section>
    </div>
  );
}
