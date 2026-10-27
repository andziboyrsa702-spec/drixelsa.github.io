import {useEffect, useState} from 'react';
import {products} from '../services/catalogue-react.js';
export default function useCatalogue(market) {
  const [state, setState] = useState({list: [], loading: true, error: ''});
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let current = true;
    setState({list: [], loading: true, error: ''});
    products(market).then(list => {if (current) setState({list, loading: false, error: ''});})
      .catch(() => {if (current) setState({list: [], loading: false, error: 'We could not load the products. Please try again.'});});
    return () => {current = false;};
  }, [market, attempt]);
  return {...state, retry: () => setAttempt(value => value + 1)};
}
