import React from 'react';
const paths={
 search:<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></>,
 heart:<path d="M20.8 4.8a5.4 5.4 0 0 0-7.6 0L12 6l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.6a5.4 5.4 0 0 0 0-7.6Z"/>,
 account:<><circle cx="12" cy="7.5" r="3.5"/><path d="M4.5 21v-2a7.5 7.5 0 0 1 15 0v2"/></>,
 bag:<><path d="M5 7h14l1 14H4L5 7Z"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/></>,
 arrow:<><path d="M4 12h16M14 6l6 6-6 6"/></>
};
export default function StoreIcon({name,...props}){return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>{paths[name]||paths.arrow}</svg>}
