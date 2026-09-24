export const adminSections=[
["HOME",[["dashboard","Dashboard"]]],
["COMMERCE",[["orders","Orders"],["products","Products"],["inventory","Inventory"],["collections","Collections"],["customers","Customers"],["returns","Returns"]]],
["CONTENT",[["content/storefront","Storefront"],["content/media","Media"]]],
["MARKETING",[["marketing/email","Email"],["marketing/subscribers","Subscribers"],["marketing/campaigns","Campaign Content"],["marketing/discounts","Discounts"]]],
["ANALYTICS",[["analytics/overview","Overview"]]],
["OPERATIONS",[["operations/payments","Payments"],["operations/shipping","Shipping"]]],
["SYSTEM",[["settings/store","Store Settings"],["settings/markets","Markets"],["settings/audit-log","Audit Log"]]]
];
export const adminPath=key=>"/za/admin/"+key;
export const adminTitle=key=>adminSections.flatMap(x=>x[1]).find(x=>x[0]===key)?.[1]||"Dashboard";