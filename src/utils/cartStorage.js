export const cartQuantity = value => Number.isFinite(Number(value)) ? Math.min(99, Math.max(1, Math.floor(Number(value)))) : 1;
export function validCart(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(item => item && typeof item === 'object' && typeof item.productId === 'string' && item.productId.trim() && Number.isFinite(Number(item.price)) && Number(item.price) >= 0)
    .slice(0, 100).map(item => ({...item, price: Number(item.price), quantity: cartQuantity(item.quantity)}));
}
export function readCart(storage) {
  try { return validCart(JSON.parse(storage.getItem('drixel_cart') || '[]')); } catch { return []; }
}
export function writeCart(storage, items) {
  try { storage.setItem('drixel_cart', JSON.stringify(items)); } catch { /* The in-memory cart remains usable. */ }
}
