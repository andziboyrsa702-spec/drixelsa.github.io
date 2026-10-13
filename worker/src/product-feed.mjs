import {getFirestore} from './firestore.mjs';
import {merchantFeed} from '../../src/utils/productSchema.js';
export async function productFeed(req,res){const snapshot=await getFirestore().collection('products').get(),feed=merchantFeed(snapshot.docs.map(s=>({...s.data(),id:s.id})));return res.set('Content-Type','application/xml; charset=utf-8').set('Cache-Control','public, max-age=300').send(feed.xml)}
