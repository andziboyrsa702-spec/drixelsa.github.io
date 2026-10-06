export {getFirestore,FieldValue} from './firestore.mjs';
export {getAuth} from './auth.mjs';
const identity=x=>x;
class HttpsError extends Error{constructor(code,message){super(message);this.code=code;}}
export const functions={https:{onRequest:identity,onCall:identity,HttpsError},runWith:()=>functions,pubsub:{schedule:()=>({timeZone:()=>({onRun:identity})})}};
