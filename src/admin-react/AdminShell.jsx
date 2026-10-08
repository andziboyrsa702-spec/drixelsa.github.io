import UserAvatar from '../components/UserAvatar.jsx';
import useAuth from '../hooks/useAuth.js';
import useUserProfile from '../hooks/useUserProfile.js';
import AdminErrorBoundary from './AdminErrorBoundary.jsx';
import React, {useEffect, useRef, useState} from 'react';
import {NavLink, useLocation, useNavigate} from 'react-router-dom';
import {signOut} from 'firebase/auth';
import {auth} from '../config/firebase-react.js';
import {adminSections, adminTitle} from './adminRoutes.js';
import {useMarket} from '../context/MarketContext.jsx';
import {useDialog} from '../components/DialogProvider.jsx';

export default function AdminShell({children}) {
  const user=useAuth(),profile=useUserProfile(user);
  const {market} = useMarket(), location = useLocation(), navigate = useNavigate(), dialog = useDialog();
  const [menu, setMenu] = useState(false), [signingOut, setSigningOut] = useState(false);
  const sidebar = useRef(null), menuButton = useRef(null);
  const key = location.pathname.replace(new RegExp('^/' + market + '/admin/?'), '') || 'dashboard';
  const title = adminTitle(key);
  useEffect(() => {document.title = `${title} · Drixel Admin`; setMenu(false);}, [location.pathname, title]);
  useEffect(() => {
    if (!menu) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    sidebar.current?.querySelector('button')?.focus();
    const close = () => {setMenu(false); menuButton.current?.focus();};
    const onKey = event => {
      if (event.key === 'Escape') {event.preventDefault(); close();}
      if (event.key !== 'Tab') return;
      const items = [...sidebar.current.querySelectorAll('a,button')].filter(item => !item.disabled);
      const first = items[0], last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) {event.preventDefault(); last.focus();}
      else if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first.focus();}
    };
    const media = matchMedia('(min-width: 901px)');
    const resize = () => {if (media.matches) setMenu(false);};
    document.addEventListener('keydown', onKey); media.addEventListener('change', resize);
    return () => {document.body.style.overflow = previous; document.removeEventListener('keydown', onKey); media.removeEventListener('change', resize);};
  }, [menu]);
  async function logout() {
    setSigningOut(true);
    try {await signOut(auth); navigate(`/${market}/member/login`, {replace: true});}
    catch (error) {dialog.toast(error.message || 'Sign out failed. Please try again.', 'error');}
    finally {setSigningOut(false);}
  }
  return <div className="ra-shell">
    <aside id="admin-navigation" ref={sidebar} className={'ra-sidebar ' + (menu ? 'open' : '')} aria-label="Admin navigation">
      <div className="ra-mobile-head"><NavLink className="ra-brand" to={`/${market}`}>DRIXEL<span>STORE MANAGEMENT</span></NavLink>
        <button type="button" onClick={() => {setMenu(false); menuButton.current?.focus();}} aria-label="Close navigation">×</button></div>
      <nav aria-label="Store management">{adminSections.map(([label, items]) => <div key={label}>
        <p>{label}</p>{items.map(([path, text]) => <NavLink key={path} to={`/${market}/admin/${path}`}
          end={path === 'dashboard'} onClick={() => setMenu(false)} className={({isActive}) => 'ra-nav ' + (isActive ? 'active' : '')}>{text}</NavLink>)}
      </div>)}</nav>
      <div className="ra-foot"><NavLink to={`/${market}`}>View storefront ↗</NavLink>
        <button type="button" disabled={signingOut} onClick={logout}>{signingOut ? 'Signing out…' : 'Sign out'}</button></div>
    </aside>
    {menu && <button type="button" className="ra-scrim" aria-label="Close navigation" onClick={() => setMenu(false)}/>}
    <main className="ra-workspace" inert={menu ? true : undefined}>
      <header className="ra-topbar"><button ref={menuButton} type="button" className="ra-menu-button" onClick={() => setMenu(true)}
        aria-controls="admin-navigation" aria-expanded={menu}>Menu</button>
        <div className="ra-page-title"><span>DRIXEL / STORE MANAGEMENT</span><h1>{title}</h1></div>
        <div className="ra-admin-identity"><UserAvatar user={profile}/><span className="ra-market-tag">{market.toUpperCase()}</span>
          <small title={auth.currentUser?.email}>{auth.currentUser?.email}</small></div>
      </header><section className="ra-view" key={location.pathname}><AdminErrorBoundary>{children}</AdminErrorBoundary></section>
    </main>
  </div>;
}
