import {apiUrl} from '../utils/api.js';
import React,{createContext,useContext,useEffect,useMemo,useState,useRef} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {DEFAULT_MARKET,MARKETS,marketFromCountry,marketFromPath,marketInfo} from '../i18n/markets.js';
const C=createContext(),KEY='drixel_market',CHOICE='drixel_market_choice';
const read=key=>{try{return localStorage.getItem(key)}catch{return null}},write=(key,value)=>{try{localStorage.setItem(key,value)}catch{}};
const replaceMarket=(path,market)=>{const parts=path.split('/');if(MARKETS[parts[1]])parts[1]=market;else parts.splice(1,0,market);return parts.join('/')||'/'+market};
export function MarketProvider({children}){
 const loc=useLocation(),nav=useNavigate(),pathMarket=marketFromPath(loc.pathname),[market,setMarket]=useState(pathMarket||DEFAULT_MARKET),[pricing,setPricing]=useState(null),[pricingError,setPricingError]=useState(''),[retry,setRetry]=useState(0),locationRef=useRef(loc);locationRef.current=loc;
 useEffect(()=>{if(pathMarket)setMarket(pathMarket)},[pathMarket]);
 useEffect(()=>{let active=true;if(pathMarket)return;const choice=read(CHOICE);if(MARKETS[choice]){setMarket(choice);if(pathMarket!==choice)nav(replaceMarket(loc.pathname,choice)+loc.search+loc.hash,{replace:true});return;}if(/\/admin(?:\/|$)|\/member(?:\/|$)|\/payment(?:\/|$)|\/order-confirmation(?:\/|$)/.test(loc.pathname))return;
  fetch(apiUrl('/api/market'),{headers:{Accept:'application/json'},signal:AbortSignal.timeout(8000)}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(d=>{if(!active||MARKETS[read(CHOICE)])return;const current=locationRef.current;if(/\/admin(?:\/|$)|\/member(?:\/|$)|\/payment(?:\/|$)|\/order-confirmation(?:\/|$)/.test(current.pathname))return;const next=marketFromCountry(d.countryCode);setMarket(next);write(KEY,next);if(marketFromPath(current.pathname)!==next)nav(replaceMarket(current.pathname,next)+current.search+current.hash,{replace:true})}).catch(()=>{if(active&&!pathMarket)nav(replaceMarket(loc.pathname,DEFAULT_MARKET)+loc.search+loc.hash,{replace:true})});return()=>{active=false};
 },[]);
 useEffect(()=>{let active=true;const currency=marketInfo(market).currency;setPricing(null);setPricingError('');if(currency==='ZAR')return;
  fetch(apiUrl('/api/exchange-rates?base=ZAR&to='+currency),{signal:AbortSignal.timeout(12000)}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.message||'Currency conversion unavailable.');const rate=Number(d.rate);if(!Number.isFinite(rate)||rate<=0)throw Error('Invalid exchange rate.');return {...d,rate,currency}}).then(d=>{if(active)setPricing(d)}).catch(e=>{if(active)setPricingError(e.message||'Currency conversion unavailable.')});return()=>{active=false};
 },[market,retry]);
 const value=useMemo(()=>{const info=marketInfo(market),ready=info.currency==='ZAR'||pricing?.currency===info.currency,rate=info.currency==='ZAR'?1:ready?pricing.rate:null;return {market,info,rate,pricingReady:ready,pricingError,rateSource:ready?pricing?.source:'',rateDate:ready?pricing?.updatedAt:'',retryPricing:()=>setRetry(n=>n+1),setMarket(next){if(!MARKETS[next])return;write(CHOICE,next);write(KEY,next);setMarket(next);nav(replaceMarket(loc.pathname,next)+loc.search+loc.hash)},money(zar){const amount=Number(zar||0);const code=ready?info.currency:'ZAR',locale=ready?info.locale:'en-ZA';return new Intl.NumberFormat(locale,{style:'currency',currency:code,currencyDisplay:'code'}).format(amount*(ready?rate:1))},path:path=>replaceMarket(path,market)}},[market,pricing,pricingError,loc.pathname,loc.search,loc.hash]);return <C.Provider value={value}>{children}</C.Provider>;
}
export const useMarket=()=>useContext(C);
