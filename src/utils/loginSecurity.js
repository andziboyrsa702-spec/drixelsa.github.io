const KEY='drixel_login_guard_v1';
export const LOGIN_COOLDOWN_MS=15*60*1000;
export function readLoginGuard(storage=globalThis.localStorage,now=Date.now()){
 try{const value=JSON.parse(storage.getItem(KEY)||'{}');if(!Number.isFinite(value.until)||value.until<=now){storage.removeItem(KEY);return {failures:0,until:0};}return {failures:Math.min(3,Number(value.failures)||0),until:value.until};}catch{return {failures:0,until:0};}
}
export function recordLoginFailure(code,storage=globalThis.localStorage,now=Date.now()){
 const previous=readLoginGuard(storage,now);
 if(!['auth/invalid-credential','auth/wrong-password','auth/user-not-found','auth/too-many-requests'].includes(code))return previous;
 const failures=code==='auth/too-many-requests'?3:Math.min(3,previous.failures+1),value={failures,until:now+LOGIN_COOLDOWN_MS};
 try{storage.setItem(KEY,JSON.stringify(value));}catch{}
 return value;
}
export function clearLoginGuard(storage=globalThis.localStorage){try{storage.removeItem(KEY);}catch{}}
