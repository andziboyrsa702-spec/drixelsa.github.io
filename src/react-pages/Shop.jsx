import useCatalogue from "../hooks/useCatalogue.js";
import React, { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Layout from "../components/Layout.jsx";
import { productPath } from "../utils/urls.js";
import { useMarket } from "../context/MarketContext.jsx";
import Seo from "../components/Seo.jsx";
const pretty = s => s === "new-featured" ? "New & Featured" : s.split("-").map(x => x[0]?.toUpperCase() + x.slice(1)).join(" ");
export default function Shop() {
  const {
      market,
      money
    } = useMarket(),
    {
      list,
      loading,
      error,
      retry
    } = useCatalogue(market),
    [q, setQ] = useState(""),
    {
      categorySlug = "new-featured"
    } = useParams();
  const shown = useMemo(() => list.filter(p => (categorySlug === "new-featured" || String(p.category || "").toLowerCase().replace(/[^a-z0-9]+/g, "-") === categorySlug) && [p.name, p.title, p.category].join(" ").toLowerCase().includes(q.toLowerCase())), [list, q, categorySlug]);
  return <Layout><Seo title={"Shop " + (categorySlug || "Drixel") + " | Drixel"} description="Shop Drixel streetwear for your market." /><main className="dx-catalogue-page"><div className="dx-catalogue-intro"><h1>{pretty(categorySlug)}</h1><p>Discover Drixel products and available variants.</p></div><div className="dx-catalogue-tools"><input aria-label="Search products" placeholder="Search products" value={q} onChange={e => setQ(e.target.value)} /></div>{loading && <p role="status">Loading products…</p>}{error && <div role="alert" className="dx-error">{error} <button type="button" onClick={retry}>Try again</button></div>}<div className="dx-product-grid">{shown.map(p => <article className="dx-product-card" key={p.id}><Link to={productPath(p, market)}><div className="dx-product-media">{(p.image || p.images?.[0]) && <img loading="lazy" decoding="async" src={p.image || p.images[0]} alt={p.imageAlt || p.name || ""} />}</div><div className="dx-product-copy"><div><h2>{p.name || p.title}</h2><p>{p.category}</p></div><strong>{money(p.price)}</strong></div></Link></article>)}</div>{!loading && !error && !shown.length && <p className="dx-empty">No products match this selection.</p>}</main></Layout>;
}
