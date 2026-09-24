const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { Resend } = require("resend");

admin.initializeApp();

const ALLOWED_ADMIN_EMAILS = new Set([
    "admin@drixelsa.co.za",
    "drixelsa@gmail.com"
]);

function isValidEmail(value) {
    return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

function normalizeRecipients(value) {
    const recipients = Array.isArray(value) ? value : [value];
    return recipients.filter(isValidEmail).slice(0, 20);
}

exports.sendEmail = functions.https.onRequest(async (req, res) => {
    if (req.method !== "POST") {
        res.set("Allow", "POST");
        return res.status(405).json({ success: false, message: "Method not allowed." });
    }

    const authorization = req.get("Authorization") || "";
    const match = authorization.match(/^Bearer (.+)$/);
    if (!match) {
        return res.status(401).json({ success: false, message: "Authentication required." });
    }

    let decodedToken;
    try {
        decodedToken = await admin.auth().verifyIdToken(match[1]);
    } catch (error) {
        console.warn("Rejected invalid Firebase ID token.");
        return res.status(401).json({ success: false, message: "Invalid authentication token." });
    }

    if (!decodedToken.email || !ALLOWED_ADMIN_EMAILS.has(decodedToken.email.toLowerCase())) {
        return res.status(403).json({ success: false, message: "Administrator access required." });
    }

    const { to, cc, subject, html } = req.body || {};
    const recipients = normalizeRecipients(to);
    const ccRecipients = cc ? normalizeRecipients(cc) : [];

    if (!recipients.length || typeof subject !== "string" || !subject.trim() || typeof html !== "string" || !html.trim()) {
        return res.status(400).json({ success: false, message: "Valid to, subject and html fields are required." });
    }

    if (subject.length > 300 || html.length > 200000) {
        return res.status(413).json({ success: false, message: "Email content is too large." });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        console.error("RESEND_API_KEY is not configured.");
        return res.status(500).json({ success: false, message: "Email service is not configured." });
    }

    try {
        const resend = new Resend(apiKey);
        const data = await resend.emails.send({
            from: "Drixel SA <info@customer.drixelsa.co.za>",
            to: recipients,
            ...(ccRecipients.length ? { cc: ccRecipients } : {}),
            subject: subject.trim(),
            html
        });

        return res.status(200).json({ success: true, message: "Email sent successfully.", data });
    } catch (error) {
        console.error("Email provider request failed:", error);
        return res.status(500).json({ success: false, message: "Failed to send email." });
    }
});


async function requireAdmin(req) {
    const authorization = req.get("Authorization") || "";
    const match = authorization.match(/^Bearer (.+)$/);
    if (!match) {
        const error = new Error("Authentication required.");
        error.status = 401;
        throw error;
    }
    let decoded;
    try {
        decoded = await admin.auth().verifyIdToken(match[1]);
    } catch {
        const error = new Error("Invalid authentication token.");
        error.status = 401;
        throw error;
    }
    if (decoded.admin !== true && decoded.role !== "admin") {
        const error = new Error("Administrator access required.");
        error.status = 403;
        throw error;
    }
    return decoded;
}

exports.sendCampaign = functions.https.onRequest(async (req, res) => {
    if (req.method !== "POST") {
        res.set("Allow", "POST");
        return res.status(405).json({ success: false, message: "Method not allowed." });
    }

    try {
        await requireAdmin(req);
        const campaignId = req.body && req.body.campaignId;
        if (!campaignId || typeof campaignId !== "string") {
            return res.status(400).json({ success: false, message: "Campaign ID is required." });
        }

        const campaignRef = admin.firestore().collection("email_campaigns").doc(campaignId);
        const campaignSnap = await campaignRef.get();
        if (!campaignSnap.exists) {
            return res.status(404).json({ success: false, message: "Campaign not found." });
        }

        const campaign = campaignSnap.data();
        if (!campaign.subject || !campaign.html) {
            return res.status(400).json({ success: false, message: "Campaign is incomplete." });
        }
        if (campaign.status === "sent") {
            return res.status(409).json({ success: false, message: "Campaign has already been sent." });
        }

        const subscriberSnap = await admin.firestore().collection("subscribers").get();
        const recipients = [];
        subscriberSnap.forEach(docSnap => {
            const subscriber = docSnap.data();
            if (isValidEmail(subscriber.email) && subscriber.status !== "unsubscribed") {
                recipients.push({ id: docSnap.id, email: subscriber.email.toLowerCase(), token: subscriber.unsubscribeToken || "" });
            }
        });
        const uniqueRecipients = [...new Map(recipients.map(r => [r.email, r])).values()];
        if (!uniqueRecipients.length) {
            return res.status(400).json({ success: false, message: "No active subscribers." });
        }
        if (uniqueRecipients.length > 5000) {
            return res.status(413).json({ success: false, message: "Audience is too large for this campaign sender." });
        }

        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ success: false, message: "Email service is not configured." });
        }

        const resend = new Resend(apiKey);
        let sent = 0;
        let failed = 0;
        const batchSize = 40;

        await campaignRef.update({
            status: "sending",
            recipientCount: uniqueRecipients.length,
            sendStartedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        for (let i = 0; i < uniqueRecipients.length; i += batchSize) {
            const batch = uniqueRecipients.slice(i, i + batchSize);
            const baseUrl = publicBaseUrl(req);
            const results = await Promise.allSettled(batch.map(recipient => {
                const unsubscribeUrl = recipient.token ? baseUrl + "/api/unsubscribe?id=" + encodeURIComponent(recipient.id) + "&token=" + encodeURIComponent(recipient.token) : "";
                const footer = unsubscribeUrl ? `<div style="max-width:620px;margin:24px auto 0;padding:20px;text-align:center;color:#777;font:12px Arial,sans-serif"><a style="color:#777" href="${unsubscribeUrl}">Unsubscribe</a> from Drixel marketing emails.</div>` : "";
                return resend.emails.send({
                    from: "Drixel SA <info@customer.drixelsa.co.za>",
                    to: [recipient.email],
                    subject: campaign.subject.trim(),
                    html: campaign.html + footer
                });
            }));
            results.forEach(result => result.status === "fulfilled" ? sent++ : failed++);
        }

        await campaignRef.update({
            status: failed === uniqueRecipients.length ? "failed" : "sent",
            acceptedCount: sent,
            failedCount: failed,
            sentAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return res.status(200).json({ success: true, sent, failed });
    } catch (error) {
        console.error("Campaign send failed:", error);
        return res.status(error.status || 500).json({ success: false, message: error.status ? error.message : "Campaign delivery failed." });
    }
});


function newsletterDocId(email) {
    return require("crypto").createHash("sha256").update(email).digest("hex");
}

function publicBaseUrl(req) {
    const configured = process.env.PUBLIC_SITE_URL;
    if (configured) return configured.replace(/\/$/, "");
    const forwardedProto = req.get("x-forwarded-proto") || "https";
    return forwardedProto + "://" + req.get("host");
}

exports.subscribeNewsletter = functions.https.onRequest(async (req, res) => {
    if (req.method !== "POST") {
        res.set("Allow", "POST");
        return res.status(405).json({ success: false, message: "Method not allowed." });
    }
    const email = String(req.body && req.body.email || "").trim().toLowerCase();
    if (!isValidEmail(email)) {
        return res.status(400).json({ success: false, message: "Enter a valid email address." });
    }
    const ref = admin.firestore().collection("subscribers").doc(newsletterDocId(email));
    const snap = await ref.get();
    const existing = snap.exists ? snap.data() : {};
    const unsubscribeToken = existing.unsubscribeToken || require("crypto").randomBytes(32).toString("hex");
    await ref.set({
        email,
        status: "active",
        source: existing.source || "website",
        unsubscribeToken,
        subscribedAt: existing.subscribedAt || admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    return res.status(200).json({ success: true, message: "You're on the list." });
});

exports.unsubscribeNewsletter = functions.https.onRequest(async (req, res) => {
    if (!["GET", "POST"].includes(req.method)) return res.status(405).send("Method not allowed.");
    const id = String((req.query && req.query.id) || (req.body && req.body.id) || "");
    const token = String((req.query && req.query.token) || (req.body && req.body.token) || "");
    if (!/^[a-f0-9]{64}$/.test(id) || !/^[a-f0-9]{64}$/.test(token)) return res.status(400).send("Invalid unsubscribe link.");
    const ref = admin.firestore().collection("subscribers").doc(id), snap = await ref.get();
    if (!snap.exists || snap.data().unsubscribeToken !== token) return res.status(404).send("Unsubscribe link not found.");
    await ref.update({ status: "unsubscribed", unsubscribedAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    res.set("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribed | Drixel</title><body style="margin:0;background:#050505;color:#fff;font-family:Arial,sans-serif;display:grid;place-items:center;min-height:100vh"><main style="max-width:560px;padding:40px;text-align:center"><b style="font-size:28px;letter-spacing:-2px">DRIXEL</b><h1 style="font-size:48px;letter-spacing:-3px">You’re unsubscribed.</h1><p style="color:#999;line-height:1.6">You will no longer receive Drixel marketing emails at this address.</p></main></body>');
});


const DELIVERY_FEE_ZAR = 70;
const FREE_DELIVERY_THRESHOLD_ZAR = 1000;
const SHIPPING_MARKETS={
    za:{enabled:true,fee:70,freeFrom:1000},
    bw:{enabled:false,fee:null,freeFrom:null},
    us:{enabled:false,fee:null,freeFrom:null},
    ng:{enabled:false,fee:null,freeFrom:null},
    gb:{enabled:false,fee:null,freeFrom:null},
    eu:{enabled:false,fee:null,freeFrom:null}
};
async function marketSettings(){const snap=await admin.firestore().collection("settings").doc("markets").get();return snap.exists&&snap.data().markets?snap.data().markets:{}}
async function shippingConfig(market){const code=String(market||"za").toLowerCase(),stored=(await marketSettings())[code],fallback=SHIPPING_MARKETS[code];if(stored)return{enabled:stored.enabled!==false&&stored.checkout===true,fee:stored.shippingFee==null?null:Number(stored.shippingFee),freeFrom:stored.freeFrom==null?null:Number(stored.freeFrom)};return fallback||null}
function productAvailableInMarket(product,market){const list=Array.isArray(product.availableMarkets)?product.availableMarkets.map(x=>String(x).toLowerCase()):[];return !list.length||list.includes(String(market||"za").toLowerCase())}
const MAX_CHECKOUT_ITEMS = 40;

function checkoutItemKey(item) {
    return [String(item.productId || ""), String(item.sku || ""), String(item.size || ""), String(item.color || "")].join("|");
}

async function buildTrustedQuote(rawItems, market="za") {
    if (!Array.isArray(rawItems) || !rawItems.length || rawItems.length > MAX_CHECKOUT_ITEMS) {
        const error = new Error("Your bag is empty or too large.");
        error.status = 400;
        throw error;
    }
    const merged = new Map();
    rawItems.forEach(item => {
        const productId = String(item && item.productId || "").trim();
        if (!productId) return;
        const quantity = Math.max(1, Math.min(20, Number(item.quantity) || 1));
        const normalized = { productId, sku: String(item.sku || "").trim(), size: String(item.size || "").trim(), color: String(item.color || "").trim(), quantity };
        const key = checkoutItemKey(normalized);
        if (merged.has(key)) merged.get(key).quantity = Math.min(20, merged.get(key).quantity + quantity);
        else merged.set(key, normalized);
    });
    if (!merged.size) { const error = new Error("No valid products were supplied."); error.status = 400; throw error; }
    const db = admin.firestore();
    const lines = [];
    for (const item of merged.values()) {
        const snap = await db.collection("products").doc(item.productId).get();
        if (!snap.exists) { const error = new Error("A product in your bag is no longer available."); error.status = 409; throw error; }
        const product = snap.data();
        if (product.active === false || !productAvailableInMarket(product,market)) { const error = new Error("A product in your bag is not available in this market."); error.status = 409; throw error; }
        let variant = null;
        if (Array.isArray(product.variants) && product.variants.length) {
            variant = product.variants.find(v =>
                (!item.sku || String(v.sku || "") === item.sku) &&
                (!item.size || String(v.size || "") === item.size) &&
                (!item.color || String(v.color || "") === item.color)
            );
            if (!variant) { const error = new Error("A selected product option is no longer available."); error.status = 409; throw error; }
            const stock = Number(variant.stock ?? variant.quantity ?? 0);
            if (stock < item.quantity) { const error = new Error("There is not enough stock for " + (product.name || product.title || "an item") + "."); error.status = 409; throw error; }
        }
        const unitPrice = Number(variant && variant.price != null ? variant.price : product.price);
        if (!Number.isFinite(unitPrice) || unitPrice < 0) { const error = new Error("A product has an invalid store price."); error.status = 409; throw error; }
        lines.push({
            productId: snap.id,
            name: String(product.name || product.title || "Drixel product").slice(0, 180),
            sku: String((variant && variant.sku) || product.sku || "").slice(0, 100),
            size: String((variant && variant.size) || item.size || "").slice(0, 80),
            color: String((variant && variant.color) || item.color || "").slice(0, 80),
            image: String(product.image || (product.images && product.images[0]) || "").slice(0, 2000),
            quantity: item.quantity,
            unitPrice,
            lineTotal: Number((unitPrice * item.quantity).toFixed(2))
        });
    }
    const subtotal = Number(lines.reduce((sum, x) => sum + x.lineTotal, 0).toFixed(2));
    const delivery=await shippingConfig(market);if(!delivery||!delivery.enabled){const error=new Error("Delivery to this market is not enabled yet.");error.status=409;throw error}const shipping=delivery.freeFrom!=null&&subtotal>=delivery.freeFrom?0:Number(delivery.fee);return {items:lines,subtotal,shipping,total:Number((subtotal+shipping).toFixed(2)),currency:"ZAR",market:String(market||"za").toLowerCase()};
}

async function requireCustomer(req) {
    const authorization = req.get("Authorization") || "";
    const match = authorization.match(/^Bearer (.+)$/);
    if (!match) { const e = new Error("Please sign in before checkout."); e.status = 401; throw e; }
    try { return await admin.auth().verifyIdToken(match[1]); }
    catch { const e = new Error("Your sign-in session is invalid. Please sign in again."); e.status = 401; throw e; }
}

function validText(value, max) { return typeof value === "string" && value.trim().length > 0 && value.trim().length <= max; }

exports.checkoutQuote = functions.https.onRequest(async (req, res) => {
    if (req.method !== "POST") return res.status(405).json({ success: false, message: "Method not allowed." });
    try {
        const market=String(req.body&&req.body.market||"za").toLowerCase();if(!MARKET_CONFIG[market])return res.status(400).json({success:false,message:"Unsupported market."});
        const quote = await buildTrustedQuote(req.body && req.body.items,market);
        return res.status(200).json({ success: true, ...quote });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.status ? error.message : "Unable to calculate checkout." });
    }
});

async function reserveInventoryAndCreateOrder({ user, customer, quote, paymentMethod }) {
    const db = admin.firestore();
    const orderRef = db.collection("orders").doc();
    const orderNumber = "DX-" + new Date().toISOString().slice(0,10).replace(/-/g,"") + "-" + orderRef.id.slice(0,6).toUpperCase();
    await db.runTransaction(async tx => {
        const grouped = new Map();
        quote.items.forEach(line => {
            const list = grouped.get(line.productId) || [];
            list.push(line);
            grouped.set(line.productId, list);
        });
        const snapshots = new Map();
        for (const productId of grouped.keys()) snapshots.set(productId, await tx.get(db.collection("products").doc(productId)));
        const productUpdates = [];
        for (const [productId, lines] of grouped.entries()) {
            const snap = snapshots.get(productId);
            if (!snap.exists) { const e = new Error("A product is no longer available."); e.status=409; throw e; }
            const product = snap.data();
            if (!Array.isArray(product.variants) || !product.variants.length) continue;
            const variants = product.variants.map(v => ({...v}));
            for (const line of lines) {
                const index = variants.findIndex(v =>
                    (!line.sku || String(v.sku||"")===line.sku) &&
                    (!line.size || String(v.size||"")===line.size) &&
                    (!line.color || String(v.color||"")===line.color)
                );
                if (index < 0) { const e=new Error("A selected product option is no longer available.");e.status=409;throw e; }
                const stock=Number(variants[index].stock??variants[index].quantity??0);
                if(stock<line.quantity){const e=new Error("Stock changed while you were checking out. Please review your bag.");e.status=409;throw e;}
                variants[index].stock=stock-line.quantity;
            }
            productUpdates.push({ref:snap.ref,variants});
        }
        productUpdates.forEach(x=>tx.update(x.ref,{variants:x.variants,updatedAt:admin.firestore.FieldValue.serverTimestamp()}));
        tx.set(orderRef,{
            orderNumber,
            customer:{uid:user.uid,email:customer.email.trim().toLowerCase(),firstName:customer.firstName.trim(),lastName:customer.lastName.trim(),phone:customer.phone.trim()},
            shippingAddress:{address:customer.address.trim(),city:customer.city.trim(),postalCode:customer.postalCode.trim(),province:customer.province.trim(),country:String(customer.country||quote.country||""),countryCode:String(customer.countryCode||quote.countryCode||"").toUpperCase()},
            items:quote.items,subtotal:quote.subtotal,shipping:quote.shipping,total:quote.total,currency:quote.currency,
            paymentMethod,paymentStatus:"pending",fulfillmentStatus:"processing",status:"processing",
            inventoryStatus:"reserved",pricingSource:"server",createdAt:admin.firestore.FieldValue.serverTimestamp(),updatedAt:admin.firestore.FieldValue.serverTimestamp()
        });
    });
    return {orderRef,orderNumber};
}

async function restoreOrderInventory(orderRef) {
    const db=admin.firestore();
    return db.runTransaction(async tx=>{
        const orderSnap=await tx.get(orderRef);
        if(!orderSnap.exists){const e=new Error("Order not found.");e.status=404;throw e;}
        const order=orderSnap.data();
        if(order.inventoryStatus==="restored")return false;
        const grouped=new Map();
        (order.items||[]).forEach(line=>{const list=grouped.get(line.productId)||[];list.push(line);grouped.set(line.productId,list)});
        const snaps=new Map();
        for(const productId of grouped.keys())snaps.set(productId,await tx.get(db.collection("products").doc(productId)));
        const updates=[];
        for(const [productId,lines] of grouped.entries()){
            const snap=snaps.get(productId);if(!snap.exists)continue;
            const product=snap.data();if(!Array.isArray(product.variants)||!product.variants.length)continue;
            const variants=product.variants.map(v=>({...v}));
            lines.forEach(line=>{const i=variants.findIndex(v=>(!line.sku||String(v.sku||"")===line.sku)&&(!line.size||String(v.size||"")===line.size)&&(!line.color||String(v.color||"")===line.color));if(i>=0)variants[i].stock=Number(variants[i].stock??variants[i].quantity??0)+Number(line.quantity||0)});
            updates.push({ref:snap.ref,variants});
        }
        updates.forEach(x=>tx.update(x.ref,{variants:x.variants,updatedAt:admin.firestore.FieldValue.serverTimestamp()}));
        tx.update(orderRef,{inventoryStatus:"restored",updatedAt:admin.firestore.FieldValue.serverTimestamp()});
        return true;
    });
}


const YOCO_API_BASE="https://payments.yoco.com/api";
function appOrigin(req){return String(process.env.PUBLIC_APP_URL||("https://"+req.get("host"))).replace(/\/$/,"")}
async function createYocoCheckout({orderId,orderNumber,total,idempotencyKey,req}){const secret=process.env.YOCO_SECRET_KEY;if(!secret){const e=new Error("Yoco test payments are not configured on the server.");e.status=503;throw e}const origin=appOrigin(req),amount=Math.round(Number(total)*100);const response=await fetch(YOCO_API_BASE+"/checkouts",{method:"POST",headers:{"Authorization":"Bearer "+secret,"Content-Type":"application/json","Idempotency-Key":idempotencyKey},body:JSON.stringify({amount,currency:"ZAR",successUrl:origin+"/za/payment/yoco/success?order="+encodeURIComponent(orderId),cancelUrl:origin+"/za/payment/yoco/cancel?order="+encodeURIComponent(orderId),failureUrl:origin+"/za/payment/yoco/failure?order="+encodeURIComponent(orderId),metadata:{orderId,orderNumber}})});const data=await response.json().catch(()=>({}));if(!response.ok||!data.redirectUrl){console.error("Yoco checkout creation failed",response.status);const e=new Error("Yoco could not start the payment.");e.status=502;throw e}return data}
exports.verifyYocoPayment=functions.https.onRequest(async(req,res)=>{if(req.method!=="POST")return res.status(405).json({success:false,message:"Method not allowed."});try{const user=await requireCustomer(req),orderId=String(req.body?.orderId||""),ref=admin.firestore().collection("orders").doc(orderId),snap=await ref.get();if(!snap.exists)return res.status(404).json({success:false,message:"Order not found."});const order=snap.data();if(order.customer?.uid!==user.uid)return res.status(403).json({success:false,message:"This order does not belong to your account."});if(!order.yocoCheckoutId)return res.status(409).json({success:false,message:"No Yoco checkout is attached to this order."});const secret=process.env.YOCO_SECRET_KEY;if(!secret)return res.status(503).json({success:false,message:"Yoco is not configured."});const response=await fetch(YOCO_API_BASE+"/checkouts/"+encodeURIComponent(order.yocoCheckoutId),{headers:{Authorization:"Bearer "+secret}}),data=await response.json().catch(()=>({}));if(!response.ok)return res.status(502).json({success:false,message:"Could not verify payment with Yoco."});const paid=data.status==="succeeded"||data.payment?.status==="succeeded";if(paid&&order.paymentStatus!=="paid")await ref.set({paymentStatus:"paid",paidAt:admin.firestore.FieldValue.serverTimestamp(),paymentVerifiedBy:"yoco-api",updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});return res.status(200).json({success:true,paid,status:data.status||data.payment?.status||"pending",orderNumber:order.orderNumber})}catch(error){return res.status(error.status||500).json({success:false,message:error.status?error.message:"Payment verification failed."})}});
exports.createOrder = functions.https.onRequest(async (req, res) => {
    if (req.method !== "POST") return res.status(405).json({ success:false,message:"Method not allowed." });
    try {
        const user=await requireCustomer(req),customer=req.body&&req.body.customer||{},email=String(customer.email||"").trim().toLowerCase();
        if(!user.email||email!==String(user.email).toLowerCase())return res.status(403).json({success:false,message:"Checkout email must match your signed-in account."});
        const required=[["firstName",80],["lastName",80],["phone",30],["address",180],["city",100],["postalCode",20],["province",80]];
        if(!required.every(([key,max])=>validText(customer[key],max))||!isValidEmail(email))return res.status(400).json({success:false,message:"Complete all delivery details."});
        const paymentMethod=String(req.body.paymentMethod||"");
        if(!["bank","yoco"].includes(paymentMethod))return res.status(400).json({success:false,message:"Unsupported payment method."});
        const market=String(req.body.market||"za").toLowerCase();if(!MARKET_CONFIG[market])return res.status(400).json({success:false,message:"Unsupported market."});
        const quote=await buildTrustedQuote(req.body.items,market);
        const idempotencyKey=String(req.body.idempotencyKey||"");if(!validIdempotencyKey(idempotencyKey))return res.status(400).json({success:false,message:"A valid checkout attempt ID is required."});\n        const {orderRef,orderNumber,reused,currency,rate,displayTotal}=await createOrderIdempotent({user,customer:{...customer,email},quote,paymentMethod,idempotencyKey,market});
        if(paymentMethod==="yoco"){if(market!=="za")return res.status(409).json({success:false,message:"Yoco checkout is currently enabled for South African ZAR orders only."});const checkout=await createYocoCheckout({orderId:orderRef.id,orderNumber,total:quote.total,idempotencyKey,req});await orderRef.set({yocoCheckoutId:checkout.id,paymentProvider:"yoco",paymentStatus:"pending",updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});return res.status(reused?200:201).json({success:true,reused,orderId:orderRef.id,orderNumber,paymentMethod:"yoco",paymentStatus:"pending",redirectUrl:checkout.redirectUrl})}
        return res.status(reused?200:201).json({success:true,reused,orderId:orderRef.id,orderNumber,total:quote.total,currency:"ZAR",displayTotal,displayCurrency:currency,exchangeRate:rate,paymentStatus:"pending",inventoryStatus:"reserved"});
    } catch(error) {
        console.error("Order creation failed:",error);
        return res.status(error.status||500).json({success:false,message:error.status?error.message:"Order could not be created."});
    }
});

function validIdempotencyKey(value){return typeof value==="string"&&/^[A-Za-z0-9_-]{16,100}$/.test(value)}
const MARKET_CONFIG={za:{country:"South Africa",countryCode:"ZA",currency:"ZAR"},us:{country:"United States",countryCode:"US",currency:"USD"},ng:{country:"Nigeria",countryCode:"NG",currency:"NGN"},bw:{country:"Botswana",countryCode:"BW",currency:"BWP"},gb:{country:"United Kingdom",countryCode:"GB",currency:"GBP"},eu:{country:"Europe",countryCode:"EU",currency:"EUR"}};
function marketConfig(value){return MARKET_CONFIG[String(value||"").toLowerCase()]||MARKET_CONFIG.za}
async function marketRate(market){const cfg=marketConfig(market);if(cfg.currency==="ZAR")return 1;const stored=await storedFxRate(cfg.currency);if(stored)return stored.rate;const rate=Number(process.env["FX_ZAR_"+cfg.currency]);if(!Number.isFinite(rate)||rate<=0){const e=new Error("Pricing for this market is temporarily unavailable.");e.status=503;throw e}return rate}
function convertMoney(value,rate){return Number((Number(value||0)*rate).toFixed(2))}
async function createOrderIdempotent({user,customer,quote,paymentMethod,idempotencyKey,market}){
    const cfg=marketConfig(market),rate=await marketRate(market),db=admin.firestore(),keyRef=db.collection("checkout_attempts").doc(require("crypto").createHash("sha256").update(user.uid+"|"+idempotencyKey).digest("hex")),orderRef=db.collection("orders").doc(),orderNumber="DX-"+new Date().toISOString().slice(0,10).replace(/-/g,"")+"-"+orderRef.id.slice(0,6).toUpperCase();
    return db.runTransaction(async tx=>{
        const keySnap=await tx.get(keyRef);
        if(keySnap.exists){const x=keySnap.data();return{orderRef:db.collection("orders").doc(x.orderId),orderNumber:x.orderNumber,reused:true,market:x.market||"za",currency:x.currency||"ZAR",rate:Number(x.exchangeRate||1),displayTotal:Number(x.displayTotal||quote.total)}}
        const grouped=new Map();quote.items.forEach(line=>{const list=grouped.get(line.productId)||[];list.push(line);grouped.set(line.productId,list)});
        const snaps=new Map();for(const productId of grouped.keys())snaps.set(productId,await tx.get(db.collection("products").doc(productId)));
        for(const [productId,lines] of grouped.entries()){const snap=snaps.get(productId);if(!snap.exists){const e=new Error("A product is no longer available.");e.status=409;throw e}const product=snap.data();if(product.active===false||!productAvailableInMarket(product,market)){const e=new Error("A product is not available in this market.");e.status=409;throw e}const variants=Array.isArray(product.variants)?product.variants.map(v=>({...v})):[];for(const line of lines){let currentPrice=Number(product.price);if(variants.length){const i=variants.findIndex(v=>(!line.sku||String(v.sku||"")===line.sku)&&(!line.size||String(v.size||"")===line.size)&&(!line.color||String(v.color||"")===line.color));if(i<0){const e=new Error("A selected product option is no longer available.");e.status=409;throw e}const stock=Number(variants[i].stock??variants[i].quantity??0);if(stock<line.quantity){const e=new Error("Stock changed while you were checking out. Please review your bag.");e.status=409;throw e}currentPrice=Number(variants[i].price!=null?variants[i].price:product.price);variants[i].stock=stock-line.quantity}if(!Number.isFinite(currentPrice)||Math.abs(currentPrice-Number(line.unitPrice))>.001){const e=new Error("Prices changed while you were checking out. Please review your bag.");e.status=409;throw e}}if(variants.length)tx.update(snap.ref,{variants,updatedAt:admin.firestore.FieldValue.serverTimestamp()})}
        const displayItems=quote.items.map(x=>({...x,displayUnitPrice:convertMoney(x.unitPrice,rate),displayLineTotal:convertMoney(x.lineTotal,rate)})),displaySubtotal=convertMoney(quote.subtotal,rate),displayShipping=convertMoney(quote.shipping,rate),displayTotal=convertMoney(quote.total,rate);
        tx.set(orderRef,{orderNumber,market:String(market||"za").toLowerCase(),customer:{uid:user.uid,email:customer.email.trim().toLowerCase(),firstName:customer.firstName.trim(),lastName:customer.lastName.trim(),phone:customer.phone.trim()},shippingAddress:{address:customer.address.trim(),city:customer.city.trim(),postalCode:customer.postalCode.trim(),province:customer.province.trim(),country:cfg.country,countryCode:cfg.countryCode||String(market||"za").toUpperCase()},items:displayItems,subtotal:quote.subtotal,shipping:quote.shipping,total:quote.total,currency:"ZAR",displaySubtotal,displayShipping,displayTotal,displayCurrency:cfg.currency,exchangeRate:rate,exchangeRateBase:"ZAR",paymentMethod,paymentStatus:"pending",fulfillmentStatus:"processing",status:"processing",inventoryStatus:"reserved",pricingSource:"server",createdAt:admin.firestore.FieldValue.serverTimestamp(),updatedAt:admin.firestore.FieldValue.serverTimestamp()});
        tx.set(keyRef,{uid:user.uid,orderId:orderRef.id,orderNumber,market:String(market||"za").toLowerCase(),currency:cfg.currency,exchangeRate:rate,displayTotal,createdAt:admin.firestore.FieldValue.serverTimestamp()});return{orderRef,orderNumber,reused:false,market:String(market||"za").toLowerCase(),currency:cfg.currency,rate,displayTotal}
    })
}
exports.adminInventoryAdjust = functions.https.onRequest(async(req,res)=>{
    if(req.method!=="POST")return res.status(405).json({success:false,message:"Method not allowed."});
    try{const actor=await requireAdmin(req),productId=String(req.body?.productId||""),sku=String(req.body?.sku||""),delta=Number(req.body?.delta),reason=String(req.body?.reason||"").trim().slice(0,180);if(!productId||!sku||!Number.isInteger(delta)||delta===0||Math.abs(delta)>10000||!reason)return res.status(400).json({success:false,message:"Product, SKU, whole-number adjustment and reason are required."});const db=admin.firestore(),ref=db.collection("products").doc(productId),log=db.collection("inventory_adjustments").doc();let result;await db.runTransaction(async tx=>{const snap=await tx.get(ref);if(!snap.exists){const e=new Error("Product not found.");e.status=404;throw e}const p=snap.data(),variants=Array.isArray(p.variants)?p.variants.map(v=>({...v})):[],i=variants.findIndex(v=>String(v.sku||"")===sku);if(i<0){const e=new Error("Variant SKU not found.");e.status=404;throw e}const before=Number(variants[i].stock??variants[i].quantity??0),after=before+delta;if(after<0){const e=new Error("Adjustment would make stock negative.");e.status=409;throw e}variants[i].stock=after;tx.update(ref,{variants,updatedAt:admin.firestore.FieldValue.serverTimestamp()});tx.set(log,{productId,productName:String(p.name||p.title||""),sku,variant:[variants[i].color,variants[i].size].filter(Boolean).join(" / "),before,delta,after,reason,actor:actor.email,createdAt:admin.firestore.FieldValue.serverTimestamp()});result={before,after}});return res.status(200).json({success:true,...result})}catch(error){console.error("Inventory adjustment failed:",error);return res.status(error.status||500).json({success:false,message:error.status?error.message:"Inventory adjustment failed."})}
});

exports.adminOrderAction = functions.https.onRequest(async(req,res)=>{
    if(req.method!=="POST")return res.status(405).json({success:false,message:"Method not allowed."});
    try{
        const adminUser=await requireAdmin(req),orderId=String(req.body&&req.body.orderId||""),action=String(req.body&&req.body.action||"");
        if(!orderId)return res.status(400).json({success:false,message:"Order ID is required."});
        const ref=admin.firestore().collection("orders").doc(orderId),snap=await ref.get();
        if(!snap.exists)return res.status(404).json({success:false,message:"Order not found."});
        if(action==="cancel"){
            const order=snap.data();
            if(order.paymentStatus==="paid")return res.status(409).json({success:false,message:"Paid orders require a refund workflow before cancellation."});
            await restoreOrderInventory(ref);
            await ref.update({status:"cancelled",fulfillmentStatus:"cancelled",cancelledAt:admin.firestore.FieldValue.serverTimestamp(),cancelledBy:adminUser.email,updatedAt:admin.firestore.FieldValue.serverTimestamp()});
        }else if(action==="mark_paid"){
            const order=snap.data();if(order.status==="cancelled"||order.fulfillmentStatus==="cancelled")return res.status(409).json({success:false,message:"A cancelled order cannot be marked paid."});if(order.paymentStatus==="paid")return res.status(200).json({success:true,unchanged:true});
            await ref.update({paymentStatus:"paid",paidAt:admin.firestore.FieldValue.serverTimestamp(),paymentVerifiedBy:adminUser.email,updatedAt:admin.firestore.FieldValue.serverTimestamp()});
        }else return res.status(400).json({success:false,message:"Unsupported order action."});
        await admin.firestore().collection("audit_logs").add({action:"order."+action,resource:"orders/"+orderId,actor:adminUser.email,createdAt:admin.firestore.FieldValue.serverTimestamp()});
        return res.status(200).json({success:true});
    }catch(error){console.error("Admin order action failed:",error);return res.status(error.status||500).json({success:false,message:error.status?error.message:"Order action failed."})}
});


const FX_MAX_AGE_MS=6*60*60*1000;
async function storedFxRate(to){const snap=await admin.firestore().collection("fx_rates").doc("ZAR_"+to).get();if(!snap.exists)return null;const d=snap.data(),updated=d.updatedAt&&d.updatedAt.toMillis?d.updatedAt.toMillis():0,rate=Number(d.rate);return Number.isFinite(rate)&&rate>0&&Date.now()-updated<=FX_MAX_AGE_MS?{rate,updatedAt:new Date(updated).toISOString(),source:d.source||"configured"}:null}
const MARKET_CURRENCIES = new Set(["ZAR","USD","NGN","BWP","GBP","EUR"]);
exports.market = functions.https.onRequest((req,res)=>{
    const raw = String(req.get("x-country-code") || req.get("cf-ipcountry") || req.get("x-appengine-country") || "").toUpperCase();
    const countryCode = /^[A-Z]{2}$/.test(raw) ? raw : "ZA";
    res.set("Cache-Control","private, max-age=300");
    return res.status(200).json({countryCode});
});
exports.exchangeRates = functions.https.onRequest(async(req,res)=>{
    const base=String(req.query.base||"ZAR").toUpperCase(),to=String(req.query.to||"ZAR").toUpperCase();
    if(base!=="ZAR"||!MARKET_CURRENCIES.has(to))return res.status(400).json({success:false,message:"Unsupported currency."});
    if(to==="ZAR")return res.status(200).json({base,to,rate:1});
    const stored=await storedFxRate(to);if(stored){res.set("Cache-Control","public, max-age=1800");return res.status(200).json({base,to,...stored})}
    const rate=Number(process.env["FX_"+base+"_"+to]);if(!Number.isFinite(rate)||rate<=0)return res.status(503).json({success:false,message:"A current verified exchange rate is not configured."});
    res.set("Cache-Control","public, max-age=1800");return res.status(200).json({base,to,rate,source:"environment"});
});
