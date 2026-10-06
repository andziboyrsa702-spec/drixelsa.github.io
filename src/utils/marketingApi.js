export {apiUrl as marketingApi} from './api.js';
export const isActiveSubscriber=s=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s.email||'').trim())&&(!s.status||s.status==='active');
