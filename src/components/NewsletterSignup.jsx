import {Link} from "react-router-dom";
import { useMarket } from "../context/MarketContext.jsx";
import React, { useState } from "react";
import { marketingApi } from "../utils/marketingApi.js";
export default function NewsletterSignup({
  compact = false
}) {
  const {
    market
  } = useMarket();
  const [email, setEmail] = useState(""),
    [status, setStatus] = useState("idle"),
    [message, setMessage] = useState("");
  async function submit(e) {
    e.preventDefault();
    if (status === "busy" || !email.trim()) return;
    setStatus("busy");
    setMessage("");
    try {
      const r = await fetch(marketingApi("/api/subscribe"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email: email.trim(),
            source: compact ? "footer" : "storefront",
            market
          })
        }),
        text = await r.text();
      let d = {};
      try {
        d = text ? JSON.parse(text) : {};
      } catch {}
      if (!r.ok || d.success !== true) throw new Error(d.message || "The signup service did not confirm your subscription. Please try again.");
      setStatus("success");
      setMessage(d.message || "You're on the list.");
      setEmail("");
    } catch (x) {
      setStatus("error");
      setMessage(x.message);
    }
  }
  return <form className={"dx-newsletter " + (compact ? "compact" : "")} onSubmit={submit}><div><small>DRIXEL / MEMBERS</small><h2>{compact ? "Stay close." : "Get the drop before the drop."}</h2>{!compact && <p>New releases, restocks, campaign stories and private access. Drixel updates only when there is something worth opening.</p>}</div><div className="dx-newsletter-form"><label><span>Email address</span><input type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required /></label><button disabled={status === "busy"}>{status === "busy" ? "Joining…" : "Join the list"}</button><p className="dx-newsletter-consent">By joining, you agree to receive Drixel promotional emails. Unsubscribe at any time. <Link to={`/${market}/help/privacy-policy`}>Privacy policy</Link></p>{message && <p role="status" aria-live="polite" className={"dx-newsletter-message " + status}>{message}</p>}</div></form>;
}
