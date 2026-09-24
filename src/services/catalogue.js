import { collection,getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { db } from "../config/firebase.js";
export async function getProducts(){const snapshot=await getDocs(collection(db,"products"));return snapshot.docs.map(item=>({id:item.id,...item.data()}))}
export function getCategories(products){return [...new Set(products.map(product=>product.category).filter(Boolean))].sort()}
export function getInventoryRows(products){const rows=[];products.forEach(product=>{if(Array.isArray(product.variants))product.variants.forEach(variant=>rows.push({productId:product.id,product:product.name||product.title,sku:variant.sku||"",variant:[variant.color,variant.size].filter(Boolean).join(" / "),stock:Number(variant.stock??variant.quantity??0)}));else(product.sizes||[]).forEach(size=>rows.push({productId:product.id,product:product.name||product.title,sku:"",variant:size,stock:null}))});return rows}
