import{defineConfig}from"vite";
import react from"@vitejs/plugin-react";

const firebaseFunctions={
  "/api/market":"market",
  "/api/exchange-rates":"exchangeRates",
  "/api/admin/inventory-adjust":"adminInventoryAdjust",
  "/api/admin/order-action":"adminOrderAction",
  "/api/checkout-quote":"checkoutQuote",
  "/api/create-order":"createOrder",
  "/api/payments/yoco/verify":"verifyYocoPayment",
  "/api/subscribe":"subscribeNewsletter",
  "/api/unsubscribe":"unsubscribeNewsletter",
  "/api/send-campaign":"sendCampaign",
  "/api/send-email":"sendEmail"
};

export default defineConfig({
  plugins:[react()],
  build:{target:"es2020",sourcemap:false},
  server:{
    port:5173,
    proxy:{
      "/api":{
        target:"http://127.0.0.1:5001",
        changeOrigin:true,
        secure:false,
        rewrite:path=>{
          const route=Object.keys(firebaseFunctions)
            .sort((a,b)=>b.length-a.length)
            .find(prefix=>path===prefix||path.startsWith(prefix+"?"));
          if(!route)return path;
          return `/drixel-sa/us-central1/${firebaseFunctions[route]}${path.slice(route.length)}`;
        }
      }
    }
  }
});
