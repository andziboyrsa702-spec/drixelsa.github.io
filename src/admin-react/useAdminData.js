import {reportingRecords} from './reporting.js';
import {useEffect, useState} from 'react';
import {collection, onSnapshot} from 'firebase/firestore';
import {db} from '../config/firebase-react.js';

// Keep live subscriptions and their loading/error states together. Empty data is
// only rendered after every requested collection has responded successfully.
export function useAdminData(names,{reporting=false}={}) {
  const key = names.join('|');
  const [state, setState] = useState({key, data: {}, loaded: {}, error: ''});
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setState({key, data: {}, loaded: {}, error: ''});
    const stops = names.map(name => onSnapshot(collection(db, name), snapshot => {
      if (!active) return;
      setState(current => ({...current,
        data: {...current.data, [name]: snapshot.docs.map(item => ({...item.data(), id: item.id}))},
        loaded: {...current.loaded, [name]: true}
      }));
    }, error => {
      if (active) setState(current => ({...current,
        error: error.code === 'permission-denied'
          ? 'Your account cannot read these records. Check administrator permissions and Firestore rules.'
          : 'The admin data service could not be reached. ' + error.message
      }));
    }));
    return () => {active = false; stops.forEach(stop => stop());};
  }, [key, attempt]);
  return {
    data: state.key === key ? reportingRecords(state.data,reporting) : {},
    loading: state.key !== key || names.some(name => !state.loaded[name]),
    error: state.key === key ? state.error : '',
    retry: () => setAttempt(value => value + 1)
  };
}
