import {useEffect, useState} from 'react';
import {doc, getDoc} from 'firebase/firestore';
import {db} from '../config/firebase-react.js';
// Editors load once: a background snapshot must not overwrite unsaved fields.
export default function useAdminDocument(collectionName, id, defaults) {
  const [data, setData] = useState(defaults), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true; setLoading(true); setError('');
    getDoc(doc(db, collectionName, id)).then(snapshot => {
      if (active) {setData({...defaults, ...(snapshot.exists() ? snapshot.data() : {})});setLoading(false);}
    }).catch(error => {if(active){setError(error.message || 'Unable to read these settings.');setLoading(false);}});
    return () => {active = false;};
  }, [collectionName, id, attempt]);
  return {data,setData,loading,error,retry:()=>setAttempt(value=>value+1)};
}
