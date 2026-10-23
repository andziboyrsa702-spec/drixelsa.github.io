/* One-time Drixel admin claim provisioner.
   Run only from an authenticated Firebase Admin environment.
   Usage: node scripts/grant-admin.js <email>
*/
const admin=require("firebase-admin");
const email=String(process.argv[2]||"").trim().toLowerCase();
if(!email){console.error("Usage: node scripts/grant-admin.js <email>");process.exit(1)}
if(!admin.apps.length)admin.initializeApp();
(async()=>{try{const user=await admin.auth().getUserByEmail(email);const claims={...(user.customClaims||{}),admin:true,role:"admin"};await admin.auth().setCustomUserClaims(user.uid,claims);console.log(`Admin access granted to ${email}. Sign out and sign in again to refresh the ID token.`)}catch(err){console.error("Could not grant admin access:",err.message);process.exit(1)}})();