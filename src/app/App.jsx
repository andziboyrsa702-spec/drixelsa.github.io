import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useParams } from "react-router-dom";
import { CartProvider } from "../context/CartContext.jsx";
const Home = lazy(() => import("../react-pages/Home.jsx"));
const Shop = lazy(() => import("../react-pages/Shop.jsx"));
const Product = lazy(() => import("../react-pages/Product.jsx"));
const Cart = lazy(() => import("../react-pages/Cart.jsx"));
const Checkout = lazy(() => import("../react-pages/Checkout.jsx"));
const Auth = lazy(() => import("../react-pages/Auth.jsx"));
const Account = lazy(() => import("../react-pages/Account.jsx"));
const OrderConfirmation = lazy(() => import("../react-pages/OrderConfirmation.jsx"));
const OrderDetail = lazy(() => import("../react-pages/OrderDetail.jsx"));
const Search = lazy(() => import("../react-pages/Search.jsx"));
const Wishlist = lazy(() => import("../react-pages/Wishlist.jsx"));
const YocoReturn = lazy(() => import("../react-pages/YocoReturn.jsx"));
const About = lazy(() => import("../react-pages/About.jsx"));
const Contact = lazy(() => import("../react-pages/Contact.jsx"));
const Policy = lazy(() => import("../react-pages/Policy.jsx"));
const NotFound = lazy(() => import("../react-pages/NotFound.jsx"));
const AdminRouter = lazy(() => import("../admin-react/AdminRouter.jsx"));
import AdminAccessGesture from "../components/AdminAccessGesture.jsx";
import { MARKETS } from "../i18n/markets.js";
function MarketRoute({
  children
}) {
  const {
    market
  } = useParams();
  return MARKETS[market] ? children : <Navigate to="/za" replace />;
}
export default function App() {
  return <CartProvider><AdminAccessGesture /><Suspense fallback={<main className="dx-loading" role="status">Opening Drixel…</main>}><Routes><Route path="/" element={<Home />} /><Route path="/:market" element={<MarketRoute><Home /></MarketRoute>} /><Route path="/:market/w/:categorySlug" element={<MarketRoute><Shop /></MarketRoute>} /><Route path="/:market/t/:productSlug/:productCode" element={<MarketRoute><Product /></MarketRoute>} /><Route path="/:market/about" element={<MarketRoute><About /></MarketRoute>} /><Route path="/:market/contact" element={<MarketRoute><Contact /></MarketRoute>} /><Route path="/:market/help/:policy" element={<MarketRoute><Policy /></MarketRoute>} /><Route path="/:market/search" element={<MarketRoute><Search /></MarketRoute>} /><Route path="/:market/wishlist" element={<MarketRoute><Wishlist /></MarketRoute>} /><Route path="/:market/cart" element={<MarketRoute><Cart /></MarketRoute>} /><Route path="/:market/payment/yoco/:result" element={<MarketRoute><YocoReturn /></MarketRoute>} /><Route path="/:market/checkout" element={<MarketRoute><Checkout /></MarketRoute>} /><Route path="/:market/member/login" element={<MarketRoute><Auth /></MarketRoute>} /><Route path="/:market/member/profile" element={<MarketRoute><Account /></MarketRoute>} /><Route path="/:market/member/orders" element={<MarketRoute><Account /></MarketRoute>} /><Route path="/:market/member/orders/:orderId" element={<MarketRoute><OrderDetail /></MarketRoute>} /><Route path="/:market/order-confirmation/:orderNumber" element={<MarketRoute><OrderConfirmation /></MarketRoute>} /><Route path="/:market/admin/*" element={<MarketRoute><Suspense fallback={<div className="admin-gate" role="status"><strong>DRIXEL</strong><span>Opening store management…</span></div>}><AdminRouter /></Suspense></MarketRoute>} /><Route path="*" element={<NotFound />} /></Routes></Suspense></CartProvider>;
}
