// Match the existing Firestore isAdmin() rule and Functions requireAdmin().
// Never trust a role or administrator flag stored in a user's profile document.
const ownerEmails=new Set(['admin@drixelsa.co.za','drixelsa@gmail.com']);
export function hasAdminAccess(claims={}) {
 return claims.admin===true||claims.role==='admin'||
  claims.email_verified===true&&ownerEmails.has(String(claims.email||'').toLowerCase());
}
