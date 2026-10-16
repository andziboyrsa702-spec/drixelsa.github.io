import ProductCard from '../components/ProductCard.jsx';
import useCatalogue from "../hooks/useCatalogue.js";
import React, { useMemo, useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Layout from "../components/Layout.jsx";
import Seo from "../components/Seo.jsx";
import { productPath } from "../utils/urls.js";
import { useMarket } from "../context/MarketContext.jsx";
export default function Search() {
  const [params]=useSearchParams();
  const {
      market,
      money
    } = useMarket(),
    [q, setQ] = useState(()=>params.get("q")||""),
    {
      list,
      loading,
      error,
      retry
    } = useCatalogue(market);
  useEffect(()=>setQ(params.get("q")||""),[params]);
  const found = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return [];
    return list.filter(p => [p.name, p.title, p.category, p.description, ...(p.tags || [])].filter(Boolean).join(" ").toLowerCase().includes(n)).slice(0, 30);
  }, [q, list]);
  return <Layout><Seo title="Search | Drixel" noindex /><main className="dx-search-page"><header><p>SEARCH DRIXEL</p><input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search products, categories and collections" aria-label="Search Drixel" /></header>{q && <p>{found.length} results for {q}</p>}{loading && <p role="status">Loading products…</p>}{error && <div role="alert" className="dx-error">{error} <button type="button" onClick={retry}>Try again</button></div>}<div className="dx-search-grid">{found.map(p => <ProductCard product={p} key={p.id}/>)}</div>{q && !loading && !error && !found.length && <div className="dx-empty">No products match that search.</div>}</main></Layout>;
}
