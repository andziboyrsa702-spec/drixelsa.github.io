export const campaignImages = Array.from({length:9},(_,i)=>({
 src:`/assets/campaigns/campaign-${String(i+1).padStart(2,'0')}.jpeg`,
 title:`Drixel seasonal campaign ${i+1}`,active:true
}));
export const campaignReels = ['accessories','tees','hoodies','sweaters'].map(category=>({
 src:`/assets/video/lookbook-${category}.mp4`,
 title:category[0].toUpperCase()+category.slice(1),active:true
}));

export function homepageMedia(saved,original,visibleOnly=true){
 const configured=Array.isArray(saved)?saved.map(item=>typeof item==='string'?{src:item}:item).filter(item=>item&&typeof item.src==='string'&&(!visibleOnly||item.src.trim())):[];
 if(!configured.length)return original;
 // Restore only the exact truncated defaults introduced by the previous editor.
 const truncatedLength=original===campaignImages?3:original===campaignReels?2:0;
 if(configured.length===truncatedLength&&configured.every((item,i)=>item.src===original[i].src&&item.active!==false))return [...configured,...original.slice(truncatedLength)];
 return visibleOnly?configured.filter(item=>item.active!==false):configured;
}
