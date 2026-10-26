import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const load = (promise) => promise.catch(() => {});

export default function RouteStyles() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (/\/t\//.test(pathname)) load(import('../styles/product.css'));
    if (/\/cart$/.test(pathname)) load(import('../styles/cart.css'));
    if (/\/checkout$/.test(pathname)) load(import('../styles/checkout.css'));
    if (/\/member\/(?:profile|orders|orders\/)/.test(pathname)) load(import('../styles/account.css'));
    if (/\/member\/(?:login|drixel-callback)/.test(pathname)) load(import('../styles/auth.css'));
    if (/\/order-confirmation\//.test(pathname)) load(import('../styles/order-confirmation.css'));
    if (/\/admin(?:\/|$)/.test(pathname)) load(import('../styles/admin-react.css'));
    if (/\/studio$/.test(pathname)) load(import('../styles/virtual-store.css'));
  }, [pathname]);

  return null;
}
