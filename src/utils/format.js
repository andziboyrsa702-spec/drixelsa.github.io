export const money=value=>new Intl.NumberFormat("en-ZA",{style:"currency",currency:"ZAR"}).format(Number(value||0));
export const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
export const displayDate=value=>{if(!value)return"—";const date=value?.toDate?value.toDate():new Date(value);return Number.isNaN(+date)?"—":date.toLocaleDateString("en-ZA",{day:"2-digit",month:"short",year:"numeric"})};
