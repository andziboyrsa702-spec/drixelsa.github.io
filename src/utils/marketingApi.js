// GitHub Pages cannot execute Firebase Hosting rewrites. Its preview uses the
// deployed Firebase endpoint; custom hosting can set VITE_API_BASE_URL at build.
export function marketingApi(path){
 const configured=(import.meta.env.VITE_API_BASE_URL||'').replace(/\/$/,'');
 const base=configured||(import.meta.env.DEV?'':'https://drixel-sa.web.app');
 return base+path;
}
export const isActiveSubscriber=s=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s.email||'').trim())&&(!s.status||s.status==='active');
