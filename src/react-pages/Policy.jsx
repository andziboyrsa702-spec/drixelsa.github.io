import React from"react";import{Link,useParams}from"react-router-dom";import Layout from"../components/Layout.jsx";import Seo from"../components/Seo.jsx";
const DATA={
"shipping-policy":{title:"Shipping information",intro:"Delivery, processing and tracking information for Drixel orders.",sections:[
["Delivery partners","We work with The Courier Guy and PAXI for reliable nationwide delivery across South Africa. Tracking and delivery confirmation are provided where available."],
["Delivery fees","Standard South African delivery is R70. Free delivery is automatically applied to qualifying orders over R1000."],
["Delivery time","Standard delivery is normally 3–5 business days after order processing is complete."],
["Order processing","Orders generally require 1–3 business days for verification, quality checks and packing. Made-to-order items can require additional production time."],
["Delivery areas","South African delivery is available to supported street addresses. Remote areas can take longer."],
["Tracking your order","When an order ships, Drixel sends the available tracking information to the customer."],
["Delivery problems","For delays, missing deliveries or damaged parcels, contact drixelsa@gmail.com with your order number."]
]},
"returns-policy":{title:"Returns & exchanges",intro:"Information about returning or exchanging eligible Drixel purchases.",sections:[
["Return requests","Contact Drixel customer care with your order number and the reason for the return or exchange. Eligibility is assessed under the applicable return conditions."],
["Item condition","Items being returned should be unworn, unwashed and in their original condition with applicable tags and packaging."],
["Incorrect or damaged items","If an item arrives incorrect or damaged, contact customer care promptly with your order information and supporting photos where appropriate."],
["Refunds","Approved refunds are processed after the returned item has been received and assessed. Payment processing times can vary by payment provider."],
["Contact","For return and exchange assistance, email drixelsa@gmail.com."]
]},
"privacy-policy":{title:"Privacy policy",intro:"How Drixel handles personal information used to operate the store and fulfil orders.",sections:[
["Information we collect","We may collect information you provide for accounts, orders and customer support, such as your name, email address, telephone number and delivery address."],
["How information is used","Information is used to process and fulfil orders, coordinate delivery, provide transactional updates and support customers."],
["Payment information","Card payment information is handled by the configured payment provider. Drixel should not collect or store raw card details in its storefront."],
["Service providers","Necessary information may be shared with service providers such as delivery partners when required to fulfil an order."],
["Your choices","You may contact Drixel about your personal information and communication preferences at drixelsa@gmail.com."]
]},
"terms-of-use":{title:"Terms & conditions",intro:"Terms governing use of the Drixel storefront and purchases made through it.",sections:[
["Use of the store","By using the Drixel storefront you agree to use it lawfully and in accordance with these terms."],
["Products and pricing","Products are subject to availability. Prices and product information may be updated. The price and availability presented during checkout are verified before an order is created."],
["Orders and payment","Orders are subject to acceptance and successful payment or payment verification, depending on the payment method offered at checkout."],
["Delivery","Delivery options, fees and estimated timeframes are presented for supported destinations and may vary by market."],
["Returns and refunds","Eligible returns, exchanges and refunds are handled according to the Drixel returns policy."],
["Customer support","Questions about an order or these terms can be sent to drixelsa@gmail.com."]
]}};export default function Policy(){const{market,policy}=useParams(),d=DATA[policy];if(!d)return null;return <Layout><Seo title={d.title+" | Drixel"} description={d.intro}/><main className="dx-policy"><header><p>DRIXEL / HELP</p><h1>{d.title}</h1><span>{d.intro}</span></header><div className="dx-policy-body">{d.sections.map(([h,p],i)=><section key={h}><b>{String(i+1).padStart(2,"0")}</b><div><h2>{h}</h2><p>{p}</p></div></section>)}</div><div className="dx-policy-nav"><Link to={`/${market}/help/returns-policy`}>Returns & exchanges</Link><Link to={`/${market}/help/shipping-policy`}>Shipping</Link><Link to={`/${market}/contact`}>Customer care</Link></div></main></Layout>}