import{defineConfig,loadEnv}from"vite";
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
  "/api/queue-campaign":"enqueueCampaign",
  "/api/cancel-campaign":"cancelCampaign",
  "/api/reconcile-campaign":"reconcileCampaign",
  "/api/send-email":"sendEmail"
};

export default defineConfig(({mode})=>{const env=loadEnv(mode,process.cwd(),'');const worker=env.VITE_API_MODE==='worker';return {
  plugins:[react()],
  build:{target:"es2020",sourcemap:false},
  server:{
    port:5173,
    proxy:{
      "/api":{
        target:worker?"http://127.0.0.1:8787":"http://127.0.0.1:5001",
        changeOrigin:true,
        secure:false,
        rewrite:path=>{
          if(worker)return path;
          const route=Object.keys(firebaseFunctions)
            .sort((a,b)=>b.length-a.length)
            .find(prefix=>path===prefix||path.startsWith(prefix+"?"));
          if(!route)return path;
          return `/drixel-sa/us-central1/${firebaseFunctions[route]}${path.slice(route.length)}`;
        }
      }
    }
  }
};});

