'use strict';
const crypto = require('node:crypto');
class CommerceError extends Error {
    constructor(code, message) { super(message); this.code = code; }
}
const fail = (message, code = 'invalid-argument') => { throw new CommerceError(code, message); };
const hash = value => crypto.createHash('sha256').update(String(value)).digest('hex');
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function text(value, name, max = 200, multiline = false) {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > max || (multiline ? /[\x00-\x08\x0b\x0c\x0e-\x1f<>]/ : /[\x00-\x1f<>]/).test(value)) fail(`Please enter a valid ${name}.`);
    return value.trim();
}
function email(value) {
    const result = text(value, 'email address', 254).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) fail('Please enter a valid email address.');
    return result;
}
function customer(input, authenticatedEmail) {
    const result = {};
    for (const key of ['name','phone','address','city','postalCode','province']) result[key] = text(input?.[key], key);
    result.email = email(authenticatedEmail);
    if (input.email && email(input.email) !== result.email) fail('Use your signed-in email address for this order.');
    return result;
}
function money(value) {
    const number = Number(value);
    const cents = Math.round(number * 100);
    if (!Number.isFinite(number) || number < 0 || !Number.isSafeInteger(cents) || cents > 100000000) fail('Invalid price configuration.', 'failed-precondition');
    return cents;
}
function normalizeItems(items) {
    if (!Array.isArray(items) || !items.length || items.length > 50) fail('Your bag must contain between 1 and 50 items.');
    const merged = new Map();
    for (const item of items) {
        const productId = text(String(item.productId ?? item.id ?? ''), 'product', 150);
        if (productId.includes('/')) fail('Invalid product.');
        const size = text(item.size, 'size', 40), color = text(item.color, 'colour', 80);
        if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) fail('Choose a quantity between 1 and 20.');
        const key = JSON.stringify([productId,size,color]);
        const quantity = (merged.get(key)?.quantity || 0) + item.quantity;
        if (quantity > 20) fail('The maximum quantity per size and colour is 20.');
        merged.set(key,{productId,size,color,quantity});
    }
    return [...merged.values()].sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}
function stockValue(value) {
    if (value == null) return null;
    if (!Number.isInteger(value) || value < 0) fail('Stock needs to be corrected by the store.', 'failed-precondition');
    return value;
}
// Run only against documents read inside the order transaction.
function priceItems(items, products) {
    const changes = new Map(), lines = [];
    for (const item of items) {
        const p = products.get(item.productId);
        if (!p || (p.status && p.status !== 'active')) fail('An item is no longer available. Please refresh your bag.', 'failed-precondition');
        if (!Array.isArray(p.sizes) || !p.sizes.includes(item.size) || !Array.isArray(p.colors) || !p.colors.some(c => (typeof c === 'string' ? c : c.name) === item.color)) fail(`Choose an available size and colour for ${p.name}.`, 'failed-precondition');
        const unitPriceCents = money(p.price);
        if (!unitPriceCents) fail('An item has no valid selling price.', 'failed-precondition');
        let change = changes.get(item.productId);
        if (!change) { change = { stock: stockValue(p.stock), variants: Array.isArray(p.variants) ? p.variants.map(v => ({...v})) : null }; changes.set(item.productId, change); }
        if (change.stock !== null) { if (change.stock < item.quantity) fail(`${p.name} has insufficient stock.`, 'failed-precondition'); change.stock -= item.quantity; }
        if (change.variants) {
            const variant = change.variants.find(v => v.size === item.size && v.color === item.color);
            if (!variant || stockValue(variant.stock) === null || variant.stock < item.quantity) fail(`${p.name} is sold out in this size and colour.`, 'failed-precondition');
            variant.stock -= item.quantity;
        }
        lines.push({...item, id:item.productId, name:text(p.name,'product name'), price:unitPriceCents / 100, unitPriceCents,
            image: typeof p.image === 'string' && !p.image.startsWith('data:') ? p.image : '',
            stockTracked: change.stock !== null, variantTracked: change.variants !== null});
    }
    return {lines, changes, subtotalCents:lines.reduce((sum,l) => sum + l.unitPriceCents*l.quantity, 0)};
}
function discountFor(coupon, subtotal, now = Date.now()) {
    if (!coupon) return 0;
    if (coupon.active === false || (coupon.expiry && (!Number.isFinite(Date.parse(coupon.expiry)) || Date.parse(coupon.expiry) < now)) || (coupon.maxUses && (coupon.usedCount || 0) >= coupon.maxUses)) fail('This discount code is unavailable.');
    if (subtotal < money(coupon.minOrder || 0)) fail('Your bag does not meet the discount minimum.');
    const amount = Number(coupon.amount);
    if (!Number.isFinite(amount) || amount <= 0 || !['percent','fixed'].includes(coupon.type) || (coupon.type === 'percent' && amount > 100)) fail('Invalid discount configuration.', 'failed-precondition');
    return Math.min(subtotal, coupon.type === 'percent' ? Math.round(subtotal*amount/100) : money(amount));
}
function verifyWebhook(headers, rawBody, secret, now = Date.now()) {
    const id = headers['webhook-id'], timestamp = headers['webhook-timestamp'];
    if (typeof id !== 'string' || !/^\d+$/.test(timestamp || '') || Math.abs(now/1000-Number(timestamp)) > 180 || !Buffer.isBuffer(rawBody) || !secret?.startsWith('whsec_')) return false;
    const expected = crypto.createHmac('sha256',Buffer.from(secret.slice(6),'base64')).update(`${id}.${timestamp}.`).update(rawBody).digest();
    return String(headers['webhook-signature'] || '').split(' ').some(part => {
        const [version, signature] = part.split(',');
        if (version !== 'v1' || !signature) return false;
        const actual = Buffer.from(signature,'base64');
        return actual.length === expected.length && crypto.timingSafeEqual(actual,expected);
    });
}
function paymentUpdate(order, event) {
    const p = event?.payload;
    if (event?.type !== 'payment.succeeded') return null;
    if (!p || p.status !== 'succeeded' || p.amount !== order.totalCents || p.currency !== 'ZAR' || p.mode !== order.paymentMode || p.metadata?.checkoutId !== order.checkoutId || typeof p.id !== 'string' || !p.id) fail('Payment does not match the order.', 'failed-precondition');
    if (order.paymentStatus === 'paid') { if (order.paymentId !== p.id) fail('Unexpected second payment.', 'failed-precondition'); return null; }
    return {paymentStatus:'paid', paymentId:p.id, status:order.stockReleased ? 'payment_review' : 'processing', reservationExpiresAt:null};
}
function adminUpdate(order, input) {
    if (input.action === 'confirm-payment') {
        if (!['bank','snapscan'].includes(order.paymentMethod)) fail('Card payments must be verified by Yoco.', 'failed-precondition');
        if (order.paymentStatus === 'paid') return {};
        if (order.stockReleased || order.status === 'cancelled') fail('Stock was released. Reconcile this payment and create a new order.', 'failed-precondition');
        return {paymentStatus:'paid', status:'processing', reservationExpiresAt:null};
    }
    if (input.action === 'customer') return {customer:{...order.customer,...customer({...order.customer,...input.customer,email:order.customer.email},order.customer.email)}};
    const status = input.status;
    const transitions = {pending:['cancelled'], processing:['shipped','cancelled'], shipped:['delivered'], delivered:[], cancelled:[], payment_review:[]};
    if (status === order.status) return {};
    if (!(transitions[order.status] || []).includes(status)) fail('That order status transition is not allowed.', 'failed-precondition');
    if (['shipped','delivered'].includes(status) && order.paymentStatus !== 'paid') fail('Verify payment before shipping.', 'failed-precondition');
    const update = {status};
    if (status === 'cancelled' && order.paymentStatus === 'paid') fail('Refund and reconcile paid orders with the payment provider before cancellation.', 'failed-precondition');
    if (status === 'shipped') {
        update.trackingNumber = text(input.trackingNumber,'tracking number',100);
        update.courierService = text(input.courierService,'courier',100);
        update.trackingUrl = input.trackingUrl || '';
        if (update.trackingUrl) { let u; try {u=new URL(update.trackingUrl);} catch {fail('Invalid tracking URL.');} if(u.protocol!=='https:') fail('Tracking links must use HTTPS.'); }
    }
    if (status === 'delivered') { if (!/^\d{4}-\d{2}-\d{2}$/.test(input.deliveredDate || '') || !Number.isFinite(Date.parse(input.deliveredDate))) fail('Choose a delivery date.'); update.deliveredDate=input.deliveredDate; }
    return update;
}
module.exports = {CommerceError,fail,hash,text,email,customer,money,normalizeItems,priceItems,discountFor,verifyWebhook,paymentUpdate,adminUpdate,escapeHtml};
