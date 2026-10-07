import { apiUrl } from "../utils/api.js";
import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import BankInstructions from "../components/BankInstructions.jsx";
import Layout from "../components/Layout.jsx";
import useAuth from "../hooks/useAuth.js";
import { db } from "../config/firebase-react.js";
import { useCart } from "../context/CartContext.jsx";
import { useMarket } from "../context/MarketContext.jsx";
async function readApi(r) {
  const text = await r.text();
  if (!text) throw new Error(r.ok ? "The checkout service returned an empty response." : (import.meta.env.DEV ? "Checkout is unavailable. Start Firebase emulators or configure VITE_API_BASE_URL for the deployed backend." : "Checkout is temporarily unavailable. The store backend needs deployment or recovery; your bag is saved."));
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("The checkout endpoint returned a website page instead of order data. Check the backend deployment and API routing; your bag is saved.");
  }
}
export default function Checkout() {
  const {
      market,
      info,
      money,
      path,
      pricingReady,
      pricingError
    } = useMarket(),
    user = useAuth(),
    cart = useCart(),
    nav = useNavigate(),
    [paymentConfig,setPaymentConfig]=useState(null),
    [paymentMethod,setPaymentMethod]=useState("bank"),
    [quote, setQuote] = useState(),
    [address, setAddress] = useState({}),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [coupon, setCoupon] = useState(""),
    [couponBusy, setCouponBusy] = useState(false),
    [quoteBusy, setQuoteBusy] = useState(false),
    [addressWarning, setAddressWarning] = useState("");
  useEffect(()=>{let active=true;Promise.resolve(user?.getIdToken()).then(token=>fetch(apiUrl('/api/payments/config'),{headers:token?{Authorization:'Bearer '+token}:{}})).then(async r=>{const d=await readApi(r);if(!r.ok)throw Error(d.message||'Payment options unavailable.');if(active){setPaymentConfig(d);setPaymentMethod(d.bank?.enabled?'bank':d.yoco?.enabled&&market==='za'?'yoco':d.snapscan?.enabled&&market==='za'?'snapscan':'');}}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[market,user]);
  const quoteAttempt=useRef(0);
  const clean = () => cart.items.map(x => ({
    productId: x.productId,
    sku: x.sku || "",
    size: x.size || "",
    color: x.color || "",
    quantity: x.quantity
  }));
  async function loadQuote(code = "") {
    const attempt=++quoteAttempt.current;
    setQuoteBusy(true);
    setQuote(undefined);
    try {
      const r = await fetch(apiUrl("/api/checkout-quote"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            items: clean(),
            market,
            couponCode: code
          })
        }),
        d = await readApi(r);
      if (!r.ok) throw new Error(d.message || "Unable to prepare checkout.");
      if (!Array.isArray(d.items) || !Number.isFinite(Number(d.total))) throw new Error("The checkout quote is incomplete. Please retry.");
      if(attempt===quoteAttempt.current)setQuote(d);
      return d;
    } finally {
      if(attempt===quoteAttempt.current)setQuoteBusy(false);
    }
  }
  useEffect(() => {
    if (user === null) nav(path("/za/member/login") + "?next=checkout", {
      replace: true
    });
    if (user) {
      getDoc(doc(db, "users", user.uid)).then(s => setAddress(s.data()?.defaultAddress || {})).catch(() => setAddressWarning("Your saved address could not be loaded. Please enter your delivery details below."));
      loadQuote("").catch(e => setError(e.message));
    }
  }, [user, market]);
  async function submit(e) {
    e.preventDefault();
    if (!pricingReady) {
      setError(pricingError || "Pricing for this market is temporarily unavailable.");
      return;
    }
    if (!quote || quoteBusy) {
      setError("Prepare a valid order quote before placing your order.");
      return;
    }
    const customer = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    setError("");
    try {
      const attempt = sessionStorage.getItem("drixel_checkout_attempt") || crypto.randomUUID?.() || Date.now() + "_" + Math.random().toString(36).slice(2);
      sessionStorage.setItem("drixel_checkout_attempt", attempt);
      const token = await user.getIdToken(),
        r = await fetch(apiUrl("/api/create-order"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token
          },
          body: JSON.stringify({
            items: clean(),
            customer,
            paymentMethod,
            idempotencyKey: attempt,
            market,
            couponCode: quote?.appliedCoupon?.code || ""
          })
        }),
        d = await readApi(r);
      if (!r.ok) throw new Error(d.message || "Checkout failed.");
      if(paymentMethod==='yoco'){
        const url=new URL(d.redirectUrl);if(url.protocol!=='https:'||url.hostname!=='c.yoco.com'||url.username||url.password)throw Error('The payment link could not be verified. Your bag is saved.');
        window.location.assign(url.href);return;
      }
      if(paymentMethod==="snapscan")sessionStorage.setItem("drixel_pending_snapscan_order",d.orderId);
      if(paymentMethod!=="snapscan")cart.clear();
      if(paymentMethod!=="snapscan")sessionStorage.removeItem("drixel_checkout_attempt");
      nav(path("/za/order-confirmation/" + encodeURIComponent(d.orderNumber)));
    } catch (x) {
      setError(x.message);
    } finally {
      setBusy(false);
    }
  }
  const regions = info.regions || [];
  return <Layout><main className="dx-checkout"><header className="dx-checkout-head"><p>SECURE CHECKOUT · {info.country}</p><h1>Finish your order.</h1><span>Prices are shown in {info.currency}; product pricing, delivery and availability are verified by Drixel's backend.</span></header>{!pricingReady && <div className="dx-error">{pricingError || "Pricing for this market is temporarily unavailable. You can browse, but checkout is paused until a verified exchange rate is available."}</div>}{addressWarning && <p role="status" className="dx-notice">{addressWarning}</p>}{!quote && <div className="dx-error" role="alert">{error}<button type="button" disabled={quoteBusy} onClick={() => {
          setError("");
          loadQuote(coupon.trim()).catch(e => setError(e.message));
        }}>{quoteBusy ? "Preparing…" : "Retry order quote"}</button></div>}<form className="dx-checkout-grid" onSubmit={submit}><div><section><h2>Delivery details</h2><div className="dx-fields"><label>First name<input name="firstName" defaultValue={address.firstName || ""} required /></label><label>Last name<input name="lastName" defaultValue={address.lastName || ""} required /></label><label className="full">Email<input name="email" value={user?.email || ""} readOnly /></label><label className="full">Phone<input name="phone" defaultValue={address.phone || ""} required /></label><label className="full">Street address<input name="address" defaultValue={address.address || ""} required /></label><label>City<input name="city" defaultValue={address.city || ""} required /></label><label>Postal / ZIP code<input name="postalCode" defaultValue={address.postalCode || ""} required /></label><label>{info.addressLabel}{regions.length ? <select name="province" defaultValue={address.province || ""} required><option value="">Select</option>{regions.map(x => <option key={x}>{x}</option>)}</select> : <input name="province" defaultValue={address.province || ""} required />}</label><input type="hidden" name="country" value={info.country} /><input type="hidden" name="countryCode" value={info.countryCode} /></div></section><section><h2>Payment</h2><div className="dx-payment-options" role="group" aria-label="Payment method">{paymentConfig?.bank?.enabled&&<label className={paymentMethod==='bank'?'is-selected':''}><input type="radio" name="paymentChoice" value="bank" checked={paymentMethod==='bank'} onChange={()=>setPaymentMethod('bank')} /><span><strong>Bank transfer</strong><small>Pay by EFT using your order reference. We verify funds before dispatch.</small></span></label>}{paymentConfig?.yoco?.enabled&&market==='za'&&<label className={paymentMethod==='yoco'?'is-selected':''}><input type="radio" name="paymentChoice" value="yoco" checked={paymentMethod==='yoco'} onChange={()=>setPaymentMethod('yoco')} /><span><strong>{paymentConfig.yoco.mode==='test'?'Card payment · TEST MODE':'Card payment'}</strong><small>{paymentConfig.yoco.mode==='test'?'Testing only. No order will be dispatched.':'Continue to Yoco’s secure payment page.'}</small></span></label>}{paymentConfig?.snapscan?.enabled&&market==='za'&&<label className={paymentMethod==='snapscan'?'is-selected':''}><input type="radio" name="paymentChoice" value="snapscan" checked={paymentMethod==='snapscan'} onChange={()=>setPaymentMethod('snapscan')}/><span><strong>SnapScan</strong><small>Scan an order-specific QR code or pay on your phone. Payment is verified before dispatch.</small></span></label>}</div>{paymentMethod==='bank'&&<BankInstructions details={paymentConfig?.bank} />}{!paymentMethod&&<p className="dx-notice">{paymentConfig?'Payment options are being configured. Please contact Drixel before ordering.':'Loading secure payment options…'}</p>}{error && <div className="dx-error">{error}</div>}<p className="dx-checkout-legal">Before placing your order, review the <Link to={`/${market}/help/terms-of-use`}>Terms</Link>, <Link to={`/${market}/help/returns-policy`}>Returns & cancellation rights</Link>, <Link to={`/${market}/help/shipping-policy`}>Shipping</Link> and <Link to={`/${market}/help/privacy-policy`}>Privacy notice</Link>. Newsletter subscription is optional.</p><button className="dx-place" disabled={busy || quoteBusy || !quote || !pricingReady || !paymentMethod}>{busy ? "Creating order…" : pricingReady ? paymentMethod==="yoco"?"Continue to secure payment":paymentMethod==="snapscan"?"Continue to SnapScan":"Place bank-transfer order" : "Checkout unavailable"}</button></section></div><aside><h2>Order summary</h2>{quote?.items?.map((x, i) => <div className="dx-order-item" key={i}><img src={x.image || ""} alt={x.name || "Product"} /><div><strong>{x.name}</strong><p>{[x.color, x.size, x.sku].filter(Boolean).join(" · ")} × {x.quantity}</p></div><b>{money(x.lineTotal)}</b></div>)}<div className="dx-coupon"><label>Discount code<input value={coupon} onChange={e => setCoupon(e.target.value.toUpperCase())} placeholder="ENTER CODE" /></label><button type="button" disabled={couponBusy} onClick={async () => {
              setCouponBusy(true);
              setError("");
              try {
                await loadQuote(coupon.trim());
              } catch (e) {
                setError(e.message);
              } finally {
                setCouponBusy(false);
              }
            }}>{couponBusy ? "Checking…" : "Apply"}</button></div>{quote && <div className="dx-totals"><div><span>Subtotal</span><b>{money(quote.subtotal)}</b></div>{quote.discount > 0 && <div><span>Discount {quote.appliedCoupon?.code && `(${quote.appliedCoupon.code})`}</span><b>−{money(quote.discount)}</b></div>}<div><span>Delivery</span><b>{quote.shipping ? money(quote.shipping) : "Free"}</b></div><div className="total"><span>Total</span><b>{money(quote.total)}</b></div></div>}</aside></form></main></Layout>;
}
