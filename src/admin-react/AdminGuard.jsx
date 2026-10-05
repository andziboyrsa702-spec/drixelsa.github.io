import React, {useEffect, useState} from 'react';
import {Link, Navigate, useLocation, useParams} from 'react-router-dom';
import {hasAdminAccess} from './adminAccess.js';
import useAuth from '../hooks/useAuth.js';
export default function AdminGuard({children}) {
  const user = useAuth(), {market = 'za'} = useParams(), location = useLocation();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({uid: null, loading: true, allowed: false, error: ''});
  useEffect(() => {
    let live = true;
    if (!user) {setState({uid:null,loading:user===undefined,allowed:false,error:''});return;}
    setState({uid:user.uid,loading:true,allowed:false,error:''});
    const timeout = setTimeout(() => {
      if (live) setState({uid:user.uid,loading:false,allowed:false,error:'Administrator access verification timed out. Check your connection and try again.'});
      live = false;
    }, 15000);
    user.getIdTokenResult(true).then(result => {
      if (!live) return;
      const allowed = hasAdminAccess(result.claims);
      setState({uid:user.uid,loading:false,allowed,error:allowed?'':'This account has not been granted Drixel administrator access.'});
      clearTimeout(timeout);
    }).catch(error => {
      if (live) setState({uid:user.uid,loading:false,allowed:false,error:error.message||'Administrator access could not be verified.'});
      clearTimeout(timeout);
    });
    return () => {live=false;clearTimeout(timeout);};
  }, [user, attempt]);
  if (user === null) return <Navigate to={`/${market}/member/login?next=${encodeURIComponent(location.pathname+location.search)}`} replace/>;
  if (user === undefined || state.loading || state.uid !== user.uid) return <div className="admin-gate" role="status"><strong>DRIXEL</strong><span>Verifying administrator access…</span></div>;
  if (!state.allowed) return <div className="admin-gate admin-access-denied" role="alert"><strong>DRIXEL</strong><span>{state.error}</span><small>{user.email}</small>
    <button onClick={() => setAttempt(value => value+1)}>Check access again</button><Link to={`/${market}/member/profile`}>Return to account</Link></div>;
  return children;
}
