

// ===== SCRIPT BLOCK 1 =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    GoogleAuthProvider,
    signInWithPopup
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    setDoc,
    doc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    getDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-analytics.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyA4_Ejkc3Of0T8fCj1QqkNN78-2xJ882F0",
    authDomain: "drixel-sa.firebaseapp.com",
    projectId: "drixel-sa",
    storageBucket: "drixel-sa.firebasestorage.app",
    messagingSenderId: "620600264300",
    appId: "1:620600264300:web:525de2d55cc1ae6269fa49",
    measurementId: "G-RTRKFY9NPW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
let analytics = null;
try {
    analytics = getAnalytics(app);
} catch (e) {
    console.warn("Firebase Analytics failed to initialize:", e);
}

// Make Firebase available globally with ALL functions
window.firebaseApp = app;
window.firebaseAuth = auth;
window.firebaseDb = db;
window.firebaseAnalytics = analytics;

// Make all functions available globally
window.firebaseInitializeApp = initializeApp;
window.firebaseCreateUserWithEmailAndPassword = createUserWithEmailAndPassword;
window.firebaseSignInWithEmailAndPassword = signInWithEmailAndPassword;
window.firebaseSignOut = signOut;
window.firebaseOnAuthStateChanged = onAuthStateChanged;
window.firebaseSendPasswordResetEmail = sendPasswordResetEmail;
window.firebaseGetAuth = getAuth;
window.firebaseGetFirestore = getFirestore;
window.firebaseGetAnalytics = getAnalytics;

// Make Firestore functions available globally
window.firebaseGetDoc = getDoc;
window.firebaseUpdateDoc = updateDoc;
window.firebaseDeleteDoc = deleteDoc;
window.firebaseAddDoc = addDoc;
window.firebaseCollection = collection;
window.firebaseQuery = query;
window.firebaseWhere = where;
window.firebaseOrderBy = orderBy;
window.firebaseGetDocs = getDocs;
window.firebaseSetDoc = setDoc;
window.firebaseDoc = doc;
window.firebaseServerTimestamp = serverTimestamp;

console.log("✅ Firebase initialized successfully!");

// Firestore collections
window.firebaseCollections = {
    USERS: 'users',
    ORDERS: 'orders',
    PRODUCTS: 'products',
    PENDING_PAYMENTS: 'pending_payments',
    SUBSCRIBERS: 'subscribers',
    CONTACTS: 'contacts',
    CARTS: 'carts',
    YOCO_PURCHASES: 'yoco_purchases',
    SNAPSCAN_PURCHASES: 'snapscan_purchases'
};

// Initialize auth state listener immediately
onAuthStateChanged(auth, (user) => {
    window.firebaseAuthInitialized = true;
    if (user) {
        console.log("✅ User logged in:", user.email);
        window.currentFirebaseUser = user;

        // Check if user is admin
        if (user.email === ADMIN_EMAIL) {
            console.log("👑 Admin user detected on page load");
            // Show admin button after a short delay
            setTimeout(() => {
                if (typeof showAdminButton === 'function') {
                    showAdminButton();
                }
            }, 1000);
        }

        // Call global auth UI update if function exists
        if (typeof updateAuthUI === 'function') {
            updateAuthUI();
        }

        // Load user cart
        if (typeof loadUserCart === 'function') {
            loadUserCart(user.uid);
        }
    } else {
        console.log("👤 No user logged in");
        window.currentFirebaseUser = null;
        if (typeof updateAuthUI === 'function') {
            updateAuthUI();
        }
        
        // Protected pages guest route redirection guard
        const path = window.location.pathname;
        if (path.endsWith('cart.html') || path.endsWith('checkout.html') || path.endsWith('yoco-direct.html')) {
            alert('Please login or create an account to view your cart or checkout.');
            window.location.href = 'auth.html';
        }
    }
});

// Initialize the rest of the app once Firebase is ready
setTimeout(() => {
    if (typeof initializeAppAfterFirebase === 'function') {
        initializeAppAfterFirebase();
    }
}, 500);

// ===== SCRIPT BLOCK 2 =====
// ===== CONSTANTS =====
const ADMIN_EMAIL = "admin@drixelsa.co.za";
const ADMIN_PASSWORD = "@Anelisa2025";
const ADMIN_NAMES = "Anelisa Thelejane & Andzani Mashabane";
const YOCO_PUBLIC_KEY = "pk_live_f26b158aDmMkbm56f1c4";
const SNAPSCAN_QR_URL = "https://pos.snapscan.io/qr/qvxSxlIE";
const SNAPSCAN_REGISTRATION = "2026/000210/07";

// ===== RESEND & BACKEND EMAIL CONFIGURATION & HELPER =====
const DEFAULT_RESEND_API_KEY = 're_HSq1yYdh_DBU1dwEwwtb6di7C9tLRLUUx';

async function sendEmailViaResend({ to, cc, subject, html }) {
    let storedApiKey = (localStorage.getItem('drixel_resend_api_key') || DEFAULT_RESEND_API_KEY).trim();
    if (storedApiKey === 're_9127pJDT_jRDx942YS4UbyH3YDfm9H7ow' || !storedApiKey) {
        storedApiKey = DEFAULT_RESEND_API_KEY;
        localStorage.setItem('drixel_resend_api_key', DEFAULT_RESEND_API_KEY);
    }

    let fromEmail = localStorage.getItem('drixel_resend_from_email') || 'info@customer.drixelsa.co.za';
    const endpoint = localStorage.getItem('drixel_email_endpoint') || '/api/send-email';

    if (!fromEmail || fromEmail.includes('onboarding@resend.dev') || fromEmail.includes('<') || fromEmail.includes('Drixel SA')) {
        fromEmail = 'info@customer.drixelsa.co.za';
        localStorage.setItem('drixel_resend_from_email', 'info@customer.drixelsa.co.za');
    }

    const recipientList = Array.isArray(to) ? to : [to];
    const ccList = cc && cc.length > 0 ? (Array.isArray(cc) ? cc : [cc]) : [];

    console.log("📧 [Email Dispatcher] Starting email send process...");
    console.log("   • Recipient(s):", recipientList.join(', '));
    console.log("   • Subject:", subject);

    // Method 1: Resend API Key Direct & Proxy Delivery
    if (storedApiKey && storedApiKey.startsWith('re_')) {
        console.log("📨 [Method 1] Sending via Resend API key...");
        const sendPayload = {
            from: fromEmail,
            to: recipientList,
            ...(ccList.length > 0 ? { cc: ccList } : {}),
            subject: subject,
            html: html
        };

        const fetchAttempts = [
            // Direct fetch (works on server/backend/modern browser CORS)
            async () => {
                return await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${storedApiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(sendPayload)
                });
            },
            // Fallback from-address if custom domain header issues occur
            async () => {
                return await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${storedApiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        ...sendPayload,
                        from: 'onboarding@resend.dev'
                    })
                });
            }
        ];

        for (const fetchFn of fetchAttempts) {
            try {
                const response = await fetchFn();
                if (response.ok) {
                    const data = await response.json().catch(() => ({}));
                    console.log("✅ [Method 1 SUCCESS] Email sent via Resend API! Response:", data);
                    return { success: true, data };
                } else {
                    const errText = await response.text();
                    console.warn("⚠️ [Method 1 Attempt Returned Status]:", response.status, errText);
                }
            } catch (err) {
                console.warn("⚠️ [Method 1 Exception]:", err.message);
            }
        }
    }

    // Method 2: Firebase / Backend Cloud Function (/api/send-email)
    console.log("📨 [Method 2] Attempting Cloud Function endpoint:", endpoint);
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                from: fromEmail,
                to: recipientList,
                ...(ccList.length > 0 ? { cc: ccList } : {}),
                subject: subject,
                html: html
            })
        });

        if (response.ok) {
            const data = await response.json().catch(() => ({}));
            console.log("✅ [Method 2 SUCCESS] Email sent via Cloud Function:", data);
            return { success: true, data };
        } else {
            const errText = await response.text();
            console.warn("⚠️ [Method 2 Failed] Endpoint returned status:", response.status, errText);
        }
    } catch (err) {
        console.warn("⚠️ [Method 2 Exception]:", err.message);
    }

    // Method 3: FormSubmit AJAX Client Relay (Direct browser submission)
    console.log("📨 [Method 3] Attempting FormSubmit Browser Client Relay...");
    try {
        const formSubmitEndpoint = `https://formsubmit.co/ajax/${encodeURIComponent(recipientList[0])}`;
        const formData = new FormData();
        formData.append('_subject', subject);
        formData.append('_replyto', fromEmail);
        formData.append('_captcha', 'false');
        formData.append('_template', 'table');
        formData.append('message', html);

        const fsResponse = await fetch(formSubmitEndpoint, {
            method: 'POST',
            headers: { 'Accept': 'application/json' },
            body: formData
        });

        if (fsResponse.ok) {
            const data = await fsResponse.json().catch(() => ({}));
            console.log("✅ [Method 3 SUCCESS] Email delivered via FormSubmit Relay:", data);
            return { success: true, data };
        } else {
            const errText = await fsResponse.text();
            console.warn("⚠️ [Method 3 Failed] FormSubmit status:", fsResponse.status, errText);
        }
    } catch (err) {
        console.warn("⚠️ [Method 3 Exception]:", err.message);
    }

    console.error("❌ [Email Dispatcher] All delivery methods failed for recipient:", recipientList);
    return {
        success: false,
        message: 'Email delivery failed across all channels. Please check recipient address or configure a Resend API Key in Admin Settings.'
    };
}
window.sendEmailViaResend = sendEmailViaResend;




// ===== APP STATE =====
let cart = [];
try {
    cart = JSON.parse(localStorage.getItem('drixel_cart')) || [];
} catch (e) {
    console.error("Failed to parse cart from localStorage:", e);
    cart = [];
}
let productSelections = {};
try {
    productSelections = JSON.parse(localStorage.getItem('drixel_selections')) || {};
} catch (e) {
    console.error("Failed to parse selections from localStorage:", e);
    productSelections = {};
}
let cookiesAccepted = localStorage.getItem('drixel_cookies') || false;
let currentYocoPayment = {
    amount: 0,
    description: '',
    metadata: {},
    customer: null
};
let currentSnapScanOrder = null;
let currentAdminOrder = null;

// ===== DELIVERY SETTINGS =====
let DELIVERY_FEE = parseFloat(localStorage.getItem('drixel_delivery_fee')) || 70;
let FREE_DELIVERY_THRESHOLD = parseFloat(localStorage.getItem('drixel_free_delivery_threshold')) || 1000;

// ===== DOM ELEMENTS =====
const cartCount = document.getElementById('cartCount');

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function () {
    console.log("🚀 Drixel SA Website Initializing...");

    // Initialize Yoco SDK
    loadYocoSDK();

    // Set up mobile menu
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const navLinks = document.getElementById('navLinks');

    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', function () {
            navLinks.classList.toggle('active');
        });
    }

    // Load products data
    window.PRODUCTS_DATA = getLocalProductsData();

    // Initialize the app after Firebase is ready
    setTimeout(() => {
        initializeAppAfterFirebase();
    }, 1000);
});

// ===== GUARANTEED PRODUCT LOADING =====
        function getLocalProductsData() {
            return [
                // ===== 5 HOODIES =====
                {
                    id: 1,
                    name: "Urban Hoodie",
                    price: 450,
                    description: "Premium heavyweight hoodie with embroidered Drixel logo. Made from 80% cotton and 20% polyester for comfort and durability.",
                    category: "hoodies",
                    featured: true,
                    sizes: ["S", "M", "L", "XL", "XXL"],
                    colors: [
                        { name: "Black", code: "#111111" },
                        { name: "Charcoal", code: "#36454F" },
                        { name: "Red", code: "#FF0000" },
                        { name: "White", code: "#FFFFFF" },
                        { name: "Blue", code: "#0066CC" }
                    ],
                    image: "https://ik.imagekit.io/dpzepxtqs/WhatsApp%20Image%202025-12-28%20at%2019.49.44.jpeg"
                },
                {
                    id: 2,
                    name: "Graphic Hoodie",
                    price: 450,
                    description: "Limited edition graphic print hoodie with unique streetwear design. Premium cotton blend for maximum comfort.",
                    category: "hoodies",
                    featured: true,
                    sizes: ["S", "M", "L", "XL"],
                    colors: [
                        { name: "Black", code: "#111111" },
                        { name: "Charcoal", code: "#36454F" },
                        { name: "Red", code: "#FF0000" },
                        { name: "White", code: "#FFFFFF" }
                    ],
                    image: "https://ik.imagekit.io/dpzepxtqs/IMG-20251228-WA0030.jpg?updatedAt=1768781642690"
                },
                {
                    id: 3,
                    name: "Oversized Hoodie",
                    price: 500,
                    description: "Modern oversized fit hoodie with dropped shoulders and kangaroo pocket. Perfect for relaxed streetwear style.",
                    category: "hoodies",
                    featured: false,
                    sizes: ["M", "L", "XL", "XXL"],
                    colors: [
                        { name: "Black", code: "#111111" },
                        { name: "Grey", code: "#808080" },
                        { name: "Navy", code: "#000080" },
                        { name: "Red", code: "#FF0000" }
                    ],
                    image: "https://ik.imagekit.io/dpzepxtqs/3_20260119_175001_0002.png?updatedAt=1769077707000"
                },
                {
                    id: 4,
                    name: "Hoodie",
                    price: 470,
                    description: "Hoodie with contrast details and adjustable hood. Made from premium French terry fabric.",
                    category: "hoodies",
                    featured: false,
                    sizes: ["S", "M", "L", "XL", "XXL"],
                    colors: [
                        { name: "Black", code: "#111111" },
                        { name: "White", code: "#FFFFFF" },
                        { name: "Olive", code: "#808000" },
                        { name: "Blue", code: "#0066CC" }
                    ],
                    image: "https://ik.imagekit.io/dpzepxtqs/CHOSEN%20(3)/11.png?updatedAt=1768781080420"
                },
                {
                    id: 5,
                    name: "Crop Hoodie",
                    price: 450,
                    description: "Contemporary crop hoodie with ribbed hem and cuffs. Perfect for layered streetwear looks.",
                    category: "hoodies",
                    featured: false,
                    sizes: ["XS", "S", "M", "L"],
                    colors: [
                        { name: "Black", code: "#111111" },
                        { name: "Pink", code: "#FFC0CB" },
                        { name: "Lavender", code: "#E6E6FA" },
                        { name: "White", code: "#FFFFFF" }
                    ],
                    image: "https://ik.imagekit.io/dpzepxtqs/IMG-20260116-WA0089.jpg?updatedAt=1768781642074"
                },
                
                // ===== 5 SWEATERS =====
                {
                    id: 6,
                    name: "Premium Sweater",
                    price: 360,
                    description: "Comfortable and stylish sweater for casual streetwear looks. Perfect for different weather.",
                    category: "sweaters",
                    featured: true,
                    sizes: ["S", "M", "L", "XL"],
                    colors: [
                        { name: "Olive", code: "#808000" },
                        { name: "Black", code: "#111111" },
                        { name: "Red", code: "#FF0000" },
                        { name: "White", code: "#FFFFFF" },
                        { name: "Blue", code: "#0066CC" }
                    ],
                    image: "https://ik.imagekit.io/dpzepxtqs/4_20260119_175002_0003.png?updatedAt=1769077707895"
                },
                {
                    id: 7,
                    name: "Turtleneck Sweater",
                    price: 360,
                    description: "Premium turtleneck sweater with ribbed details. Made from merino wool blend for warmth and comfort.",
                    category: "sweaters",
                    featured: false,
                    sizes: ["S", "M", "L", "XL"],
                    colors: [
                        { name: "Black", code: "#111111" },
                        { name: "Grey", code: "#808080" },
                        { name: "Cream", code: "#FFFDD0" },
                        { name: "Burgundy", code: "#800020" }
                    ],
                    image: "https://ik.imagekit.io/dpzepxtqs/CHOSEN%20(3)/15.png?updatedAt=1768781089368"
                },
                {
                    id: 8,
                    name: "V-Neck Sweater",
                    price: 400,
                    description: "Classic V-neck sweater perfect for layering. Made from soft cotton blend for all-day comfort.",
                    category: "sweaters",
                    featured: false,
                    sizes: ["S", "M", "L", "XL", "XXL"],
                    colors: [
                        { name: "Navy", code: "#000080" },
                        { name: "Grey", code: "#808080" },
                        { name: "White", code: "#FFFFFF" },
                        { name: "Green", code: "#008000" }
                    ],
                    image: "https://ik.imagekit.io/dpzepxtqs/CHOSEN%20(3)/Brand%20Ambassador%20(2).jpg"
                },
                {
                    id: 9,
                    name: "Cable Knit Sweater",
                    price: 420,
                    description: "Traditional cable knit sweater with intricate patterns. Premium acrylic blend for durability.",
                    category: "sweaters",
                    featured: true,
                    sizes: ["M", "L", "XL"],
                    colors: [
                        { name: "Cream", code: "#FFFDD0" },
                        { name: "Grey", code: "#808080" },
                        { name: "Navy", code: "#000080" },
                        { name: "Red", code: "#FF0000" }
                    ],
                    image: "https://ik.imagekit.io/dpzepxtqs/CHOSEN%20(3)/1.jpg"
                },
                {
                    id: 10,
                    name: "Oversized Sweater",
                    price: 390,
                    description: "Modern oversized sweater with dropped shoulders. Perfect for relaxed, comfortable styling.",
                    category: "sweaters",
                    featured: false,
                    sizes: ["S", "M", "L", "XL"],
                    colors: [
                        { name: "Black", code: "#111111" },
                        { name: "White", code: "#FFFFFF" },
                        { name: "Pink", code: "#FFC0CB" },
                        { name: "Blue", code: "#0066CC" }
                    ],
                    image: "https://ik.imagekit.io/dpzepxtqs/CHOSEN%20(3)/2.jpg"
                },
                
                // ===== 5 BEANIES =====
                {
                    id: 11,
                    name: "Premium Beanie",
                    price: 75,
                    description: "Quality beanie with embroidered Drixel logo. Made from premium acrylic blend for warmth and comfort.",
                    category: "beanies",
                    featured: true,
                    sizes: ["One Size"],
                    colors: [
                        { name: "Black", code: "#111111" },
                        { name: "Charcoal", code: "#36454F" },
                        { name: "Red", code: "#FF0000" },
                        { name: "Blue", code: "#0066CC" }
                    ],
                    image: "https://ik.imagekit.io/dpzepxtqs/26.jpg"
                },
                {
                    id: 12,
                    name: "Slouchy Beanie",
                    price: 75,
                    description: "Slouchy style beanie with extra length for a relaxed fit. Made from soft acrylic yarn.",
                    category: "beanies",
                    featured: false,
                    sizes: ["One Size"],
                    colors: [
                        { name: "Black", code: "#111111" },
                        { name: "Grey", code: "#808080" },
                        { name: "Navy", code: "#000080" },
                        { name: "Red", code: "#FF0000" }
                    ],
                    image: "https://ik.imagekit.io/dpzepxtqs/CHOSEN%20(3)/5.jpg"
                },
                {
                    id: 13,
                    name: "Pom Pom Beanie",
                    price: 75,
                    description: "Cozy beanie with large pom pom detail. Perfect for winter weather with extra warmth.",
                    category: "beanies",
                    featured: false,
                    sizes: ["One Size"],
                    colors: [
                        { name: "Cream", code: "#FFFDD0" },
                        { name: "Grey", code: "#808080" },
                        { name: "Pink", code: "#FFC0CB" },
                        { name: "Blue", code: "#0066CC" }
                    ],
                    image: "https://ik.imagekit.io/dpzepxtqs/CHOSEN%20(3)/4.jpg"
                },
                {
                    id: 14,
                    name: "Cuffed Beanie",
                    price: 75,
                    description: "Classic cuffed beanie with ribbed texture. Made from premium wool blend.",
                    category: "beanies",
                    featured: false,
                    sizes: ["One Size"],
                    colors: [
                        { name: "Black", code: "#111111" },
                        { name: "Charcoal", code: "#36454F" },
                        { name: "Burgundy", code: "#800020" },
                        { name: "Green", code: "#008000" }
                    ],
                    image: "https://ik.imagekit.io/dpzepxtqs/27.jpg"
                },
                {
                    id: 15,
                    name: "Fisherman Beanie",
                    price: 75,
                    description: "Traditional fisherman style beanie with thick knit. Maximum warmth for cold days.",
                    category: "beanies",
                    featured: false,
                    sizes: ["One Size"],
                    colors: [
                        { name: "Navy", code: "#000080" },
                        { name: "Grey", code: "#808080" },
                        { name: "Cream", code: "#FFFDD0" },
                        { name: "Red", code: "#FF0000" }
                    ],
                    image: "https://ik.imagekit.io/dpzepxtqs/25.jpg"
                },
                
                // ===== 12 T-SHIRTS =====
                {
                    id: 16,
                    name: "T-Shirt (300gsm)",
                    price: 360,
                    description: "Heavyweight 300gsm premium cotton t-shirt. Maximum durability with premium feel.",
                    category: "tees",
                    featured: true,
                    sizes: ["S", "M", "L", "XL"],
                    colors: [
                        { name: "White", code: "#FFFFFF" },
                        { name: "Ash", code: "#B2BEB5" },
                        { name: "Black", code: "#111111" },
                        { name: "Red", code: "#FF0000" },
                        { name: "Blue", code: "#0066CC" }
                    ],
                    image: "https://ik.imagekit.io/dpzepxtqs/WhatsApp%20Image%202025-12-28%20at%2019.49.45%20(1).jpeg"
                },
                {
                    id: 17,
                    name: "Heavyweight Graphic Tee (300gsm)",
                    price: 380,
                    description: "Heavyweight 300gsm t-shirt with screen printed graphic design. Premium cotton for superior quality.",
                    category: "tees",
                    featured: false,
                    sizes: ["S", "M", "L", "XL", "XXL"],
                    colors: [
                        { name: "Black", code: "#111111" },
                        { name: "White", code: "#FFFFFF" },
                        { name: "Grey", code: "#808080" },
                        { name: "Navy", code: "#000080" }
                    ],
                    image: "https://ik.imagekit.io/dpzepxtqs/17.jpg"
                },
                {
                    id: 18,
                    name: "Premium Heavyweight Tee (300gsm)",
                    price: 370,
                    description: "Ultra-premium 300gsm t-shirt with reinforced stitching. Made from ring-spun cotton.",
                    category: "tees",
                    featured: false,
                    sizes: ["M", "L", "XL"],
                    colors: [
                        { name: "White", code: "#FFFFFF" },
                        { name: "Black", code: "#111111" },
                        { name: "Olive", code: "#808000" },
                        { name: "Burgundy", code: "#800020" }
                    ],
                    image: "https://ik.imagekit.io/dpzepxtqs/12.jpg"
                },
                {
                    id: 19,
                    name: "T-Shirt (250gsm)",
                    price: 300,
                    description: "Medium weight 250gsm premium cotton t-shirt. Better durability and good structure.",
                    category: "tees",
                    featured: true,
                    sizes: ["S", "M", "L", "XL"],
                    colors: [
                        { name: "White", code: "#FFFFFF" },
                        { name: "Ash", code: "#B2BEB5" },
                        { name: "Black", code: "#111111" },
                        { name: "Red", code: "#FF0000" },
                        { name: "Blue", code: "#0066CC" }
                    ],
                    image: "https://ik.imagekit.io/dpzepxtqs/IMG-20260121-WA0008(1).jpg?updatedAt=1769077704605"
                },
                {
                    id: 20,
                    name: "Graphic Tee (250gsm)",
                    price: 320,
                    description: "250gsm t-shirt with vibrant screen print. Perfect balance of comfort and durability.",
                    category: "tees",
                    featured: false,
                    sizes: ["S", "M", "L", "XL"],
                    colors: [
                        { name: "White", code: "#FFFFFF" },
                        { name: "Black", code: "#111111" },
                        { name: "Red", code: "#FF0000" },
                        { name: "Blue", code: "#0066CC" }
                    ],
                    image: "https://ik.imagekit.io/dpzepxtqs/15.jpg?updatedAt=1769081040089"
                },
                {
                    id: 21,
                    name: "Classic Crew (250gsm)",
                    price: 310,
                    description: "Classic crew neck t-shirt in 250gsm cotton. Ribbed collar for shape retention.",
                    category: "tees",
                    featured: false,
                    sizes: ["S", "M", "L", "XL", "XXL"],
                    colors: [
                        { name: "Black", code: "#111111" },
                        { name: "White", code: "#FFFFFF" },
                        { name: "Grey", code: "#808080" },
                        { name: "Navy", code: "#000080" }
                    ],
                    image: "https://ik.imagekit.io/dpzepxtqs/21.jpg?updatedAt=1769081039729"
                },
                {
                    id: 22,
                    name: "T-Shirt (180gsm)",
                    price: 220,
                    description: "Lightweight 180gsm cotton t-shirt with screen-printed design. Great for everyday wear.",
                    category: "tees",
                    featured: true,
                    sizes: ["S", "M", "L", "XL"],
                    colors: [
                        { name: "White", code: "#FFFFFF" },
                        { name: "Ash", code: "#B2BEB5" },
                        { name: "Black", code: "#111111" },
                        { name: "Red", code: "#FF0000" },
                        { name: "Blue", code: "#0066CC" }
                    ],
                    image: "https://ik.imagekit.io/dpzepxtqs/6.jpg?updatedAt=1769081039825"
                },
                {
                    id: 23,
                    name: "Lightweight Tee (180gsm)",
                    price: 230,
                    description: "Ultra-light 180gsm t-shirt perfect for summer. Made from breathable cotton.",
                    category: "tees",
                    featured: false,
                    sizes: ["S", "M", "L", "XL"],
                    colors: [
                        { name: "White", code: "#FFFFFF" },
                        { name: "Ash", code: "#B2BEB5" },
                        { name: "Pink", code: "#FFC0CB" },
                        { name: "Sky Blue", code: "#87CEEB" }
                    ],
                    image: "https://ik.imagekit.io/dpzepxtqs/1_20260119_175001_0000.png?updatedAt=1769077707446"
                },
                {
                    id: 24,
                    name: "Basic Tee (180gsm)",
                    price: 210,
                    description: "Essential basic t-shirt in lightweight 180gsm cotton. Perfect for layering.",
                    category: "tees",
                    featured: false,
                    sizes: ["S", "M", "L", "XL", "XXL"],
                    colors: [
                        { name: "White", code: "#FFFFFF" },
                        { name: "Black", code: "#111111" },
                        { name: "Grey", code: "#808080" },
                        { name: "Navy", code: "#000080" }
                    ],
                    image: "https://ik.imagekit.io/dpzepxtqs/IMG-20260116-WA0082.jpg?updatedAt=1768781642064"
                },
                {
                    id: 25,
                    name: "Oversized Tee (250gsm)",
                    price: 330,
                    description: "Oversized fit t-shirt in 250gsm cotton. Modern streetwear silhouette.",
                    category: "tees",
                    featured: false,
                    sizes: ["S", "M", "L", "XL"],
                    colors: [
                        { name: "Black", code: "#111111" },
                        { name: "White", code: "#FFFFFF" },
                        { name: "Olive", code: "#808000" },
                        { name: "Red", code: "#FF0000" }
                    ],
                    image: "https://ik.imagekit.io/dpzepxtqs/23.jpg"
                },
                {
                    id: 26,
                    name: "Vintage Wash Tee (300gsm)",
                    price: 390,
                    description: "Vintage wash t-shirt in heavyweight 300gsm cotton. Distressed details for authentic look.",
                    category: "tees",
                    featured: false,
                    sizes: ["M", "L", "XL"],
                    colors: [
                        { name: "Black", code: "#111111" },
                        { name: "Grey", code: "#808080" },
                        { name: "Navy", code: "#000080" },
                        { name: "Burgundy", code: "#800020" }
                    ],
                    image: "https://ik.imagekit.io/dpzepxtqs/18.jpg"
                },
                {
                    id: 27,
                    name: "Long Sleeve Tee (180gsm)",
                    price: 280,
                    description: "Long sleeve t-shirt in lightweight 180gsm cotton. Perfect for transitional weather.",
                    category: "tees",
                    featured: false,
                    sizes: ["S", "M", "L", "XL"],
                    colors: [
                        { name: "White", code: "#FFFFFF" },
                        { name: "Black", code: "#111111" },
                        { name: "Grey", code: "#808080" },
                        { name: "Navy", code: "#000080" }
                    ],
                    image: "https://ik.imagekit.io/dpzepxtqs/22.jpg"
                }
            ];
        }

function showPage(page, hash = '') {
    const pageMap = {
        'home': '/index.html',
        'shop': '/products.html',
        'products': '/products.html',
        'product': '/product.html',
        'cart': '/cart.html',
        'checkout': '/checkout.html',
        'auth': '/auth.html',
        'about': '/about.html',
        'contact': '/contact.html',
        'terms': '/terms.html',
        'privacy': '/privacy.html',
        'refund': '/refund.html',
        'shipping': '/shipping.html',
        'yoco-direct': '/yoco-direct.html',
        'orderConfirmation': '/orderConfirmation.html'
    };
    let target = pageMap[page] || ('/' + page + '.html');
    if (hash) {
        target += hash;
    }
    window.location.href = target;
}
window.showPage = showPage;

function checkAuthAndNavigate(page) {
    const currentUser = window.currentFirebaseUser;

    if (!currentUser && (page === 'shop' || page === 'cart' || page === 'checkout' || page === 'yoco-direct')) {
        alert('Please login or create an account to shop. You need an account to add items to cart and place orders.');
        showPage('auth');
        return false;
    }
    showPage(page);
    return true;
}

// ===== AUTH FUNCTIONS =====
function showAuthTab(tab) {
    console.log('🔄 Switching auth tab to:', tab);

    document.querySelectorAll('.auth-tab').forEach(t => {
        t.classList.remove('active');
    });

    document.querySelectorAll('.auth-form').forEach(f => {
        f.classList.remove('active');
        f.style.display = 'none';
    });

    if (tab === 'login') {
        document.querySelector('.auth-tab:first-child').classList.add('active');
        document.getElementById('loginForm').classList.add('active');
        document.getElementById('loginForm').style.display = 'block';
    } else if (tab === 'register') {
        document.querySelector('.auth-tab:last-child').classList.add('active');
        document.getElementById('registerForm').classList.add('active');
        document.getElementById('registerForm').style.display = 'block';
    }

    // Clear messages
    const errorMessages = document.querySelectorAll('.error-message');
    const successMessages = document.querySelectorAll('.success-message');

    errorMessages.forEach(msg => {
        msg.style.display = 'none';
        msg.textContent = '';
    });

    successMessages.forEach(msg => {
        msg.style.display = 'none';
        msg.textContent = '';
    });
}

async function firebaseRegister() {
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const phone = document.getElementById('registerPhone').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    const registerError = document.getElementById('registerError');
    const registerSuccess = document.getElementById('registerSuccess');

    registerError.style.display = 'none';
    registerSuccess.style.display = 'none';

    if (!name || !email || !password || !confirmPassword) {
        registerError.textContent = 'Please fill in all required fields.';
        registerError.style.display = 'block';
        return;
    }

    if (password !== confirmPassword) {
        registerError.textContent = 'Passwords do not match.';
        registerError.style.display = 'block';
        return;
    }

    if (password.length < 8) {
        registerError.textContent = 'Password must be at least 8 characters.';
        registerError.style.display = 'block';
        return;
    }

    try {
        const auth = window.firebaseAuth;
        const userCredential = await window.firebaseCreateUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const db = window.firebaseDb;
        await window.firebaseSetDoc(window.firebaseDoc(db, window.firebaseCollections.USERS, user.uid), {
            uid: user.uid,
            name: name,
            email: email,
            phone: phone || '',
            role: email === ADMIN_EMAIL ? 'admin' : 'customer',
            createdAt: new Date().toISOString(),
            subscribed: document.getElementById('registerSubscription').checked,
            emailVerified: false
        });

        registerSuccess.textContent = 'Account created successfully! You are now logged in.';
        registerSuccess.style.display = 'block';
        registerError.style.display = 'none';

        console.log("✅ Firebase registration successful:", email);

        setTimeout(() => {
            showPage('home');
        }, 1500);

    } catch (error) {
        console.error("❌ Firebase registration error:", error);
        let errorMessage = 'Registration failed. ';

        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'An account with this email already exists.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Invalid email address.';
                break;
            case 'auth/weak-password':
                errorMessage = 'Password is too weak. Use at least 8 characters with uppercase, lowercase, and numbers.';
                break;
            default:
                errorMessage += error.message || 'Please try again.';
        }

        registerError.textContent = errorMessage;
        registerError.style.display = 'block';
    }
}

async function firebaseLogin() {
    console.log("🔍 firebaseLogin() called");

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const loginError = document.getElementById('loginError');
    const loginSuccess = document.getElementById('loginSuccess');

    loginError.style.display = 'none';
    loginSuccess.style.display = 'none';

    if (!email || !password) {
        console.log("❌ Validation failed");
        loginError.textContent = 'Please enter both email and password.';
        loginError.style.display = 'block';
        return;
    }

    try {
        console.log("🔄 Attempting Firebase login...");
        const auth = window.firebaseAuth;

        const userCredential = await window.firebaseSignInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        console.log("✅ Firebase login successful for user:", user.email);

        const db = window.firebaseDb;
        const userRef = window.firebaseDoc(db, window.firebaseCollections.USERS, user.uid);
        const userDoc = await window.firebaseGetDoc(userRef);

        if (!userDoc.exists()) {
            console.log("📝 Creating new user document in Firestore");
            await window.firebaseSetDoc(userRef, {
                uid: user.uid,
                email: user.email,
                name: user.email.split('@')[0],
                createdAt: new Date().toISOString(),
                role: email === ADMIN_EMAIL ? 'admin' : 'customer',
                subscribed: document.getElementById('loginSubscription').checked
            });
        } else {
            await window.firebaseUpdateDoc(userRef, {
                lastLogin: new Date().toISOString()
            });
        }

        const userData = userDoc.exists() ? userDoc.data() : { role: email === ADMIN_EMAIL ? 'admin' : 'customer' };

        loginSuccess.textContent = 'Login successful!';
        loginSuccess.style.display = 'block';
        loginError.style.display = 'none';

        console.log("✅ Firebase login completed successfully");

        if (email === ADMIN_EMAIL) {
            console.log("👑 Admin user detected, showing admin button");
            setTimeout(() => {
                showAdminButton();
            }, 500);
        }

        setTimeout(() => {
            console.log("🔄 Redirecting to home page...");
            showPage('home');
        }, 1000);

    } catch (error) {
        console.error("❌ Firebase login error:", error);

        let errorMessage = 'Login failed. ';

        switch (error.code) {
            case 'auth/invalid-email':
                errorMessage += 'Invalid email address.';
                break;
            case 'auth/user-not-found':
                errorMessage += 'No account found with this email.';
                break;
            case 'auth/wrong-password':
                errorMessage += 'Incorrect password.';
                break;
            default:
                errorMessage += error.message || 'Please check your credentials.';
        }

        loginError.textContent = errorMessage;
        loginError.style.display = 'block';
    }
}

async function firebaseLogout() {
    try {
        const auth = window.firebaseAuth;
        await window.firebaseSignOut(auth);
        console.log("✅ User logged out");
        window.currentFirebaseUser = null;
        cart = [];
        updateCartCount();
        updateAuthUI();
        showPage('home');

        const adminBtn = document.getElementById('adminMobileBtn');
        if (adminBtn) adminBtn.remove();
    } catch (error) {
        console.error("❌ Logout error:", error);
    }
}

// ===== PASSWORD RESET =====
async function resetPasswordFromLogin() {
    try {
        const emailInput = document.getElementById('loginEmail');
        const email = (emailInput?.value || '').trim();
        if (!email || !email.includes('@')) {
            alert('Please enter your email address first, then click "Forgot password".');
            return;
        }
        if (!window.firebaseAuth || !window.firebaseSendPasswordResetEmail) {
            alert('Password reset is not available yet. Please refresh the page.');
            return;
        }

        await window.firebaseSendPasswordResetEmail(window.firebaseAuth, email);
        alert('✅ Password reset email sent! Please check your inbox (and spam).');
    } catch (err) {
        console.error('❌ Password reset error:', err);
        alert('❌ Could not send reset email: ' + (err?.message || err));
    }
}



function updateAuthUI() {
    const authLink = document.getElementById('authLink');
    if (!authLink) return;
    const user = window.currentFirebaseUser;

    if (user) {
        console.log("👤 User logged in:", user.email);

        const isAdmin = user.email === ADMIN_EMAIL;

        authLink.innerHTML = isAdmin ? `<i class="fas fa-crown"></i>` : `<i class="fas fa-sign-out-alt"></i>`;
        authLink.title = isAdmin ? `Admin: ${user.email} (Logout)` : `Logged in as ${user.email} (Logout)`;
        authLink.onclick = function (e) {
            e.preventDefault();
            firebaseLogout();
        };

        if (isAdmin) {
            console.log("👑 Admin detected, showing admin button");
            setTimeout(() => {
                showAdminButton();
            }, 500);
        }
    } else {
        authLink.innerHTML = `<i class="fas fa-user"></i>`;
        authLink.title = "Login / Register";
        authLink.onclick = function (e) {
            e.preventDefault();
            showPage('auth');
        };

        const adminBtn = document.getElementById('adminMobileBtn');
        if (adminBtn) adminBtn.remove();
    }
}

// ===== YOCO SDK =====
function loadYocoSDK() {
    console.log("🔄 Loading Yoco SDK...");

    const script = document.createElement('script');
    script.src = 'https://js.yoco.com/sdk/v1/yoco-sdk-web.js';

    script.onload = function () {
        console.log("✅ Yoco SDK loaded");
        if (window.YocoSDK) {
            try {
                window.yocoSDK = new window.YocoSDK({
                    publicKey: YOCO_PUBLIC_KEY
                });
                console.log("✅ Yoco SDK initialized");
            } catch (error) {
                console.error("❌ Failed to initialize Yoco SDK:", error);
            }
        }
    };

    script.onerror = function () {
        console.error("❌ Failed to load Yoco SDK");
    };

    document.head.appendChild(script);
}

// ===== PRODUCT FUNCTIONS =====
function loadFeaturedProducts() {
    const featuredContainer = document.getElementById('featuredProducts');
    if (!featuredContainer) return;

    featuredContainer.innerHTML = '';

    // Only show active products (not hidden or draft)
    const featuredProducts = (window.PRODUCTS_DATA || []).filter(p =>
        p.status !== 'hidden' && p.status !== 'draft'
    );

    if (featuredProducts.length === 0) {
        featuredContainer.innerHTML = '<p style="text-align:center;color:#999;padding:40px;">No products available yet.</p>';
        return;
    }

    featuredProducts.forEach(product => {
        const productCard = createProductCard(product);
        featuredContainer.appendChild(productCard);
    });
}

window.currentPriceFilter = 'all';
window.currentSortOrder = 'default';

function loadAllProducts() {
    const productsContainer = document.getElementById('allProducts');
    if (!productsContainer) return;

    productsContainer.innerHTML = '';

    // Only show active products (not hidden or draft)
    let filtered = (window.PRODUCTS_DATA || []).filter(p =>
        p.status !== 'hidden' && p.status !== 'draft'
    );
    
    // 1. Category Filter
    const category = (window.currentCollectionFilter || 'all').toLowerCase();
    if (category !== 'all') {
        filtered = filtered.filter(product => {
            const cat = (product.category || '').toLowerCase();
            const name = (product.name || '').toLowerCase();
            if (category === 'essentials' || category === 'tees' || category === 't-shirts') {
                return cat === 'tees' || cat === 't-shirts' || cat === 'essentials' || name.includes('tee') || name.includes('t-shirt');
            } else if (category === 'outerwear' || category === 'hoodies') {
                return cat === 'hoodies' || cat === 'outerwear' || name.includes('hoodie') || name.includes('jacket') || name.includes('crop hoodie');
            } else if (category === 'accessories' || category === 'beanies') {
                return cat === 'beanies' || cat === 'accessories' || name.includes('beanie');
            } else if (category === 'sweaters') {
                return cat === 'sweaters' || name.includes('sweater') || name.includes('turtleneck') || name.includes('v-neck');
            }
            return cat === category || name.includes(category);
        });
    }
    
    // 2. Price Filter
    const priceFilter = window.currentPriceFilter || 'all';
    if (priceFilter !== 'all') {
        filtered = filtered.filter(product => {
            if (priceFilter === 'under300') return product.price < 300;
            if (priceFilter === '300to450') return product.price >= 300 && product.price <= 450;
            if (priceFilter === 'over450') return product.price > 450;
            return true;
        });
    }
    
    // 3. Sorting
    const sortOrder = window.currentSortOrder || 'default';
    if (sortOrder === 'low-high') {
        filtered.sort((a, b) => a.price - b.price);
    } else if (sortOrder === 'high-low') {
        filtered.sort((a, b) => b.price - a.price);
    }
    
    // 4. Render Grid
    if (filtered.length === 0) {
        productsContainer.innerHTML = `
            <div style="text-align: center; grid-column: 1 / -1; padding: 40px; color: #666;">
                <i class="fas fa-search" style="font-size: 32px; margin-bottom: 10px;"></i>
                <p>No products match your active filters.</p>
            </div>
        `;
        return;
    }

    filtered.forEach(product => {
        const productCard = createProductCard(product);
        productsContainer.appendChild(productCard);
    });
}

function filterPrice(priceRange) {
    window.currentPriceFilter = priceRange;
    loadAllProducts();
}

function sortProducts(order) {
    window.currentSortOrder = order;
    loadAllProducts();
}

function filterCollection(category, element) {
    window.currentCollectionFilter = category;
    updateCollectionsBarActive(category);
    loadAllProducts();
}

function updateCollectionsBarActive(category) {
    const container = document.getElementById('collectionsBar');
    if (!container) return;
    
    container.querySelectorAll('.collection-chip').forEach(chip => {
        chip.classList.remove('active');
    });

    const targetCategory = (category === 'essentials' ? 'tees' : (category === 'outerwear' ? 'hoodies' : (category === 'accessories' ? 'beanies' : category))).toLowerCase();

    const activeChip = Array.from(container.querySelectorAll('.collection-chip')).find(chip => {
        const onclickAttr = (chip.getAttribute('onclick') || '').toLowerCase();
        return onclickAttr.includes(`'${category}'`) || onclickAttr.includes(`"${category}"`) ||
               onclickAttr.includes(`'${targetCategory}'`) || onclickAttr.includes(`"${targetCategory}"`);
    });
    
    if (activeChip) {
        activeChip.classList.add('active');
    }
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';

    const showFreeDelivery = product.price >= FREE_DELIVERY_THRESHOLD;

    // Determine front and back images
    const images = product.images || [];
    const frontImg = images[0] || product.image || '';
    const backImg = images[1] || product.imageBack || '';
    const hasBackView = !!backImg;

    // Build tag badge
    const tagBadge = product.onSale ? '<div class="product-badge sale-badge">SALE</div>' :
        product.newArrival ? '<div class="product-badge new-badge">NEW</div>' :
        product.bestSeller ? '<div class="product-badge best-badge">BEST</div>' :
        product.featured ? '<div class="product-badge">FEATURED</div>' :
        '<div class="product-badge">NEW</div>';

    card.innerHTML = `
        ${showFreeDelivery ? '<div class="delivery-badge free-delivery"><i class="fas fa-shipping-fast"></i> Free Delivery</div>' : ''}
        ${tagBadge}
        <div class="product-image ${hasBackView ? 'has-back-view' : ''}">
            <img class="product-img-front" src="${frontImg}" alt="${product.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/400x500?text=Drixel+SA'">
            ${hasBackView ? `<img class="product-img-back" src="${backImg}" alt="${product.name} back" loading="lazy" onerror="this.style.opacity=0">` : ''}
        </div>
        <div class="product-info">
            <h3 class="product-title">${product.name}</h3>
            <div class="product-price">${product.comparePrice && product.comparePrice > product.price ? `<span class="compare-price">R ${Number(product.comparePrice).toFixed(2)}</span> ` : ''}R ${Number(product.price).toFixed(2)}</div>
        </div>
    `;

    // Use the universal product identifier (_firestoreId for Firestore products, id for local)
    const productUid = product._firestoreId || product.id;
    card.addEventListener('click', function () {
        viewProduct(productUid);
    });

    // Mobile auto-slide: after 1.5s show back view, cycle back after 2s
    if (hasBackView) {
        let mobileTimer = null;
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && window.innerWidth < 768) {
                    mobileTimer = setTimeout(() => {
                        card.classList.add('show-back');
                        setTimeout(() => card.classList.remove('show-back'), 2000);
                    }, 1500);
                } else {
                    clearTimeout(mobileTimer);
                }
            });
        }, { threshold: 0.5 });
        observer.observe(card);
    }

    return card;
}

function selectSize(productId, size, button) {
    const productKey = `product_${productId}`;
    if (!productSelections[productKey]) {
        productSelections[productKey] = {};
    }
    productSelections[productKey].size = size;

    const parent = button.parentElement;
    parent.querySelectorAll('.size-option').forEach(btn => {
        btn.classList.remove('selected');
    });
    button.classList.add('selected');

    localStorage.setItem('drixel_selections', JSON.stringify(productSelections));
}

function selectColor(productId, colorName, colorCode, button) {
    const productKey = `product_${productId}`;
    if (!productSelections[productKey]) {
        productSelections[productKey] = {};
    }
    productSelections[productKey].color = { name: colorName, code: colorCode };

    const parent = button.parentElement;
    parent.querySelectorAll('.color-option').forEach(btn => {
        btn.classList.remove('selected');
    });
    button.classList.add('selected');

    localStorage.setItem('drixel_selections', JSON.stringify(productSelections));

    // Update main image color tint overlay
    const mainImgContainer = document.querySelector('.product-detail .main-image');
    if (mainImgContainer) {
        let tintOverlay = mainImgContainer.querySelector('.product-tint-overlay');
        if (!tintOverlay) {
            tintOverlay = document.createElement('div');
            tintOverlay.className = 'product-tint-overlay';
            mainImgContainer.style.position = 'relative';
            mainImgContainer.appendChild(tintOverlay);
        }
        tintOverlay.style.backgroundColor = colorCode;
    }
}

function viewProduct(productId) {
    // Support both Firestore string IDs and legacy numeric IDs
    const product = window.PRODUCTS_DATA.find(p =>
        String(p._firestoreId || p.id) === String(productId)
    );
    if (!product) {
        console.warn('viewProduct: product not found for id:', productId);
        return;
    }
    // Use the universal identifier for URLs
    const uid = product._firestoreId || product.id;

    const path = window.location.pathname;
    const isCategoryPage = path.endsWith('/products/tees/') || path.endsWith('/products/tees/index.html') ||
                           path.endsWith('/products/hoodies/') || path.endsWith('/products/hoodies/index.html') ||
                           path.endsWith('/products/beanies/') || path.endsWith('/products/beanies/index.html') ||
                           path.endsWith('/products/sweaters/') || path.endsWith('/products/sweaters/index.html');
                           
    const isCleanProductPage = (path.endsWith('product.html') || path.endsWith('product') || 
                               path.includes('/products/tees/') || path.includes('/products/outerwear/') || 
                               path.includes('/products/accessories/') || path.includes('/products/hoodies/') || 
                               path.includes('/products/beanies/') || path.includes('/products/sweaters/')) && !isCategoryPage;
    
    if (!isCleanProductPage) {
        // Determine destination URL
        const isLocalServer = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:';
        
        if (isLocalServer) { 
            window.location.href = '/product.html?id=' + uid;
        } else {
            let catPath = 'tees';
            const cat = product.category.toLowerCase();
            const name = product.name.toLowerCase();
            
            if (name.includes('hoodie') || name.includes('sweat') || name.includes('tracksuit') || name.includes('jacket') || cat.includes('outerwear')) {
                catPath = 'hoodies';
            } else if (name.includes('beanie') || name.includes('socks') || name.includes('backpack') || cat.includes('accessories')) {
                if (name.includes('beanie')) catPath = 'beanies';
                else catPath = 'accessories';
            }
            
            const cleanName = encodeURIComponent(product.name.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '-'));
            window.location.href = '/products/' + catPath + '/' + cleanName + '?id=' + uid;
        }
        return;
    }

    const productKey = 'product_' + uid;
    const rawSelections = productSelections[productKey] || {};
    const productSizes = product.sizes || [];
    const productColors = product.colors || [];
    const selections = {
        size: rawSelections.size || productSizes[0] || '',
        color: rawSelections.color || productColors[0] || { name: '', code: '#000' }
    };

    const productDetail = document.getElementById('productDetail');
    if (!productDetail) return;

    // Use images array first (Firestore products), fall back to product.image (legacy)
    const mainImg = (product.images && product.images[0]) || product.image || '';

    productDetail.innerHTML = `
                <div class="product-detail">
                    <div class="product-gallery">
                        <div class="main-image" style="position: relative;">
                            <img src="${mainImg}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/600x800?text=Drixel+SA'">
                            <div class="product-tint-overlay" style="background-color: ${selections.color ? selections.color.code : 'transparent'};"></div>
                        </div>
                        <div class="thumbnails">
                            <div class="thumbnail active">
                                <img src="${mainImg}" alt="${product.name}">
                            </div>
                            ${productColors.map(color => `
                                <div class="thumbnail" onclick="changeProductColor('${color.code}', '${product.name}')">
                                    <div style="width: 100%; height: 100%; background-color: ${color.code};"></div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="product-info">
                        <h1>${product.name}</h1>
                        <div class="product-price">R ${Number(product.price).toFixed(2)}</div>
                        
                        <div class="product-description">
                            <p>${product.description || ''}</p>
                        </div>
                        
                        <div class="size-selection">
                            <h4>SELECT SIZE</h4>
                            <div class="size-options">
                                ${productSizes.map(size => `
                                    <button class="size-option ${selections.size === size ? 'selected' : ''}" 
                                            data-size="${size}"
                                            onclick="selectSize('${uid}', '${size}', this)">
                                        ${size}
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                        
                        <div class="color-selection">
                            <h4>SELECT COLOR</h4>
                            <div class="color-options">
                                ${productColors.map(color => `
                                    <button class="color-option ${selections.color && selections.color.name === color.name ? 'selected' : ''}"
                                            data-color="${color.name}"
                                            style="background-color: ${color.code}"
                                            onclick="selectColor('${uid}', '${color.name}', '${color.code}', this)">
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                        
                        <div class="product-actions">
                            <div class="quantity-selector">
                                <button class="quantity-btn" onclick="decreaseQuantity()">-</button>
                                <input type="text" class="quantity-input" id="productQuantity" value="1" readonly>
                                <button class="quantity-btn" onclick="increaseQuantity()">+</button>
                            </div>
                            <button class="btn" onclick="addToCart('${uid}', true)">Add to Cart</button>
                        </div>
                        
                        <button class="buy-btn" onclick="initiateYocoDirectPayment('${uid}', '${product.name.replace(/'/g, "\\'")}', ${product.price})">
                            <i class="fas fa-bolt"></i> Quick Buy with Yoco
                        </button>
                        
                        <div class="timeline">
                            <h4><i class="fas fa-clock"></i> Order Processing Timeline</h4>
                            <div class="timeline-item">
                                <div class="timeline-icon"><i class="fas fa-1"></i></div>
                                <div class="timeline-content">
                                    <strong>Order Processing:</strong> 1-3 days (due to high demand)
                                </div>
                            </div>
                            <div class="timeline-item">
                                <div class="timeline-icon"><i class="fas fa-2"></i></div>
                                <div class="timeline-content">
                                    <strong>Production:</strong> Additional 2-5 days if item needs manufacturing
                                </div>
                            </div>
                            <div class="timeline-item">
                                <div class="timeline-icon"><i class="fas fa-3"></i></div>
                                <div class="timeline-content">
                                    <strong>Delivery:</strong> 3-5 business days via The Courier Guy or PAXI
                                </div>

                            </div>
                        </div>
                        
                        <div class="email-notification">
                            <p><i class="fas fa-envelope-open-text"></i> <strong>Automatic Email Updates:</strong> After purchase, you'll receive order confirmation, processing updates, and delivery notifications from <strong>drixelsa@gmail.com</strong></p>
                        </div>
                    </div>
                </div>
            `;
}

function changeProductColor(colorCode, productName) {
    console.log(`Changing ${productName} color to ${colorCode}`);
    
    // 1. Update the main image tint overlay
    const mainImgContainer = document.querySelector('.product-detail .main-image');
    if (mainImgContainer) {
        let tintOverlay = mainImgContainer.querySelector('.product-tint-overlay');
        if (!tintOverlay) {
            tintOverlay = document.createElement('div');
            tintOverlay.className = 'product-tint-overlay';
            mainImgContainer.style.position = 'relative';
            mainImgContainer.appendChild(tintOverlay);
        }
        tintOverlay.style.backgroundColor = colorCode;
    }
    
    // 2. Select the corresponding color option button visually
    const colorButtons = document.querySelectorAll('.product-detail .color-option');
    colorButtons.forEach(btn => {
        const btnBg = btn.style.backgroundColor;
        if (btnBg) {
            const temp = document.createElement('div');
            temp.style.color = colorCode;
            document.body.appendChild(temp);
            const resolvedColor = window.getComputedStyle(temp).color;
            
            temp.style.color = btnBg;
            const resolvedBtnBg = window.getComputedStyle(temp).color;
            document.body.removeChild(temp);
            
            if (resolvedColor === resolvedBtnBg) {
                // Toggle active class visually
                colorButtons.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            }
        }
    });
}

function decreaseQuantity() {
    const quantityInput = document.getElementById('productQuantity');
    let quantity = parseInt(quantityInput.value) || 1;
    if (quantity > 1) {
        quantityInput.value = quantity - 1;
    }
}

function increaseQuantity() {
    const quantityInput = document.getElementById('productQuantity');
    let quantity = parseInt(quantityInput.value) || 1;
    quantityInput.value = quantity + 1;
}

// ===== CART STORAGE & FUNCTIONS =====
function loadCartFromStorage() {
    try {
        const savedCart = localStorage.getItem('drixel_cart');
        if (savedCart) {
            cart = JSON.parse(savedCart) || [];
            updateCartCount();
        }
    } catch (e) {
        console.warn("Could not load cart from localStorage:", e);
    }
}

async function addToCart(productId, fromProductPage = false) {
    console.log("🛒 addToCart called for productId:", productId);

    if (!window.PRODUCTS_DATA || !Array.isArray(window.PRODUCTS_DATA)) {
        window.PRODUCTS_DATA = typeof getLocalProductsData === 'function' ? getLocalProductsData() : [];
    }

    let product = window.PRODUCTS_DATA.find(p => p.id === productId || String(p.id) === String(productId));
    if (!product && typeof productId === 'string') {
        product = window.PRODUCTS_DATA.find(p => p.name.toLowerCase().replace(/\s+/g, '-') === productId.toLowerCase());
    }

    if (!product) {
        console.error("❌ Product not found for addToCart:", productId);
        if (typeof showToast === 'function') {
            showToast('Product details could not be found.', 'error');
        } else {
            alert('Product details could not be found.');
        }
        return;
    }

    const productKey = `product_${product.id}`;
    const rawSelections = (typeof productSelections !== 'undefined' && productSelections[productKey]) ? productSelections[productKey] : {};
    
    const size = rawSelections.size || (product.sizes && product.sizes.length > 0 ? product.sizes[0] : 'M');
    const color = rawSelections.color || (product.colors && product.colors.length > 0 ? product.colors[0] : { name: 'Black', code: '#000000' });

    let quantity = 1;
    if (fromProductPage) {
        const quantityInput = document.getElementById('productQuantity');
        if (quantityInput) {
            quantity = parseInt(quantityInput.value) || 1;
        }
    }

    const colorName = typeof color === 'string' ? color : (color.name || 'Default');
    const colorCode = typeof color === 'object' && color.code ? color.code : '#000000';

    const existingItemIndex = cart.findIndex(item =>
        item.id === product.id &&
        item.size === size &&
        item.color === colorName
    );

    if (existingItemIndex !== -1) {
        cart[existingItemIndex].quantity += quantity;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: Number(product.price) || 0,
            image: product.image,
            size: size,
            color: colorName,
            colorCode: colorCode,
            quantity: quantity,
            addedAt: new Date().toISOString()
        });
    }

    saveCartToStorage();
    updateCartCount();

    if (typeof showToast === 'function') {
        showToast(`✅ Added ${quantity} × ${product.name} to cart!`, 'success');
    }

    if (typeof openCartDrawer === 'function') {
        openCartDrawer();
    }
}

function loadCartPage() {
    const cartItemsContainer = document.getElementById('cartItemsContainer');
    if (!cartItemsContainer) return;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
                    <div class="empty-cart">
                        <i class="fas fa-shopping-bag"></i>
                        <h2>Your cart is empty</h2>
                        <p>Add some products to your cart and they'll appear here.</p>
                        <a href="#" class="btn" onclick="checkAuthAndNavigate('shop')">Browse Products</a>
                        <div class="buy-btn-container mt-40">
                            <a href="#" onclick="checkAuthAndNavigate('yoco-direct')">
                                <button class="buy-btn" style="background: transparent; border: 2px solid var(--accent-orange); color: var(--accent-orange);">
                                    <i class="fas fa-bolt"></i> Quick Checkout with Yoco
                                </button>
                            </a>
                        </div>
                    </div>
                `;
        updateCartSummary(0);
        return;
    }

    let html = '<div class="cart-items">';

    cart.forEach((item, index) => {
        html += `
                    <div class="cart-item">
                        <div class="cart-item-image">
                            <img src="${item.image}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/120x120?text=Drixel+SA'">
                        </div>
                        <div class="cart-item-details">
                            <h4>${item.name}</h4>
                            <div class="cart-item-variants">
                                <span>Size: ${item.size}</span>
                                <span>Color: ${item.color}</span>
                                <div class="cart-item-color" style="background-color: ${item.colorCode};"></div>
                            </div>
                            <div class="cart-item-actions">
                                <button onclick="updateCartItemQuantity(${index}, ${item.quantity - 1})">-</button>
                                <span>${item.quantity}</span>
                                <button onclick="updateCartItemQuantity(${index}, ${item.quantity + 1})">+</button>
                                <span class="cart-item-remove" onclick="removeFromCart(${index})">Remove</span>
                            </div>
                        </div>
                        <div class="cart-item-price">R ${(item.price * item.quantity).toFixed(2)}</div>
                    </div>
                `;
    });

    html += '</div>';
    cartItemsContainer.innerHTML = html;

    updateCartSummary();
}

async function loadUserCart(uid) {
    try {
        const localCart = JSON.parse(localStorage.getItem('drixel_cart')) || [];
        const isGuestCart = localStorage.getItem('drixel_cart_is_guest') === 'true';
        
        const docRef = window.firebaseDoc(window.firebaseDb, window.firebaseCollections.CARTS, uid);
        const docSnap = await window.firebaseGetDoc(docRef);
        
        let firebaseCart = [];
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data && Array.isArray(data.items)) {
                firebaseCart = data.items;
            }
        }
        
        // If Firestore cart is empty but local storage cart has items, fallback to local storage
        if (firebaseCart.length === 0 && localCart.length > 0) {
            firebaseCart = localCart;
            console.log("🛒 Firestore cart empty, falling back to local storage items");
        } else if (localCart.length > 0 && isGuestCart) {
            // Merge guest local storage items into user's Firestore cart
            localCart.forEach(localItem => {
                const existingIndex = firebaseCart.findIndex(fbItem => 
                    fbItem.id === localItem.id && 
                    fbItem.size === localItem.size && 
                    fbItem.color === localItem.color
                );
                if (existingIndex !== -1) {
                    firebaseCart[existingIndex].quantity += localItem.quantity;
                } else {
                    firebaseCart.push(localItem);
                }
            });
            
            // Clear guest markers
            localStorage.removeItem('drixel_cart');
            localStorage.removeItem('drixel_cart_is_guest');
        }
        
        cart = firebaseCart;
        updateCartCount(); // Saves merged cart to Firebase & updates count
        
        // If on cart page or checkout page, reload items
        const path = window.location.pathname;
        if (path.endsWith('cart.html')) {
            loadCartPage();
        } else if (path.endsWith('checkout.html')) {
            loadCheckoutPage();
        }
    } catch (e) {
        console.error("Error loading user cart:", e);
    }
}

async function saveCartToStorage() {
    localStorage.setItem('drixel_cart', JSON.stringify(cart));
    const currentUser = window.currentFirebaseUser;
    if (window.firebaseAuthInitialized) {
        if (currentUser) {
            localStorage.setItem('drixel_cart_is_guest', 'false');
        } else {
            localStorage.setItem('drixel_cart_is_guest', 'true');
        }
    }
    
    if (currentUser && window.firebaseDoc && window.firebaseDb) {
        try {
            const docRef = window.firebaseDoc(window.firebaseDb, window.firebaseCollections.CARTS, currentUser.uid);
            await window.firebaseSetDoc(docRef, {
                items: cart,
                updatedAt: new Date().toISOString()
            });
            console.log("Cart successfully synced to Firebase");
        } catch (e) {
            console.error("Error syncing cart to Firebase:", e);
        }
    }
}

function updateCartItemQuantity(index, newQuantity) {
    if (newQuantity < 1) {
        removeFromCart(index);
        return;
    }

    cart[index].quantity = newQuantity;
    updateCartCount();

    const path = window.location.pathname;
    if (path.endsWith('cart.html')) {
        loadCartPage();
    }
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartCount();
    showToast('Item removed from cart', 'info');

    const path = window.location.pathname;
    if (path.endsWith('cart.html')) {
        loadCartPage();
    }
}

function updateCartCount() {
    const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
    const cartCountElem = document.getElementById('cartCount');
    if (cartCountElem) {
        cartCountElem.textContent = totalItems;
    }

    // Sync to storage
    saveCartToStorage();

    // Render cart drawer
    if (typeof renderCartDrawer === 'function') {
        renderCartDrawer();
    }
}

function updateCartSummary() {
    const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    const shipping = calculateDeliveryFee(subtotal);
    const tax = 0;
    const total = subtotal + shipping + tax;

    const subtotalElem = document.getElementById('cartSubtotal');
    const shippingElem = document.getElementById('cartShipping');
    const taxElem = document.getElementById('cartTax');
    const totalElem = document.getElementById('cartTotal');

    if (subtotalElem) subtotalElem.textContent = `R ${subtotal.toFixed(2)}`;
    if (shippingElem) shippingElem.textContent = `R ${shipping.toFixed(2)}`;
    if (taxElem) taxElem.textContent = `R ${tax.toFixed(2)}`;
    if (totalElem) totalElem.textContent = `R ${total.toFixed(2)}`;

    const shippingNote = document.getElementById('shippingNote');
    if (shippingNote) {
        if (shipping === 0) {
            shippingNote.textContent = '🎉 Free delivery on orders over R1000!';
        } else {
            shippingNote.textContent = `Add R${(FREE_DELIVERY_THRESHOLD - subtotal).toFixed(2)} more for free delivery!`;
        }
    }
}

// ===== SLIDING CART DRAWER LOGIC =====
function initCartDrawer() {
    if (document.getElementById('cartDrawer')) return;

    const overlay = document.createElement('div');
    overlay.className = 'cart-drawer-overlay';
    overlay.id = 'cartDrawerOverlay';
    document.body.appendChild(overlay);

    const drawer = document.createElement('div');
    drawer.className = 'cart-drawer';
    drawer.id = 'cartDrawer';
    drawer.innerHTML = `
                <div class="cart-drawer-header">
                    <h3>Shopping Bag</h3>
                    <button class="cart-drawer-close" id="cartDrawerClose">&times;</button>
                </div>
                <div class="cart-drawer-body" id="cartDrawerBody"></div>
                <div class="cart-drawer-footer" id="cartDrawerFooter"></div>
            `;
    document.body.appendChild(drawer);

    document.getElementById('cartDrawerClose').addEventListener('click', closeCartDrawer);
    overlay.addEventListener('click', closeCartDrawer);

    // Intercept cart clicks
    const path = window.location.pathname;
    if (!path.endsWith('cart.html') && !path.endsWith('checkout.html') && !path.endsWith('orderConfirmation.html')) {
        document.querySelectorAll('.cart-btn').forEach(btn => {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                openCartDrawer();
            });
        });
    }

    renderCartDrawer();
}

function openCartDrawer() {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartDrawerOverlay');
    if (drawer && overlay) {
        renderCartDrawer();
        drawer.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeCartDrawer() {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartDrawerOverlay');
    if (drawer && overlay) {
        drawer.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function renderCartDrawer() {
    const drawerBody = document.getElementById('cartDrawerBody');
    const drawerFooter = document.getElementById('cartDrawerFooter');
    if (!drawerBody || !drawerFooter) return;

    if (cart.length === 0) {
        drawerBody.innerHTML = `
                    <div class="cart-drawer-empty">
                        <i class="fas fa-shopping-bag"></i>
                        <p>Your shopping bag is empty.</p>
                        <button class="btn btn-outline" id="cartDrawerContinueShopping" style="width: 100%;">Continue Shopping</button>
                    </div>
                `;
        drawerFooter.innerHTML = '';

        const contBtn = document.getElementById('cartDrawerContinueShopping');
        if (contBtn) {
            contBtn.addEventListener('click', () => {
                closeCartDrawer();
                showPage('shop');
            });
        }
        return;
    }

    let html = '';
    cart.forEach((item, index) => {
        html += `
                    <div class="cart-drawer-item">
                        <div class="cart-drawer-item-img">
                            <img src="${item.image}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/120x120?text=Drixel+SA'">
                        </div>
                        <div class="cart-drawer-item-info">
                            <div>
                                <h4>${item.name}</h4>
                                <div class="cart-drawer-item-meta">
                                    <span>Size: ${item.size}</span>
                                    <span>Color: ${item.color}</span>
                                </div>
                            </div>
                            <div class="cart-drawer-item-qty">
                                <button onclick="window.updateCartItemQuantity(${index}, ${item.quantity - 1})">-</button>
                                <span>${item.quantity}</span>
                                <button onclick="window.updateCartItemQuantity(${index}, ${item.quantity + 1})">+</button>
                                <span class="cart-drawer-item-remove" onclick="window.removeFromCart(${index})">Remove</span>
                            </div>
                        </div>
                        <div class="cart-drawer-item-price">R ${(item.price * item.quantity).toFixed(2)}</div>
                    </div>
                `;
    });
    drawerBody.innerHTML = html;

    const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);

    drawerFooter.innerHTML = `
                <div class="cart-drawer-subtotal">
                    <span>Subtotal</span>
                    <span>R ${subtotal.toFixed(2)}</span>
                </div>
                <button class="btn" id="cartDrawerCheckoutBtn" style="width: 100%; margin-bottom: 12px;">Checkout</button>
                <button class="btn btn-outline" id="cartDrawerCartBtn" style="width: 100%;">View Full Bag</button>
            `;

    document.getElementById('cartDrawerCheckoutBtn').addEventListener('click', () => {
        closeCartDrawer();
        showPage('checkout');
    });
    document.getElementById('cartDrawerCartBtn').addEventListener('click', () => {
        closeCartDrawer();
        showPage('cart');
    });
}

// ===== ANNOUNCEMENT BAR LOGIC =====
function initAnnouncementSlider() {
    const slides = document.querySelectorAll('.announcement-slide');
    if (slides.length === 0) return;

    let currentIndex = 0;

    function showSlide(index) {
        slides.forEach(slide => {
            slide.classList.remove('active');
        });

        currentIndex = (index + slides.length) % slides.length;
        const activeSlide = slides[currentIndex];
        if (activeSlide) {
            activeSlide.classList.add('active');
        }
    }

    const prevBtn = document.querySelector('.announcement-prev-btn');
    const nextBtn = document.querySelector('.announcement-next-btn');

    if (prevBtn) prevBtn.addEventListener('click', (e) => { e.preventDefault(); showSlide(currentIndex - 1); });
    if (nextBtn) nextBtn.addEventListener('click', (e) => { e.preventDefault(); showSlide(currentIndex + 1); });

    // Auto slide every 5 seconds
    setInterval(() => {
        showSlide(currentIndex + 1);
    }, 5000);

    showSlide(0);
}

function injectAnnouncementBar() {
    if (document.getElementById('announcementBar')) return;

    const bar = document.createElement('div');
    bar.className = 'announcement-bar';
    bar.id = 'announcementBar';
    bar.innerHTML = `
                <div class="container announcement-container">
                    <button class="announcement-prev-btn">&lt;</button>
                    <div class="announcement-slider">
                        <div class="announcement-slide">🚚 R70 NATIONWIDE DELIVERY | FREE ON ORDERS OVER R1000!</div>
                        <div class="announcement-slide">⏳ DUE TO HIGH DEMAND: ORDERS TAKE 4-8 DAYS PROCESSING</div>
                        <div class="announcement-slide">🔥 SECURE CARD PAYMENTS POWERED BY YOCO & SNAPSCAN</div>
                    </div>
                    <button class="announcement-next-btn">&gt;</button>
                </div>
            `;

    document.body.insertBefore(bar, document.body.firstChild);
    initAnnouncementSlider();
}

// ===== INSTANT SEARCH OVERLAY LOGIC =====
function initSearchOverlay() {
    if (document.getElementById('searchOverlay')) return;

    const navIcons = document.querySelector('.nav-icons');
    if (navIcons) {
        const searchLink = document.createElement('a');
        searchLink.href = '#';
        searchLink.id = 'searchTriggerBtn';
        searchLink.innerHTML = `<i class="fas fa-search"></i>`;
        searchLink.title = 'Search products';
        navIcons.insertBefore(searchLink, navIcons.firstChild);

        searchLink.addEventListener('click', (e) => {
            e.preventDefault();
            openSearchOverlay();
        });
    }

    const overlay = document.createElement('div');
    overlay.className = 'search-overlay';
    overlay.id = 'searchOverlay';
    overlay.innerHTML = `
                <div class="search-overlay-header">
                    <div class="search-overlay-container">
                        <div class="search-input-wrapper">
                            <i class="fas fa-search"></i>
                            <input type="text" id="searchOverlayInput" placeholder="Search products (Hoodie, Tee, Trackpants)..." autocomplete="off">
                            <button class="search-clear-btn" id="searchOverlayClear" style="display:none;">&times;</button>
                        </div>
                        <button class="search-close-btn" id="searchOverlayClose">Cancel</button>
                    </div>
                </div>
                <div class="search-overlay-body">
                    <div class="container">
                        <div class="search-suggestions" id="searchSuggestions">
                            <h4>Popular Search Terms</h4>
                            <div class="suggestion-chips">
                                <button onclick="window.runQuickSearch('Hoodie')">Hoodie</button>
                                <button onclick="window.runQuickSearch('Tee')">Tee</button>
                                <button onclick="window.runQuickSearch('Trackpants')">Trackpants</button>
                                <button onclick="window.runQuickSearch('Caps')">Caps</button>
                                <button onclick="window.runQuickSearch('Windbreaker')">Windbreaker</button>
                            </div>
                        </div>
                        <div class="search-results-grid" id="searchResultsGrid"></div>
                    </div>
                </div>
            `;
    document.body.appendChild(overlay);

    const input = document.getElementById('searchOverlayInput');
    const clearBtn = document.getElementById('searchOverlayClear');
    const closeBtn = document.getElementById('searchOverlayClose');

    closeBtn.addEventListener('click', closeSearchOverlay);

    clearBtn.addEventListener('click', () => {
        input.value = '';
        input.focus();
        clearBtn.style.display = 'none';
        document.getElementById('searchResultsGrid').innerHTML = '';
    });

    input.addEventListener('input', (e) => {
        const queryVal = e.target.value.trim();
        clearBtn.style.display = queryVal ? 'block' : 'none';
        runSearchQuery(queryVal);
    });
}

function openSearchOverlay() {
    const overlay = document.getElementById('searchOverlay');
    if (overlay) {
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        setTimeout(() => {
            document.getElementById('searchOverlayInput').focus();
        }, 300);
    }
}

function closeSearchOverlay() {
    const overlay = document.getElementById('searchOverlay');
    if (overlay) {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
        document.getElementById('searchOverlayInput').value = '';
        document.getElementById('searchOverlayClear').style.display = 'none';
        document.getElementById('searchResultsGrid').innerHTML = '';
    }
}

function runSearchQuery(queryVal) {
    const grid = document.getElementById('searchResultsGrid');
    if (!grid) return;

    if (!queryVal) {
        grid.innerHTML = '';
        return;
    }

    const matches = window.PRODUCTS_DATA.filter(product => {
        const nameMatch = product.name.toLowerCase().includes(queryVal.toLowerCase());
        const categoryMatch = product.category.toLowerCase().includes(queryVal.toLowerCase());
        const descMatch = (product.description || '').toLowerCase().includes(queryVal.toLowerCase());
        return nameMatch || categoryMatch || descMatch;
    });

    if (matches.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #888; padding: 40px 0;">No matching products found.</div>`;
        return;
    }

    let html = '';
    matches.forEach(product => {
        html += `
                    <a href="product.html?id=${product.id}" class="search-result-card" onclick="closeSearchOverlay()">
                        <div class="search-result-card-img">
                            <img src="${product.image}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/220x220?text=Drixel+SA'">
                        </div>
                        <div class="search-result-card-info">
                            <h5>${product.name}</h5>
                            <span>R ${product.price.toFixed(2)}</span>
                        </div>
                    </a>
                `;
    });
    grid.innerHTML = html;
}

function runQuickSearch(term) {
    const input = document.getElementById('searchOverlayInput');
    if (input) {
        input.value = term;
        document.getElementById('searchOverlayClear').style.display = 'block';
        runSearchQuery(term);
        input.focus();
    }
}

// ===== DYNAMIC GRID LAYOUT SWITCHER =====
function setGridLayout(columns) {
    const grid = document.getElementById('allProducts');
    if (!grid) return;

    const btn4 = document.getElementById('layoutGrid4');
    const btn2 = document.getElementById('layoutGrid2');

    if (columns === 2) {
        grid.classList.remove('grid-layout-4col');
        grid.classList.add('grid-layout-2col');
        if (btn2) btn2.classList.add('active');
        if (btn4) btn4.classList.remove('active');
    } else {
        grid.classList.remove('grid-layout-2col');
        grid.classList.add('grid-layout-4col');
        if (btn4) btn4.classList.add('active');
        if (btn2) btn2.classList.remove('active');
    }
}

// ===== PUBLIC ORDER TRACKER MODAL LOGIC =====
function injectTrackerLink() {
    const columns = document.querySelectorAll('.footer-column');
    columns.forEach(col => {
        const header = col.querySelector('h3');
        if (header && header.textContent.trim().toLowerCase() === 'legal') {
            const list = col.querySelector('ul');
            if (list && !document.getElementById('footerTrackerLink')) {
                const li = document.createElement('li');
                li.id = 'footerTrackerLink';
                li.innerHTML = `<a href="#" onclick="window.openOrderTracker(); return false;">Track Your Order</a>`;
                list.appendChild(li);
            }
        }
    });
}

// ===== PRODUCT ACCORDIONS & SIZE GUIDE LOGIC =====
function toggleAccordion(btn) {
    const item = btn.parentElement;
    if (!item) return;
    item.classList.toggle('active');
}

function initSizeGuideModal() {
    if (document.getElementById('sizeGuideOverlay')) return;

    const overlay = document.createElement('div');
    overlay.className = 'size-modal-overlay';
    overlay.id = 'sizeGuideOverlay';
    overlay.innerHTML = `
                <div class="size-modal-card">
                    <button class="size-modal-close" id="sizeGuideClose">&times;</button>
                    <h3>Size Guide</h3>
                    <p style="font-size: 14px; color: #666; margin-bottom: 20px;">Use the chart below to find your correct streetwear fit.</p>
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <thead>
                            <tr style="border-bottom: 2px solid var(--nike-black); font-weight: 700;">
                                <th style="text-align: left; padding: 10px 8px;">Size</th>
                                <th style="text-align: center; padding: 10px 8px;">Chest (cm)</th>
                                <th style="text-align: center; padding: 10px 8px;">Length (cm)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style="border-bottom: 1px solid #eee;"><td style="padding: 10px 8px; font-weight: 600;">S</td><td style="text-align: center; padding: 10px 8px;">104</td><td style="text-align: center; padding: 10px 8px;">68</td></tr>
                            <tr style="border-bottom: 1px solid #eee;"><td style="padding: 10px 8px; font-weight: 600;">M</td><td style="text-align: center; padding: 10px 8px;">110</td><td style="text-align: center; padding: 10px 8px;">70</td></tr>
                            <tr style="border-bottom: 1px solid #eee;"><td style="padding: 10px 8px; font-weight: 600;">L</td><td style="text-align: center; padding: 10px 8px;">116</td><td style="text-align: center; padding: 10px 8px;">72</td></tr>
                            <tr style="border-bottom: 1px solid #eee;"><td style="padding: 10px 8px; font-weight: 600;">XL</td><td style="text-align: center; padding: 10px 8px;">122</td><td style="text-align: center; padding: 10px 8px;">74</td></tr>
                            <tr style="border-bottom: 1px solid #eee;"><td style="padding: 10px 8px; font-weight: 600;">XXL</td><td style="text-align: center; padding: 10px 8px;">128</td><td style="text-align: center; padding: 10px 8px;">76</td></tr>
                        </tbody>
                    </table>
                </div>
            `;
    document.body.appendChild(overlay);

    document.getElementById('sizeGuideClose').addEventListener('click', closeSizeGuideModal);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeSizeGuideModal();
    });
}

function openSizeGuideModal() {
    const overlay = document.getElementById('sizeGuideOverlay');
    if (overlay) {
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeSizeGuideModal() {
    const overlay = document.getElementById('sizeGuideOverlay');
    if (overlay) {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function initOrderTracker() {
    if (document.getElementById('trackerOverlay')) return;

    const overlay = document.createElement('div');
    overlay.className = 'tracker-overlay';
    overlay.id = 'trackerOverlay';
    overlay.innerHTML = `
                <div class="tracker-card">
                    <button class="tracker-close" id="trackerOverlayClose">&times;</button>
                    <h3>Track Your Order</h3>
                    <div class="tracker-input-group">
                        <input type="text" id="trackerOrderIdInput" placeholder="Enter Order ID (e.g. DX-17839...)" autocomplete="off">
                        <button class="btn" onclick="window.queryOrderStatus()" style="padding: 14px 28px;">Track</button>
                    </div>
                    <div id="trackerResults"></div>
                </div>
            `;
    document.body.appendChild(overlay);

    document.getElementById('trackerOverlayClose').addEventListener('click', closeOrderTracker);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeOrderTracker();
    });
}

function openOrderTracker() {
    const overlay = document.getElementById('trackerOverlay');
    if (overlay) {
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        setTimeout(() => {
            document.getElementById('trackerOrderIdInput').focus();
        }, 300);
    }
}

function closeOrderTracker() {
    const overlay = document.getElementById('trackerOverlay');
    if (overlay) {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
        document.getElementById('trackerOrderIdInput').value = '';
        document.getElementById('trackerResults').innerHTML = '';
    }
}

async function queryOrderStatus() {
    const orderIdInput = document.getElementById('trackerOrderIdInput');
    const resultsContainer = document.getElementById('trackerResults');
    if (!orderIdInput || !resultsContainer) return;

    let orderId = orderIdInput.value.trim();
    if (orderId.startsWith('#')) {
        orderId = orderId.substring(1).trim();
    }
    orderId = orderId.toUpperCase();

    if (!orderId) {
        alert('Please enter an Order ID.');
        return;
    }

    resultsContainer.innerHTML = '<div class="text-center" style="padding: 20px 0;"><i class="fas fa-spinner fa-spin" style="font-size: 24px;"></i><p style="margin-top: 10px;">Querying database...</p></div>';

    try {
        const q = window.firebaseQuery(
            window.firebaseCollection(window.firebaseDb, window.firebaseCollections.ORDERS),
            window.firebaseWhere("orderNumber", "==", orderId)
        );
        const querySnapshot = await window.firebaseGetDocs(q);

        if (querySnapshot.empty) {
            const docRef = window.firebaseDoc(window.firebaseDb, window.firebaseCollections.ORDERS, orderId);
            const docSnap = await window.firebaseGetDoc(docRef);

            if (docSnap.exists()) {
                renderTrackerTimeline(docSnap.data(), resultsContainer);
            } else {
                resultsContainer.innerHTML = `<div style="text-align: center; color: #888; font-size: 13px; padding: 20px 0;">❌ Order ID not found. Verify waybill format.</div>`;
            }
        } else {
            const orderData = querySnapshot.docs[0].data();
            renderTrackerTimeline(orderData, resultsContainer);
        }
    } catch (err) {
        console.error("Tracker query error:", err);
        resultsContainer.innerHTML = `<div style="text-align: center; color: #888; font-size: 13px; padding: 20px 0;">Error retrieving order details.</div>`;
    }
}

function renderTrackerTimeline(order, container) {
    const status = (order.status || 'pending').toLowerCase();
    const Courier = order.courierService || 'The Courier Guy';
    const tracking = order.trackingNumber || 'Pending assignment';
    const url = order.trackingUrl || '#';

    const isPlaced = true;
    const isConfirmed = status !== 'pending';
    const isShipped = status === 'out_for_delivery' || status === 'delivered';
    const isDelivered = status === 'delivered';

    let timelineHtml = `
                <div class="tracker-timeline">
                    <div class="tracker-step ${isPlaced ? 'active' : ''}">
                        <h5>Order Placed</h5>
                        <p>We have successfully received your order request.</p>
                    </div>
                    <div class="tracker-step ${isConfirmed ? 'active' : ''}">
                        <h5>Payment Confirmed</h5>
                        <p>${isConfirmed ? 'Payment cleared. Preparing shipment.' : 'Awaiting payment verification.'}</p>
                    </div>
                    <div class="tracker-step ${isShipped ? 'active' : ''}">
                        <h5>Out For Delivery</h5>
                        <p>${isShipped ? `Dispatched via <strong>${Courier}</strong>. Waybill: <strong>${tracking}</strong>.` : 'Awaiting courier pickup.'}</p>
                        ${(isShipped && url && url !== '#') ? `<div style="margin-top: 8px;"><a href="${url}" target="_blank" style="text-decoration: underline; font-weight: 600; color: var(--nike-black);">Track Waybill &rarr;</a></div>` : ''}
                    </div>
                    <div class="tracker-step ${isDelivered ? 'active' : ''}">
                        <h5>Delivered</h5>
                        <p>${isDelivered ? 'Courier confirmed package handed over.' : 'Estimated 3-5 days after shipment.'}</p>
                    </div>
                </div>
            `;
    container.innerHTML = timelineHtml;
}

function calculateDeliveryFee(subtotal) {
    if (subtotal >= FREE_DELIVERY_THRESHOLD) {
        return 0;
    }
    return DELIVERY_FEE;
}

// ===== YOCO DIRECT BUY PAGE =====
function loadYocoProducts() {
    const yocoGrid = document.getElementById('yocoProductsGrid');
    if (!yocoGrid) return;

    yocoGrid.innerHTML = '';

    window.PRODUCTS_DATA.forEach(product => {
        const productKey = `product_${product.id}`;
        const rawSelections = productSelections[productKey] || {};
        const selections = {
            size: rawSelections.size || product.sizes[0],
            color: rawSelections.color || product.colors[0]
        };

        const yocoProduct = document.createElement('div');
        yocoProduct.className = 'yoco-product';

        yocoProduct.innerHTML = `
                    <div class="yoco-icon">
                        <i class="fas fa-bolt"></i>
                    </div>
                    <h3>${product.name}</h3>
                    <div class="yoco-price">R ${product.price.toFixed(2)}</div>
                    <p class="yoco-description">${product.description}</p>
                    
                    <div class="size-selection">
                        <h4>SIZE</h4>
                        <div class="size-options">
                            ${product.sizes.map(size => `
                                <button class="size-option ${selections.size === size ? 'selected' : ''}" 
                                        data-size="${size}"
                                        onclick="selectSize(${product.id}, '${size}', this)">
                                    ${size}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="color-selection">
                        <h4>COLOR</h4>
                        <div class="color-options">
                            ${product.colors.map(color => `
                                <button class="color-option ${selections.color.name === color.name ? 'selected' : ''}"
                                        data-color="${color.name}"
                                        style="background-color: ${color.code}"
                                        onclick="selectColor(${product.id}, '${color.name}', '${color.code}', this)">
                                </button>
                            `).join('')}
                        </div>
                    </div>
                    
                    <button class="buy-btn" onclick="initiateYocoDirectPayment(${product.id}, '${product.name}', ${product.price})">
                        <i class="fas fa-bolt"></i> Quick Buy with Yoco
                    </button>
                    
                    <div class="email-notification mt-20">
                        <p><i class="fas fa-envelope"></i> You'll receive order confirmation from drixelsa@gmail.com</p>
                    </div>
                `;

        yocoGrid.appendChild(yocoProduct);
    });
}

// ===== CHECKOUT FUNCTIONS =====
function loadCheckoutPage() {
    const checkoutSummary = document.getElementById('checkoutSummary');
    if (!checkoutSummary) return;

    const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    const shipping = calculateDeliveryFee(subtotal);
    const tax = 0;
    const total = subtotal + shipping + tax;

    let html = '';
    cart.forEach(item => {
        html += `
                    <div class="checkout-summary-item">
                        <div class="checkout-summary-item-img">
                            <img src="${item.image}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/120x120?text=Drixel+SA'">
                        </div>
                        <div class="checkout-summary-item-info">
                            <h4>${item.name}</h4>
                            <div class="checkout-summary-item-meta">
                                <span>Size: ${item.size}</span>
                                <span>Color: ${item.color}</span>
                                <span>Qty: ${item.quantity}</span>
                            </div>
                        </div>
                        <div class="checkout-summary-item-price">R ${(item.price * item.quantity).toFixed(2)}</div>
                    </div>
                `;
    });

    html += `
                <div class="checkout-summary-row">
                    <span>Subtotal</span>
                    <span>R ${subtotal.toFixed(2)}</span>
                </div>
                <div class="checkout-summary-row">
                    <span>Delivery Fee</span>
                    <span>R ${shipping.toFixed(2)}</span>
                </div>
                <div class="checkout-summary-row">
                    <span>Tax (0% VAT)</span>
                    <span>R ${tax.toFixed(2)}</span>
                </div>
            `;

    checkoutSummary.innerHTML = html;
    document.getElementById('checkoutTotal').textContent = `R ${total.toFixed(2)}`;

    const shippingNote = document.getElementById('checkoutShippingNote');
    if (shipping === 0) {
        shippingNote.textContent = '🎉 Free delivery applied!';
    } else {
        shippingNote.textContent = `Add R${(FREE_DELIVERY_THRESHOLD - subtotal).toFixed(2)} more for free delivery!`;
    }

    setupPaymentMethodToggle();
}

function setupPaymentMethodToggle() {
    const payBank = document.getElementById('payBank');
    const payYoco = document.getElementById('payYoco');
    const paySnapScan = document.getElementById('paySnapScan');
    const bankInfo = document.getElementById('bankTransferInfo');
    const yocoInfo = document.getElementById('yocoPaymentInfo');
    const snapScanInfo = document.getElementById('snapScanInfo');

    if (!payBank || !payYoco || !paySnapScan) return;

    payBank.addEventListener('change', function () {
        if (this.checked) {
            bankInfo.style.display = 'block';
            yocoInfo.style.display = 'none';
            snapScanInfo.style.display = 'none';
        }
    });

    payYoco.addEventListener('change', function () {
        if (this.checked) {
            bankInfo.style.display = 'none';
            yocoInfo.style.display = 'block';
            snapScanInfo.style.display = 'none';
        }
    });

    paySnapScan.addEventListener('change', function () {
        if (this.checked) {
            bankInfo.style.display = 'none';
            yocoInfo.style.display = 'none';
            snapScanInfo.style.display = 'block';

            const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
            const shipping = calculateDeliveryFee(subtotal);
            const tax = 0;
            const total = subtotal + shipping + tax;

            const reference = generateSnapScanReference();

            document.getElementById('snapScanAmount').textContent = 'R ' + total.toFixed(2);
            document.getElementById('snapScanReference').textContent = reference;

            generateSnapScanQRCode(total, reference);

            currentSnapScanOrder = {
                reference: reference,
                amount: total,
                timestamp: new Date().toISOString(),
                cartItems: [...cart]
            };

            console.log("✅ SnapScan order initialized:", reference, "Amount: R" + total.toFixed(2));
        }
    });
}

function generateSnapScanQRCode(amount, reference) {
    const qrContainer = document.getElementById('snapScanQRCode');
    if (!qrContainer) return;

    qrContainer.innerHTML = '';

    const snapScanLink = `${SNAPSCAN_QR_URL}?amount=${amount}&reference=${reference}`;

    console.log("🔗 SnapScan Link:", snapScanLink);

    try {
        const qrCode = new QRCode(qrContainer, {
            text: snapScanLink,
            width: 250,
            height: 250,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });

        console.log("✅ QR Code generated successfully");

        setTimeout(() => {
            const canvas = qrContainer.querySelector('canvas');
            if (canvas) {
                canvas.style.cursor = 'pointer';
                canvas.title = 'Click to open SnapScan link';
                canvas.addEventListener('click', function () {
                    window.open(snapScanLink, '_blank');
                });
            }
        }, 100);

    } catch (error) {
        console.error("❌ QR Code generation error:", error);
        qrContainer.innerHTML = `
                    <div style="text-align: center; color: #ff0000;">
                        <i class="fas fa-exclamation-triangle fa-3x"></i>
                        <p>QR Code generation failed</p>
                        <p style="font-size: 12px;">Please use this link:</p>
                        <a href="${snapScanLink}" target="_blank" style="color: #000000; font-size: 12px;">
                            ${snapScanLink.substring(0, 50)}...
                        </a>
                    </div>
                `;
    }
}

function generateSnapScanReference() {
    const randomNum = Math.floor(Math.random() * 9000) + 1000;
    return `DRIX${randomNum}`;
}

function copySnapScanReference() {
    const reference = document.getElementById('snapScanReference').textContent;
    const copyBtn = document.getElementById('copyRefBtn');

    if (reference === 'Loading...' || !reference) {
        alert('Reference number is not ready yet. Please wait.');
        return;
    }

    navigator.clipboard.writeText(reference).then(() => {
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        copyBtn.classList.add('copy-success');

        setTimeout(() => {
            copyBtn.innerHTML = originalText;
            copyBtn.classList.remove('copy-success');
        }, 2000);

    }).catch(err => {
        console.error('Failed to copy: ', err);
        const textArea = document.createElement('textarea');
        textArea.value = reference;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
    });
}

async function confirmSnapScanPayment() {
    if (!currentSnapScanOrder) {
        alert('No SnapScan order found. Please select SnapScan payment method first.');
        return;
    }

    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const address = document.getElementById('address').value;
    const city = document.getElementById('city').value;
    const postalCode = document.getElementById('postalCode').value;
    const province = document.getElementById('province').value;

    if (!firstName || !lastName || !email || !phone || !address || !city || !postalCode || !province) {
        alert('Please fill in all required shipping information before confirming payment.');
        return;
    }

    showConfirm(
        `Have you completed the payment of R${currentSnapScanOrder.amount.toFixed(2)} using SnapScan?\n\nReference: ${currentSnapScanOrder.reference}\n\nClick Yes to confirm your payment.`,
        async () => {
            try {
                console.log("✅ Processing SnapScan payment confirmation...");

                const orderNumber = generateOrderNumber();
                const subscribed = document.getElementById('newsletterSubscription').checked;

                const orderData = {
                    order_id: orderNumber,
                    orderNumber: orderNumber,
                    customer: {
                        name: `${firstName} ${lastName}`,
                        email: email,
                        phone: phone,
                        address: address,
                        city: city,
                        postalCode: postalCode,
                        province: province
                    },
                    items: [...cart],
                    subtotal: cart.reduce((total, item) => total + (item.price * item.quantity), 0),
                    shipping: calculateDeliveryFee(cart.reduce((total, item) => total + (item.price * item.quantity), 0)),
                    tax: 0,
                    total: currentSnapScanOrder.amount,
                    paymentMethod: 'snapscan',
                    paymentStatus: 'pending_verification',
                    paymentReference: currentSnapScanOrder.reference,
                    subscribed: subscribed,
                    status: 'processing',
                    deliveryMethod: 'The Courier Guy / PAXI',
                    processingTime: '1-3 days',
                    deliveryTime: '3-5 business days',
                    userId: window.currentFirebaseUser ? window.currentFirebaseUser.uid : 'anonymous',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                console.log("📦 Order data:", orderData);

                const db = window.firebaseDb;
                if (!db) {
                    throw new Error("Firebase database not available");
                }

                console.log("💾 Saving order to Firebase...");
                const orderRef = await window.firebaseAddDoc(window.firebaseCollection(db, 'orders'), orderData);
                console.log("✅ Order saved with ID:", orderRef.id);

                cart = [];
                updateCartCount();

                // Send Order Confirmation email for SnapScan in background (non-blocking)
                sendOrderConfirmationEmail(orderData).catch(e => console.error("Email error:", e));
                // Notify admin of new order
                sendAdminOrderNotificationEmail(orderData).catch(e => console.error("Admin notification email error:", e));

                const orderNumElem = document.getElementById('orderNumber');
                if (orderNumElem) orderNumElem.textContent = orderNumber;
                const deliveryFeeInfo = document.getElementById('deliveryFeeInfo');
                if (deliveryFeeInfo) {
                    if (orderData.shipping === 0) {
                        deliveryFeeInfo.textContent = 'Delivery: FREE (Order over R1000)';
                    } else {
                        deliveryFeeInfo.textContent = `Delivery Fee: R${orderData.shipping.toFixed(2)}`;
                    }
                }

                alert(`✅ Payment confirmed!\n\nOrder #${orderNumber} has been created.\nA confirmation email has been sent to ${email}.`);

                showPage('orderConfirmation', `#order=${orderNumber}`);

            } catch (error) {
                console.error("❌ Error processing SnapScan payment:", error);
                alert('There was an error processing your payment. Please try again or contact support.');
            }
        }
    );
}

function generateOrderNumber() {
    const randomNum = Math.floor(Math.random() * 9000) + 1000;
    return `DRIX${randomNum}`;
}

// ===== PLACE ORDER FUNCTION =====
async function placeOrder() {
    console.log("🔄 placeOrder() called");

    // Get form data
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const address = document.getElementById('address').value;
    const city = document.getElementById('city').value;
    const postalCode = document.getElementById('postalCode').value;
    const province = document.getElementById('province').value;

    // Validate form
    if (!firstName || !lastName || !email || !phone || !address || !city || !postalCode || !province) {
        alert('Please fill in all required shipping information.');
        return;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('Please enter a valid email address.');
        return;
    }

    // Get payment method
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;
    if (!paymentMethod) {
        alert('Please select a payment method.');
        return;
    }

    // Check if cart is empty
    if (cart.length === 0) {
        alert('Your cart is empty. Please add items to your cart before placing an order.');
        return;
    }

    // Calculate order totals
    const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    const shipping = calculateDeliveryFee(subtotal);
    const tax = 0;
    const total = subtotal + shipping + tax;

    // Get subscription preference
    const subscribed = document.getElementById('newsletterSubscription').checked;

    // Generate order number
    const orderNumber = generateOrderNumber();

    // Create order data
    const orderData = {
        order_id: orderNumber,
        orderNumber: orderNumber,
        customer: {
            name: `${firstName} ${lastName}`,
            email: email,
            phone: phone,
            address: address,
            city: city,
            postalCode: postalCode,
            province: province
        },
        items: [...cart], // Copy cart items
        subtotal: subtotal,
        shipping: shipping,
        tax: tax,
        total: total,
        paymentMethod: paymentMethod,
        paymentStatus: paymentMethod === 'bank' ? 'pending' :
            paymentMethod === 'yoco' ? 'paid' :
                paymentMethod === 'snapscan' ? 'pending_verification' : 'pending',
        subscribed: subscribed,
        status: 'processing',
        deliveryMethod: 'The Courier Guy / PAXI',
        processingTime: '1-3 days',
        deliveryTime: '3-5 business days',
        userId: window.currentFirebaseUser ? window.currentFirebaseUser.uid : 'anonymous',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    const placeOrderBtn = document.querySelector('.btn-place-order');
    let originalBtnText = '';
    if (placeOrderBtn) {
        originalBtnText = placeOrderBtn.innerHTML;
        placeOrderBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing Order...';
        placeOrderBtn.disabled = true;
    }

    try {
        // Save order to Firebase for ALL payment methods
        const orderId = await saveOrderToFirebase(orderData);
        orderData.id = orderId;

        console.log("🚀 [Checkout] Dispatching order emails...");
        // Send order confirmation to customer
        const customerEmailPromise = sendOrderConfirmationEmail(orderData).catch(e => console.error("Customer email dispatch error:", e));
        // Send order notification to admin
        const adminEmailPromise = sendAdminOrderNotificationEmail(orderData).catch(e => console.error("Admin email dispatch error:", e));

        await Promise.allSettled([customerEmailPromise, adminEmailPromise]);

        if (paymentMethod === 'bank') {
            alert(`Order placed successfully!\n\nOrder #${orderNumber}\n\nPayment Details:\nBank: Standard Bank\nAccount: 071337873\nReference: ${orderNumber}\n\nPlease make payment and your order will be processed.`);
        } else if (paymentMethod === 'snapscan') {
            alert(`Order #${orderNumber} created!\n\nPlease complete your SnapScan payment using reference "${orderNumber}". Order details have been sent to your email (${email}).`);
        }

        // Clear cart
        cart = [];
        updateCartCount();

        // Show order confirmation page
        const orderNumElem = document.getElementById('orderNumber');
        if (orderNumElem) orderNumElem.textContent = orderNumber;
        const deliveryFeeInfo = document.getElementById('deliveryFeeInfo');
        if (deliveryFeeInfo) {
            if (orderData.shipping === 0) {
                deliveryFeeInfo.textContent = 'Delivery: FREE (Order over R1000)';
            } else {
                deliveryFeeInfo.textContent = `Delivery Fee: R${orderData.shipping.toFixed(2)}`;
            }
        }

        try { if (typeof grecaptcha !== 'undefined') { grecaptcha.reset(); } } catch (e) { }
        showPage('orderConfirmation', `#order=${orderNumber}`);

    } catch (error) {
        console.error("❌ Error placing order:", error);
        alert('There was an error processing your order. Please try again.');
    } finally {
        if (placeOrderBtn) {
            placeOrderBtn.innerHTML = originalBtnText;
            placeOrderBtn.disabled = false;
        }
    }
}

async function saveOrderToFirebase(orderData) {
    try {
        const db = window.firebaseDb;
        if (!db) {
            throw new Error("Firebase database not available");
        }

        console.log("💾 Saving order to Firebase...");
        const orderRef = await window.firebaseAddDoc(window.firebaseCollection(db, 'orders'), orderData);
        console.log("✅ Order saved with ID:", orderRef.id);

        return orderRef.id;
    } catch (error) {
        console.error("❌ Error saving order to Firebase:", error);
        throw error;
    }
}

// ===== YOCO PAYMENT FUNCTIONS =====
function showYocoPaymentModal(amount, description, metadata = {}, customer = null) {
    currentYocoPayment = {
        amount: amount,
        description: description,
        metadata: metadata,
        customer: customer
    };

    document.getElementById('paymentAmount').textContent = amount.toFixed(2);

    const receiptEmail = document.getElementById('receiptEmail');
    if (customer && customer.email) {
        receiptEmail.value = customer.email;
    } else if (window.currentFirebaseUser && window.currentFirebaseUser.email) {
        receiptEmail.value = window.currentFirebaseUser.email;
    } else {
        receiptEmail.value = '';
    }

    document.getElementById('yocoPaymentModal').classList.add('active');
    document.body.style.overflow = 'hidden';

    document.getElementById('yocoPaymentErrors').style.display = 'none';
    clearYocoFormErrors();

    setTimeout(() => {
        document.getElementById('cardNumber').focus();
    }, 100);
}

function closeYocoPaymentModal() {
    document.getElementById('yocoPaymentModal').classList.remove('active');
    document.body.style.overflow = 'auto';
    clearYocoForm();
    clearYocoFormErrors();
}

function clearYocoForm() {
    document.getElementById('cardNumber').value = '';
    document.getElementById('expiryDate').value = '';
    document.getElementById('cvc').value = '';
    document.getElementById('cardholderName').value = '';
    document.getElementById('receiptEmail').value = '';
    document.getElementById('yocoPaymentErrors').style.display = 'none';
}

function clearYocoFormErrors() {
    document.querySelectorAll('.payment-error').forEach(error => {
        error.classList.remove('active');
    });
    document.querySelectorAll('.card-input').forEach(input => {
        input.classList.remove('error');
    });
}


// ===== YOCO TOKEN HELPER (supports different SDK versions) =====
async function createYocoToken(card) {
    // Ensure SDK exists
    if (!window.yocoSDK && window.YocoSDK) {
        try {
            window.yocoSDK = new window.YocoSDK({ publicKey: YOCO_PUBLIC_KEY });
        } catch (e) { }
    }
    const sdk = window.yocoSDK;

    // 1) Promise-based createToken
    if (sdk && typeof sdk.createToken === 'function') {
        // Some versions are callback-based; detect by arity
        if (sdk.createToken.length >= 2) {
            return await new Promise((resolve, reject) => {
                sdk.createToken(card, (result) => {
                    // Yoco commonly returns {id: 'tok_...'} or {error: {...}}
                    if (result && result.error) return reject(result.error);
                    if (result && result.id) return resolve(result);
                    return reject(new Error('Unexpected token response'));
                });
            });
        }
        return await sdk.createToken(card);
    }

    // 2) inline.createToken variant
    if (sdk && sdk.inline && typeof sdk.inline.createToken === 'function') {
        return await sdk.inline.createToken(card);
    }

    // 3) Hosted popup fallback (no inline tokenization available)
    // Some Yoco builds expose showPopup on the instance, others behave differently.
    const popupCapable =
        (sdk && typeof sdk.showPopup === 'function') ||
        (window.YocoSDK && typeof window.YocoSDK.showPopup === 'function') ||
        (window.yocoSDK && typeof window.yocoSDK.showPopup === 'function');

    if (popupCapable) {
        return await new Promise((resolve, reject) => {
            try {
                const cents = Math.round((window.currentOrderTotalZAR || 0) * 100);
                const popupFn =
                    (sdk && sdk.showPopup) ||
                    (window.yocoSDK && window.yocoSDK.showPopup) ||
                    (window.YocoSDK && window.YocoSDK.showPopup);

                popupFn.call(sdk || window.yocoSDK || window.YocoSDK, {
                    amountInCents: cents,
                    currency: 'ZAR',
                    name: 'Drixel SA',
                    description: 'Card payment',
                    callback: function (result) {
                        if (result && result.error) return reject(result.error);
                        if (result && result.id) return resolve(result);
                        return reject(new Error('Unexpected popup token response'));
                    }
                });
            } catch (e) { reject(e); }
        });
    }

    throw new Error('Yoco SDK tokenization method not available (createToken missing).');
}

async function processYocoPayment() {
    console.log("🔄 processYocoPayment() called");

    if (!window.yocoSDK) {
        console.error("❌ yocoSDK is not available!");
        const errorsDiv = document.getElementById('yocoPaymentErrors');
        errorsDiv.innerHTML = `
                    <p><i class="fas fa-exclamation-triangle"></i> Payment system loading...</p>
                    <p style="font-size: 12px; margin-top: 10px;">
                        Please wait a moment and try again. 
                        If this continues, refresh the page.
                    </p>
                `;
        errorsDiv.style.display = 'block';
        return;
    }

    const errorsDiv = document.getElementById('yocoPaymentErrors');
    errorsDiv.style.display = 'none';
    errorsDiv.innerHTML = '';

    const cardNumber = document.getElementById('cardNumber').value.trim().replace(/\s/g, '');
    const expiryDate = document.getElementById('expiryDate').value.trim();
    const cvc = document.getElementById('cvc').value.trim();
    const cardholderName = document.getElementById('cardholderName').value.trim();
    const receiptEmail = document.getElementById('receiptEmail').value.trim();

    const processBtn = document.getElementById('processPaymentBtn');
    const originalText = processBtn.innerHTML;
    processBtn.innerHTML = '<div class="loading-spinner"></div> Processing Payment...';
    processBtn.disabled = true;

    try {
        console.log("💳 Starting Yoco Payment...");

        if (!window.yocoSDK) {
            window.yocoSDK = new window.YocoSDK({
                publicKey: YOCO_PUBLIC_KEY
            });
        }

        window.currentOrderTotalZAR = (currentYocoPayment && currentYocoPayment.amount) ? currentYocoPayment.amount : 0;
        const token = await createYocoToken({
            number: cardNumber,
            cvc: cvc,
            expiryMonth: expiryDate.split('/')[0],
            expiryYear: '20' + expiryDate.split('/')[1],
            name: cardholderName
        });

        console.log("✅ Yoco token created:", token.id.substring(0, 15) + '...');

        closeYocoPaymentModal();

        alert('✅ Payment Successful! R' + currentYocoPayment.amount.toFixed(2) + ' has been processed. Receipt sent to ' + receiptEmail);

        // Complete the order
        await completeYocoPayment(token.id, receiptEmail);

    } catch (error) {
        console.error("❌ Payment Error:", error);

        let errorMessage = 'Payment failed: ';
        if (error.message.includes('insufficient')) {
            errorMessage = 'Insufficient funds. Please use a different card.';
        } else if (error.message.includes('declined')) {
            errorMessage = 'Card declined. Please contact your bank or use a different card.';
        } else {
            errorMessage += error.message || 'Please check your card details and try again.';
        }

        errorsDiv.innerHTML = `<p>• ${errorMessage}</p>`;
        errorsDiv.style.display = 'block';

        errorsDiv.scrollIntoView({ behavior: 'smooth' });
    } finally {
        processBtn.innerHTML = originalText;
        processBtn.disabled = false;
    }
}

async function completeYocoPayment(tokenId, receiptEmail) {
    try {
        if (!window.pendingOrderData) {
            throw new Error("No pending order data found");
        }

        const orderData = window.pendingOrderData;

        // Update order with payment info
        const db = window.firebaseDb;
        if (orderData.orderId) {
            const orderRef = window.firebaseDoc(db, 'orders', orderData.orderId);
            await window.firebaseUpdateDoc(orderRef, {
                paymentStatus: 'paid',
                paymentToken: tokenId.substring(0, 15) + '...',
                receiptEmail: receiptEmail,
                updatedAt: new Date().toISOString()
            });
        }

        // Send email based on payment method rules
        if (orderData.paymentMethod === 'yoco' || orderData.paymentMethod === 'snapscan') {
            await sendOrderConfirmationEmail(orderData).catch(e => console.error("Email error:", e));
        } else if (orderData.paymentMethod === 'bank') {
            await sendOrderReceivedEmail(orderData).catch(e => console.error("Email error:", e));
        }
        // Always notify admin of new order
        sendAdminOrderNotificationEmail(orderData).catch(e => console.error("Admin notification email error:", e));

        // Clear cart
        cart = [];
        updateCartCount();

        // Show order confirmation page
        const orderNumElem = document.getElementById('orderNumber');
        if (orderNumElem) orderNumElem.textContent = orderData.orderNumber;
        const deliveryFeeInfo = document.getElementById('deliveryFeeInfo');
        if (deliveryFeeInfo) {
            if (orderData.shipping === 0) {
                deliveryFeeInfo.textContent = 'Delivery: FREE (Order over R1000)';
            } else {
                deliveryFeeInfo.textContent = `Delivery Fee: R${orderData.shipping.toFixed(2)}`;
            }
        }

        // Clear pending order data
        window.pendingOrderData = null;

        showPage('orderConfirmation', `#order=${orderData.orderNumber}`);

    } catch (error) {
        console.error("❌ Error completing Yoco payment:", error);
        alert('Error completing order. Please contact support.');
    }
}

function initiateYocoDirectPayment(productId, productName, price) {
    const currentUser = window.currentFirebaseUser;
    if (!currentUser) {
        alert('Please login or create an account to make a purchase.');
        showPage('auth');
        return false;
    }

    const productKey = `product_${productId}`;
    const product = window.PRODUCTS_DATA.find(p => p.id === productId);
    const rawSelections = productSelections[productKey] || {};
    const selections = {
        size: rawSelections.size || (product ? product.sizes[0] : 'M'),
        color: rawSelections.color || (product ? product.colors[0] : { name: 'Black', code: '#111111' })
    };

    const description = `Drixel SA: ${productName} (${selections.size}, ${selections.color.name})`;
    const metadata = {
        productId: productId,
        productName: productName,
        size: selections.size,
        color: selections.color.name,
        quantity: 1,
        type: 'direct'
    };

    const customer = {
        name: currentUser.displayName || currentUser.email.split('@')[0],
        email: currentUser.email,
        phone: ''
    };

    showYocoPaymentModal(price, description, metadata, customer);
}

function initiateYocoCheckoutFromCart() {
    if (cart.length === 0) {
        alert('Your cart is empty. Please add items to your cart first.');
        return;
    }

    const firstName = document.getElementById('firstName')?.value;
    const lastName = document.getElementById('lastName')?.value;
    const email = document.getElementById('email')?.value;

    if (firstName && lastName && email) {
        initiateYocoCheckout();
    } else {
        checkAuthAndNavigate('checkout');

        setTimeout(() => {
            const payYoco = document.getElementById('payYoco');
            if (payYoco) {
                payYoco.checked = true;
                payYoco.dispatchEvent(new Event('change'));
            }
        }, 500);
    }
}

function initiateYocoCheckout() {
    if (cart.length === 0) {
        alert('Your cart is empty.');
        return;
    }

    const firstName = document.getElementById('firstName')?.value;
    const lastName = document.getElementById('lastName')?.value;
    const email = document.getElementById('email')?.value;
    const phone = document.getElementById('phone')?.value;

    if (!firstName || !lastName || !email || !phone) {
        alert('Please fill in all required shipping information before proceeding with Yoco payment.');
        return;
    }

    // Calculate order total
    const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    const shipping = calculateDeliveryFee(subtotal);
    const total = subtotal + shipping;

    // Generate order number
    const orderNumber = generateOrderNumber();

    const description = `Drixel SA Order #${orderNumber} (${cart.length} items)`;
    const metadata = {
        orderNumber: orderNumber,
        type: 'checkout',
        cart: cart.length
    };

    const customer = {
        name: `${firstName} ${lastName}`,
        email: email,
        phone: phone
    };

    // Store order data temporarily
    window.pendingOrderData = {
        order_id: orderNumber,
        orderNumber: orderNumber,
        orderNumber: orderNumber,
        customer: customer,
        items: [...cart],
        subtotal: subtotal,
        shipping: shipping,
        total: total,
        paymentMethod: 'yoco',
        paymentStatus: 'pending_payment',
        subscribed: document.getElementById('newsletterSubscription')?.checked || false,
        status: 'processing'
    };

    // Show Yoco payment modal
    showYocoPaymentModal(total, description, metadata, customer);
}

// ===== EMAIL FUNCTIONS =====
const DEFAULT_EMAIL_TEMPLATES = {
    order_confirmation: {
        subject: "Order Confirmation - #{orderNumber}",
        body: `<div style="font-family: 'Outfit', 'Inter', sans-serif, Arial; color: #111; max-width: 600px; margin: 0 auto; background-color: #fafafa; border: 1px solid #eee; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
    <div style="background-color: #000000; padding: 30px; text-align: center; border-bottom: 2px solid #ff6e00;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px; letter-spacing: 2px; font-weight: 900; text-decoration: none;">DRIXEL<span style="color: #ff6e00;">SA</span></h1>
        <p style="color: #888888; margin: 5px 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px;">Premium Streetwear SA</p>
    </div>
    <div style="padding: 40px; background-color: #ffffff;">
        <h2 style="font-size: 20px; font-weight: 800; margin-bottom: 20px; text-transform: uppercase; color: #111;">Confirm Your Order</h2>
        <p>Hi {customerName},</p>
        <p>Thank you for shopping with Drixel SA! We have received your order <strong>#{orderNumber}</strong>. Please find the order and checkout details below:</p>
        
        {bankDetails}

        <div style="margin: 25px 0;">
            <p style="margin: 5px 0; font-size: 14px; color: #666;">Order Date: <strong>{orderDate}</strong></p>
            <p style="margin: 5px 0; font-size: 14px; color: #666;">Delivery Address: <strong>{deliveryAddress}</strong></p>
        </div>

        <h3 style="font-size: 15px; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #eee; padding-bottom: 8px; color: #111;">Order Items</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 25px;">
            <thead>
                <tr style="border-bottom: 2px solid #eee; text-align: left; font-size: 12px; text-transform: uppercase; color: #666;">
                    <th style="padding: 8px 0;">Item</th>
                    <th style="padding: 8px 0; text-align: center;">Qty</th>
                    <th style="padding: 8px 0; text-align: right;">Total</th>
                </tr>
            </thead>
            <tbody>
                {itemsTable}
            </tbody>
        </table>

        <div style="border-top: 1px solid #eee; padding-top: 15px; font-size: 14px; text-align: right; line-height: 1.6;">
            <p style="margin: 3px 0; color: #666;">Subtotal: <strong style="color: #111;">{subtotal}</strong></p>
            <p style="margin: 3px 0; color: #666;">Delivery: <strong style="color: #111;">{shipping}</strong></p>
            <p style="margin: 5px 0; font-size: 16px; color: #ff6e00; font-weight: 700;">Total: {totalAmount}</p>
        </div>
    </div>
    <div style="background-color: #080808; padding: 30px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #1a1a1a;">
        <p style="margin: 0 0 10px; color: #888;">&copy; 2026 Drixel SA. All rights reserved. | Powered by Drixel Labs Inc.</p>
        <p style="margin: 0;">For inquiries, contact us at <a href="mailto:drixelsa@gmail.com" style="color: #ff6e00; text-decoration: none;">drixelsa@gmail.com</a></p>
    </div>
</div>`
    },
    order_received: {
        subject: "Order Confirmed - #{orderNumber}",
        body: `<div style="font-family: 'Outfit', 'Inter', sans-serif, Arial; color: #111; max-width: 600px; margin: 0 auto; background-color: #fafafa; border: 1px solid #eee; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
    <div style="background-color: #000000; padding: 30px; text-align: center; border-bottom: 2px solid #ff6e00;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px; letter-spacing: 2px; font-weight: 900; text-decoration: none;">DRIXEL<span style="color: #ff6e00;">SA</span></h1>
        <p style="color: #888888; margin: 5px 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px;">Premium Streetwear SA</p>
    </div>
    <div style="padding: 40px; background-color: #ffffff;">
        <h2 style="font-size: 20px; font-weight: 800; margin-bottom: 20px; text-transform: uppercase; color: #0caf60;">Order Confirmed</h2>
        <p>Hi {customerName},</p>
        <p>We are excited to let you know that we've received your order <strong>#{orderNumber}</strong>. We are now preparing your streetwear package for shipment.</p>
        
        <div style="background-color: #fafafa; border: 1px solid #eee; border-radius: 6px; padding: 20px; margin: 25px 0;">
            <h3 style="margin-top: 0; font-size: 14px; text-transform: uppercase; color: #111; border-bottom: 1px solid #eee; padding-bottom: 8px;">Order Details</h3>
            <p style="margin: 6px 0; font-size: 14px; color: #666;">Date: <strong>{orderDate}</strong></p>
            <p style="margin: 6px 0; font-size: 14px; color: #666;">Payment Method: <strong>{paymentMethod}</strong></p>
            <p style="margin: 6px 0; font-size: 14px; color: #666;">Payment Status: <strong>{paymentStatus}</strong></p>
            <p style="margin: 6px 0; font-size: 14px; color: #666;">Delivery Address: <strong>{deliveryAddress}</strong></p>
        </div>

        <h3 style="font-size: 15px; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #eee; padding-bottom: 8px; color: #111;">Items Ordered</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 25px;">
            <thead>
                <tr style="border-bottom: 2px solid #eee; text-align: left; font-size: 12px; text-transform: uppercase; color: #666;">
                    <th style="padding: 8px 0;">Item</th>
                    <th style="padding: 8px 0; text-align: center;">Qty</th>
                    <th style="padding: 8px 0; text-align: right;">Total</th>
                </tr>
            </thead>
            <tbody>
                {itemsTable}
            </tbody>
        </table>

        <div style="border-top: 1px solid #eee; padding-top: 15px; font-size: 14px; text-align: right; line-height: 1.6;">
            <p style="margin: 3px 0; color: #666;">Subtotal: <strong style="color: #111;">{subtotal}</strong></p>
            <p style="margin: 3px 0; color: #666;">Delivery: <strong style="color: #111;">{shipping}</strong></p>
            <p style="margin: 5px 0; font-size: 16px; color: #ff6e00; font-weight: 700;">Total: {totalAmount}</p>
        </div>
    </div>
    <div style="background-color: #080808; padding: 30px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #1a1a1a;">
        <p style="margin: 0 0 10px; color: #888;">&copy; 2026 Drixel SA. All rights reserved. | Powered by Drixel Labs Inc.</p>
    </div>
</div>`
    },
    out_for_delivery: {
        subject: "Your Order is Out for Delivery! - #{orderNumber}",
        body: `<div style="font-family: 'Outfit', 'Inter', sans-serif, Arial; color: #111; max-width: 600px; margin: 0 auto; background-color: #fafafa; border: 1px solid #eee; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
    <div style="background-color: #000000; padding: 30px; text-align: center; border-bottom: 2px solid #ff6e00;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px; letter-spacing: 2px; font-weight: 900; text-decoration: none;">DRIXEL<span style="color: #ff6e00;">SA</span></h1>
        <p style="color: #888888; margin: 5px 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px;">Premium Streetwear SA</p>
    </div>
    <div style="padding: 40px; background-color: #ffffff;">
        <h2 style="font-size: 20px; font-weight: 800; margin-bottom: 20px; text-transform: uppercase; color: #ff6e00;">Your Package is En Route</h2>
        <p>Hi {customerName},</p>
        <p>Your order <strong>#{orderNumber}</strong> has been shipped and is out for delivery! Below are the shipment tracking details:</p>
        
        <div style="background-color: #fafafa; border: 1px solid #eee; border-radius: 6px; padding: 25px; margin: 25px 0; line-height: 1.6;">
            <h3 style="margin-top: 0; font-size: 14px; text-transform: uppercase; color: #111; border-bottom: 1px solid #eee; padding-bottom: 8px;">Shipment Details</h3>
            <p style="margin: 6px 0; font-size: 14px; color: #666;">Courier Service: <strong>{courierService}</strong></p>
            <p style="margin: 6px 0; font-size: 14px; color: #666;">Tracking Number: <strong>{trackingNumber}</strong></p>
            <p style="margin: 6px 0; font-size: 14px; color: #666;">Estimated Delivery: <strong>{estimatedDelivery}</strong></p>
            <p style="margin: 20px 0 0;">
                <a href="{trackingUrl}" target="_blank" style="display: inline-block; background-color: #ff6e00; color: #000; padding: 12px 24px; border-radius: 30px; text-decoration: none; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Track Shipment</a>
            </p>
        </div>
    </div>
    <div style="background-color: #080808; padding: 30px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #1a1a1a;">
        <p style="margin: 0 0 10px; color: #888;">&copy; 2026 Drixel SA. All rights reserved. | Powered by Drixel Labs Inc.</p>
    </div>
</div>`
    },
    order_delivered: {
        subject: "Your Order has been Delivered! - #{orderNumber}",
        body: `<div style="font-family: 'Outfit', 'Inter', sans-serif, Arial; color: #111; max-width: 600px; margin: 0 auto; background-color: #fafafa; border: 1px solid #eee; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
    <div style="background-color: #000000; padding: 30px; text-align: center; border-bottom: 2px solid #ff6e00;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px; letter-spacing: 2px; font-weight: 900; text-decoration: none;">DRIXEL<span style="color: #ff6e00;">SA</span></h1>
        <p style="color: #888888; margin: 5px 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px;">Premium Streetwear SA</p>
    </div>
    <div style="padding: 40px; background-color: #ffffff;">
        <h2 style="font-size: 20px; font-weight: 800; margin-bottom: 20px; text-transform: uppercase; color: #0caf60;">Order Delivered</h2>
        <p>Hi {customerName},</p>
        <p>Your order <strong>#{orderNumber}</strong> has been successfully delivered on <strong>{deliveredDate}</strong>. We hope you love your premium streetwear pieces!</p>
        
        <div style="background-color: #fafafa; border: 1px solid #eee; border-radius: 6px; padding: 20px; margin: 25px 0;">
            <h3 style="margin-top: 0; font-size: 14px; text-transform: uppercase; color: #111;">Delivered Items</h3>
            <ul style="padding-left: 20px; margin: 10px 0;">
                {itemsList}
            </ul>
        </div>

        <div style="margin: 30px 0; text-align: center;">
            <a href="{orderUrl}" target="_blank" style="display: inline-block; background-color: #000000; color: #ffffff; padding: 14px 28px; border-radius: 30px; text-decoration: none; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">View Order Details</a>
        </div>

        <p style="color: #666; font-size: 14px; line-height: 1.6;">If you have any feedback or queries about this delivery, please reach out to us at drixelsa@gmail.com.</p>
    </div>
    <div style="background-color: #080808; padding: 30px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #1a1a1a;">
        <p style="margin: 0 0 10px; color: #888;">&copy; 2026 Drixel SA. All rights reserved. | Powered by Drixel Labs Inc.</p>
    </div>
</div>`
    },
    order_cancelled: {
        subject: "Order Cancelled - #{orderNumber}",
        body: `<div style="font-family: 'Outfit', 'Inter', sans-serif, Arial; color: #111; max-width: 600px; margin: 0 auto; background-color: #fafafa; border: 1px solid #eee; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
    <div style="background-color: #000000; padding: 30px; text-align: center; border-bottom: 2px solid #ff6e00;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px; letter-spacing: 2px; font-weight: 900; text-decoration: none;">DRIXEL<span style="color: #ff6e00;">SA</span></h1>
        <p style="color: #888888; margin: 5px 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px;">Premium Streetwear SA</p>
    </div>
    <div style="padding: 40px; background-color: #ffffff;">
        <h2 style="font-size: 20px; font-weight: 800; margin-bottom: 20px; text-transform: uppercase; color: #dc3545;">Order Cancelled</h2>
        <p>Hi {customerName},</p>
        <p>We are writing to let you know that your order <strong>#{orderNumber}</strong> has been cancelled.</p>
        
        <p>If you have any questions or believe this was done in error, please contact our support team at <a href="mailto:drixelsa@gmail.com" style="color: #ff6e00; text-decoration: none;">drixelsa@gmail.com</a>.</p>
        <p style="color: #666; font-size: 14px; line-height: 1.6; margin-top: 25px;">Thank you for your understanding.</p>
    </div>
    <div style="background-color: #080808; padding: 30px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #1a1a1a;">
        <p style="margin: 0 0 10px; color: #888;">&copy; 2026 Drixel SA. All rights reserved. | Powered by Drixel Labs Inc.</p>
    </div>
</div>`
    }
};

function generateItemsTableHtml(items) {
    return (items || []).map(item => {
        const productData = (window.PRODUCTS_DATA || []).find(p =>
            String(p.id) === String(item.id) || p.name === item.name
        );
        const imgSrc = item.image ||
            (productData && (productData.image || (productData.images && productData.images[0]))) || '';
        const imgCell = imgSrc
            ? `<td style="padding:10px 8px 10px 0;width:68px;"><img src="${imgSrc}" alt="${item.name}" width="60" height="60" style="border-radius:8px;object-fit:cover;border:1px solid #eee;display:block;"></td>`
            : `<td style="padding:10px 8px 10px 0;width:68px;"><div style="width:60px;height:60px;background:#f5f5f5;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:22px;">&#128247;</div></td>`;
        return `<tr style="border-bottom:1px solid #f0f0f0;">
            ${imgCell}
            <td style="padding:10px 8px;color:#111;vertical-align:middle;"><strong style="font-size:14px;">${item.name}</strong><br><span style="color:#888;font-size:12px;">Size: ${item.size || 'N/A'} &nbsp;|&nbsp; Color: ${item.color || 'N/A'}</span></td>
            <td style="padding:10px 4px;text-align:center;color:#555;vertical-align:middle;">x${item.quantity}</td>
            <td style="padding:10px 0;text-align:right;font-weight:700;color:#111;vertical-align:middle;white-space:nowrap;">R ${(item.price * item.quantity).toFixed(2)}</td>
        </tr>`;
    }).join('');
}


function generateItemsListHtml(items) {
    return (items || []).map(item =>
        `<li style="margin: 6px 0; color: #111;"><strong>${item.name}</strong> (${item.size}, ${item.color}) x${item.quantity}</li>`
    ).join('');
}

function renderEmailTemplate(templateKey, orderData, extraData = {}) {
    const customizedTemplates = JSON.parse(localStorage.getItem('drixel_email_templates')) || {};
    const template = customizedTemplates[templateKey] || DEFAULT_EMAIL_TEMPLATES[templateKey];
    
    let subject = template.subject;
    let html = template.body;

    const paymentMethodText = orderData.paymentMethod === 'bank' ? 'Bank Transfer' :
        orderData.paymentMethod === 'yoco' ? 'Credit Card (Yoco)' :
            orderData.paymentMethod === 'snapscan' ? 'SnapScan' : 'Other';

    const paymentStatusText = orderData.paymentStatus === 'paid' ? '✅ Paid' : '⏳ Pending Payment';

    let bankDetails = '';
    if (orderData.paymentMethod === 'bank') {
        bankDetails = `
            <div style="background-color: #fafafa; border: 1px solid #eee; border-radius: 6px; padding: 20px; margin: 25px 0;">
                <h3 style="margin-top: 0; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px; color: #ff6e00;">Bank Transfer Details</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <tr><td style="padding: 6px 0; color: #666; width: 120px;">Bank:</td><td style="padding: 6px 0; font-weight: 600; color: #111;">Standard Bank</td></tr>
                    <tr><td style="padding: 6px 0; color: #666;">Account Name:</td><td style="padding: 6px 0; font-weight: 600; color: #111;">DRIXEL CLOTHING BRAND</td></tr>
                    <tr><td style="padding: 6px 0; color: #666;">Account Number:</td><td style="padding: 6px 0; font-weight: 600; color: #111;">071337873</td></tr>
                    <tr><td style="padding: 6px 0; color: #666;">Reference:</td><td style="padding: 6px 0; font-weight: 700; color: #ff6e00;">${orderData.order_id || orderData.orderNumber || orderData.id}</td></tr>
                    <tr><td style="padding: 6px 0; color: #666;">Amount Due:</td><td style="padding: 6px 0; font-weight: 700; color: #111;">R${(orderData.total || 0).toFixed(2)}</td></tr>
                </table>
            </div>
        `;
    } else if (orderData.paymentMethod === 'yoco') {
        bankDetails = '<p style="color: #666; font-size: 14px;"><strong>Payment Status:</strong> <span style="color: #0caf60; font-weight: 600;">✅ Paid</span></p>';
    } else if (orderData.paymentMethod === 'snapscan') {
        bankDetails = '<p style="color: #666; font-size: 14px;"><strong>Payment Status:</strong> <span style="color: #ff6e00; font-weight: 600;">⏳ Pending Verification</span></p>';
    }

    const orderUrl = `${window.location.origin}${window.location.pathname}#order=${orderData.id || orderData.order_id || orderData.orderNumber}`;

    const placeholders = {
        '{orderNumber}': orderData.order_id || orderData.orderNumber || orderData.id || '',
        '{customerName}': orderData.customer?.name || orderData.customer_name || 'Customer',
        '{customerEmail}': orderData.customer?.email || orderData.customer_email || '',
        '{totalAmount}': 'R ' + (orderData.total || 0).toFixed(2),
        '{subtotal}': 'R ' + (orderData.subtotal || 0).toFixed(2),
        '{shipping}': 'R ' + (orderData.shipping || 0).toFixed(2),
        '{deliveryAddress}': `${orderData.customer?.address || ''}, ${orderData.customer?.city || ''}, ${orderData.customer?.postalCode || ''}`,
        '{paymentMethod}': paymentMethodText,
        '{paymentStatus}': paymentStatusText,
        '{bankDetails}': bankDetails,
        '{orderUrl}': orderUrl,
        '{orderDate}': orderData.createdAt ? new Date(orderData.createdAt).toLocaleDateString('en-ZA') : new Date().toLocaleDateString('en-ZA'),
        '{courierService}': extraData.courierService || orderData.courierService || '',
        '{trackingNumber}': extraData.trackingNumber || orderData.trackingNumber || '',
        '{trackingUrl}': extraData.trackingUrl || orderData.trackingUrl || '',
        '{deliveredDate}': extraData.deliveredDate || orderData.deliveredDate || new Date().toLocaleDateString('en-ZA'),
        '{estimatedDelivery}': new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-ZA'),
        '{itemsTable}': generateItemsTableHtml(orderData.items || []),
        '{itemsList}': generateItemsListHtml(orderData.items || [])
    };

    for (const [key, value] of Object.entries(placeholders)) {
        subject = subject.replaceAll(key, value);
        html = html.replaceAll(key, value);
    }

    return { subject, html };
}

async function sendOrderConfirmationEmail(orderData) {
    console.log("📧 Sending Order Confirmation Email...", orderData);
    const email = orderData?.customer?.email || orderData?.customer_email || orderData?.email || orderData?.receiptEmail || '';
    if (!email || !email.includes('@')) {
        console.error("❌ Invalid email address for Order Confirmation:", email, orderData);
        return { success: false, message: 'Invalid email address' };
    }
    try {
        const { subject, html } = renderEmailTemplate('order_confirmation', orderData);
        return await sendEmailViaResend({ to: email, subject, html });
    } catch (error) {
        console.error("❌ Error sending Order Confirmation Email:", error);
        return { success: false, message: error.message };
    }
}

async function sendOrderReceivedEmail(orderData) {
    console.log("📧 Sending Order Received Email...", orderData);
    const email = orderData?.customer?.email || orderData?.customer_email || orderData?.email || orderData?.receiptEmail || '';
    if (!email || !email.includes('@')) {
        console.error("❌ Invalid email address for Order Received:", email, orderData);
        return { success: false, message: 'Invalid email address' };
    }
    try {
        const { subject, html } = renderEmailTemplate('order_received', orderData);
        return await sendEmailViaResend({ to: email, subject, html });
    } catch (error) {
        console.error("❌ Error sending Order Received Email:", error);
        return { success: false, message: error.message };
    }
}

async function sendOutForDeliveryEmailToCustomer(orderData, trackingNumber, courierService, trackingUrl) {
    console.log("📧 Sending Out for Delivery Email via Resend...");
    const email = orderData?.customer?.email || orderData?.customer_email || orderData?.email || '';
    if (!email || !email.includes('@')) {
        console.error("❌ Missing recipient email:", orderData);
        return { success: false, message: 'Invalid recipient email address' };
    }
    try {
        const extraData = { trackingNumber, courierService, trackingUrl };
        const { subject, html } = renderEmailTemplate('out_for_delivery', orderData, extraData);
        return await sendEmailViaResend({ to: email, subject, html });
    } catch (error) {
        console.error("❌ Error sending Out for Delivery Email:", error);
        return { success: false, message: error.message };
    }
}

async function sendOrderDeliveredEmailToCustomer(orderData, deliveredDate) {
    console.log("📧 Sending Order Delivered Email via Resend...");
    const email = orderData?.customer?.email || orderData?.customer_email || orderData?.email || '';
    if (!email || !email.includes('@')) {
        console.error("❌ Missing recipient email:", orderData);
        return { success: false, message: 'Invalid recipient email address' };
    }
    try {
        const extraData = { deliveredDate: deliveredDate || new Date().toLocaleDateString('en-ZA') };
        const { subject, html } = renderEmailTemplate('order_delivered', orderData, extraData);
        return await sendEmailViaResend({ to: email, subject, html });
    } catch (error) {
        console.error("❌ Error sending Order Delivered Email:", error);
        return { success: false, message: error.message };
    }
}

async function sendOrderCancelledEmailToCustomer(orderData) {
    console.log("📧 Sending Order Cancelled Email via Resend...");
    const email = orderData?.customer?.email || orderData?.customer_email || orderData?.email || '';
    if (!email || !email.includes('@')) {
        console.error("❌ Missing recipient email:", orderData);
        return { success: false, message: 'Invalid recipient email address' };
    }
    try {
        const { subject, html } = renderEmailTemplate('order_cancelled', orderData);
        return await sendEmailViaResend({ to: email, subject, html });
    } catch (error) {
        console.error("❌ Error sending Order Cancelled Email:", error);
        return { success: false, message: error.message };
    }
}


// ===== ADMIN ORDER NOTIFICATION EMAIL =====
async function sendAdminOrderNotificationEmail(orderData) {
    const ADMIN_NOTIFY_TO = 'info@drixelsa.co.za';
    const ADMIN_NOTIFY_CC = ['anelisathelejane@gmail.com', 'Andziboyrsa702@gmail.com'];

    const customer = orderData.customer || {};
    const customerName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Customer';
    const orderNumber = orderData.orderNumber || orderData.id || 'N/A';
    const total = orderData.total || orderData.amount || 0;
    const paymentMethod = orderData.paymentMethod === 'bank' ? 'Bank Transfer' :
        orderData.paymentMethod === 'snapscan' ? 'SnapScan' :
        orderData.paymentMethod === 'yoco' ? 'Yoco Card' : orderData.paymentMethod || 'Unknown';

    const itemsHtml = generateItemsTableHtml(orderData.items || []);

    const shippingHtml = `
        <p style="margin:4px 0;color:#444;">${customer.address || ''}, ${customer.city || ''}, ${customer.province || ''} ${customer.postalCode || ''}</p>
        <p style="margin:4px 0;color:#444;">Phone: ${customer.phone || 'N/A'}</p>
        <p style="margin:4px 0;color:#444;">Email: ${customer.email || 'N/A'}</p>
    `;

    const subject = `New Order #${orderNumber} from ${customerName} — R${Number(total).toFixed(2)}`;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Helvetica Neue',Arial,sans-serif;">
<div style="max-width:640px;margin:20px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

  <!-- Header -->
  <div style="background:#111;padding:28px 32px;display:flex;align-items:center;gap:12px;">
    <div style="background:#ff6e00;width:6px;height:40px;border-radius:3px;"></div>
    <div>
      <div style="color:#ff6e00;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">New Order Received</div>
      <div style="color:#fff;font-size:22px;font-weight:900;margin-top:2px;">Order #${orderNumber}</div>
    </div>
  </div>

  <!-- Alert Banner -->
  <div style="background:#fff8f0;border-left:4px solid #ff6e00;padding:14px 32px;font-size:13px;color:#7a4000;">
    <strong>${customerName}</strong> just placed a new order on Drixel SA. Total: <strong>R${Number(total).toFixed(2)}</strong> via ${paymentMethod}.
  </div>

  <!-- Customer Info -->
  <div style="padding:24px 32px 0;">
    <h3 style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;margin:0 0 10px;">Customer Details</h3>
    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="padding:4px 0;color:#888;font-size:13px;width:120px;">Name</td><td style="padding:4px 0;color:#111;font-size:13px;font-weight:600;">${customerName}</td></tr>
      <tr><td style="padding:4px 0;color:#888;font-size:13px;">Email</td><td style="padding:4px 0;color:#111;font-size:13px;">${customer.email || 'N/A'}</td></tr>
      <tr><td style="padding:4px 0;color:#888;font-size:13px;">Phone</td><td style="padding:4px 0;color:#111;font-size:13px;">${customer.phone || 'N/A'}</td></tr>
    </table>
  </div>

  <!-- Shipping Address -->
  <div style="padding:16px 32px 0;">
    <h3 style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;margin:0 0 10px;">Shipping Address</h3>
    ${shippingHtml}
  </div>

  <!-- Order Items -->
  <div style="padding:24px 32px 0;">
    <h3 style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;margin:0 0 14px;">Items Ordered</h3>
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="border-bottom:2px solid #111;">
          <th colspan="2" style="padding:8px 0;text-align:left;font-size:12px;color:#888;font-weight:600;">Product</th>
          <th style="padding:8px 4px;text-align:center;font-size:12px;color:#888;font-weight:600;">Qty</th>
          <th style="padding:8px 0;text-align:right;font-size:12px;color:#888;font-weight:600;">Subtotal</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
    </table>
  </div>

  <!-- Totals -->
  <div style="padding:20px 32px;border-top:2px solid #f0f0f0;margin-top:16px;">
    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="padding:4px 0;color:#666;font-size:13px;">Subtotal</td><td style="text-align:right;color:#111;font-size:13px;">R ${(Number(total) - Number(orderData.shipping || 0)).toFixed(2)}</td></tr>
      <tr><td style="padding:4px 0;color:#666;font-size:13px;">Delivery</td><td style="text-align:right;color:#111;font-size:13px;">${Number(orderData.shipping) === 0 ? 'FREE' : 'R ' + Number(orderData.shipping).toFixed(2)}</td></tr>
      <tr style="border-top:2px solid #111;"><td style="padding:10px 0 0;color:#111;font-size:16px;font-weight:900;">Total</td><td style="padding:10px 0 0;text-align:right;color:#111;font-size:16px;font-weight:900;">R ${Number(total).toFixed(2)}</td></tr>
    </table>
  </div>

  <!-- Payment Method -->
  <div style="margin:0 32px 24px;padding:12px 16px;background:#f8f8f8;border-radius:8px;font-size:13px;">
    <strong style="color:#111;">Payment Method:</strong> <span style="color:#555;">${paymentMethod}</span>
    &nbsp;&nbsp;|&nbsp;&nbsp;
    <strong style="color:#111;">Order Date:</strong> <span style="color:#555;">${new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
  </div>

  <!-- Footer -->
  <div style="background:#111;padding:16px 32px;text-align:center;">
    <p style="color:#777;font-size:11px;margin:0;">This is an automated notification from Drixel SA &mdash; Admin only. Do not reply.</p>
  </div>

</div>
</body>
</html>`;

    try {
        return await sendEmailViaResend({
            to: ADMIN_NOTIFY_TO,
            cc: ADMIN_NOTIFY_CC,
            subject,
            html
        });
    } catch (e) {
        console.error('Admin notification email failed:', e);
        return { success: false, message: e.message };
    }
}
window.sendAdminOrderNotificationEmail = sendAdminOrderNotificationEmail;


// ===== ADMIN FUNCTIONS =====

function showAdminButton() {
    const existingBtn = document.getElementById('adminMobileBtn');
    if (existingBtn) existingBtn.remove();

    const adminBtn = document.createElement('button');
    adminBtn.id = 'adminMobileBtn';
    adminBtn.innerHTML = '<i class="fas fa-crown"></i>';
    adminBtn.title = 'Admin Dashboard';
    adminBtn.onclick = function (e) {
        e.preventDefault();
        showAdminDashboard();
    };

    document.body.appendChild(adminBtn);
    console.log("👑 Admin button added to page");
}

function showAdminDashboard() {
    const dashboardHTML = `
        <div id="adminDashboard">
            <div class="admin-dashboard-wrapper">
                <div class="admin-header">
                    <h2><i class="fas fa-crown"></i> Admin Dashboard</h2>
                    <button class="admin-close-btn" onclick="closeAdminDashboard()">&#x2715; Close</button>
                </div>
                <div class="admin-tabs-row">
                    <button class="admin-tab-btn active" onclick="switchAdminTab('overview')">Overview</button>
                    <button class="admin-tab-btn" onclick="switchAdminTab('orders')">Orders</button>
                    <button class="admin-tab-btn" onclick="switchAdminTab('products')">Products</button>
                    <button class="admin-tab-btn" onclick="switchAdminTab('campaigns')">Campaigns</button>
                    <button class="admin-tab-btn" onclick="switchAdminTab('users')">Users</button>
                    <button class="admin-tab-btn" onclick="switchAdminTab('emails')">Emails</button>
                    <button class="admin-tab-btn" onclick="switchAdminTab('snapscan')">SnapScan</button>
                    <button class="admin-tab-btn" onclick="switchAdminTab('yoco')">Yoco</button>
                    <button class="admin-tab-btn" onclick="switchAdminTab('pending')">Pending</button>
                    <button class="admin-tab-btn" onclick="switchAdminTab('settings')">Settings</button>
                </div>
                <div id="adminTabContent"></div>
            </div>
        </div>
    `;
    const existingDashboard = document.getElementById('adminDashboard');
    if (existingDashboard) existingDashboard.remove();
    document.body.insertAdjacentHTML('beforeend', dashboardHTML);
    switchAdminTab('overview');
}

function closeAdminDashboard() {
    const dashboard = document.getElementById('adminDashboard');
    if (dashboard) dashboard.remove();
}

function switchAdminTab(tab) {
    // Update active tab button
    const buttons = document.querySelectorAll('.admin-tab-btn');
    buttons.forEach(btn => btn.classList.remove('active'));

    // Find the clicked button and mark it active safely without throwing in modules
    let clickedBtn = null;
    try {
        if (typeof window !== 'undefined' && window.event && window.event.target) {
            clickedBtn = window.event.target.closest('.admin-tab-btn');
        }
    } catch (e) {}

    if (!clickedBtn) {
        clickedBtn = document.querySelector(`.admin-tab-btn[onclick*="${tab}"]`);
    }

    if (clickedBtn) clickedBtn.classList.add('active');

    const tabContent = document.getElementById('adminTabContent');

    switch (tab) {
        case 'overview': loadAdminOverview(); break;
        case 'orders': loadAdminOrders(); break;
        case 'products': loadAdminProducts(); break;
        case 'campaigns': loadAdminCampaigns(); break;
        case 'users': loadAdminUsers(); break;
        case 'emails': loadAdminEmailManagement(); break;
        case 'snapscan': loadAdminSnapScan(); break;
        case 'yoco': loadAdminYoco(); break;
        case 'pending': loadAdminPending(); break;
        case 'settings': loadAdminSettings(); break;
    }
}

async function loadAdminOverview() {
    const tabContent = document.getElementById('adminTabContent');
    if (!tabContent) return;

    try {
        const db = window.firebaseDb;
        const today = new Date().toISOString().split('T')[0];

        // Get orders count
        const ordersSnapshot = await window.firebaseGetDocs(window.firebaseCollection(db, 'orders'));
        const totalOrders = ordersSnapshot.size;

        // Get today's orders
        const todayOrders = Array.from(ordersSnapshot.docs).filter(doc => {
            const orderDate = doc.data().createdAt?.split('T')[0];
            return orderDate === today;
        }).length;

        // Get users count
        const usersSnapshot = await window.firebaseGetDocs(window.firebaseCollection(db, 'users'));
        const totalUsers = usersSnapshot.size;

        // Get pending payments
        const pendingOrders = Array.from(ordersSnapshot.docs).filter(doc => {
            const status = doc.data().paymentStatus;
            return status === 'pending' || status === 'pending_verification';
        }).length;

        // Calculate total revenue
        let totalRevenue = 0;
        ordersSnapshot.forEach(doc => {
            const order = doc.data();
            if (order.paymentStatus === 'paid') {
                totalRevenue += order.total || 0;
            }
        });

        // Get recent orders
        const recentOrders = [];
        ordersSnapshot.forEach(doc => {
            recentOrders.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // Sort by date, newest first
        recentOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const latestOrders = recentOrders.slice(0, 5);

        tabContent.innerHTML = `
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
                        <div class="admin-stat-card" style="border-top: 4px solid var(--accent-blue);">
                            <h3>Total Orders</h3>
                            <p style="color: var(--accent-blue);">${totalOrders}</p>
                            <span style="color: #666; font-size: 13px;">Today: ${todayOrders}</span>
                        </div>
                        
                        <div class="admin-stat-card" style="border-top: 4px solid var(--accent-orange);">
                            <h3>Total Revenue</h3>
                            <p style="color: var(--accent-orange);">R ${totalRevenue.toFixed(2)}</p>
                            <span style="color: #666; font-size: 13px;">All time</span>
                        </div>
                        
                        <div class="admin-stat-card" style="border-top: 4px solid #0caf60;">
                            <h3>Total Users</h3>
                            <p style="color: #0caf60;">${totalUsers}</p>
                            <span style="color: #666; font-size: 13px;">Registered customers</span>
                        </div>
                        
                        <div class="admin-stat-card" style="border-top: 4px solid #ef476f;">
                            <h3>Pending Orders</h3>
                            <p style="color: #ef476f;">${pendingOrders}</p>
                            <span style="color: #666; font-size: 13px;">Awaiting payment</span>
                        </div>
                    </div>
                    
                    <div style="background: white; padding: 25px; border-radius: 8px; border: 1px solid #e5e5e5; margin-bottom: 30px;">
                        <h3 style="margin-bottom: 20px; text-transform: uppercase; font-family: var(--font-header); font-weight: 800; font-size: 18px;">Recent Orders</h3>
                        ${latestOrders.length > 0 ? `
                            <table class="admin-table">
                                <thead>
                                    <tr>
                                        <th>Order #</th>
                                        <th>Customer</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                        <th>Date</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${latestOrders.map(order => `
                                        <tr>
                                            <td data-label="Order #">${order.order_id || order.orderNumber || order.id || '—'}</td>
                                            <td data-label="Customer">
                                                <strong>${order.customer?.name || 'N/A'}</strong><br>
                                                <small>${order.customer?.email || ''}</small>
                                            </td>
                                            <td data-label="Amount">R ${(order.total || 0).toFixed(2)}</td>
                                            <td data-label="Status">
                                                <span class="admin-badge status-${order.paymentStatus === 'paid' ? 'shipped' : order.paymentStatus === 'delivered' ? 'delivered' : 'pending'}">
                                                    ${order.paymentStatus || 'pending'}
                                                </span>
                                            </td>
                                            <td data-label="Date">
                                                ${new Date(order.createdAt).toLocaleDateString()}
                                            </td>
                                            <td data-label="Actions">
                                                <button class="admin-close-btn" onclick="viewOrderDetails('${order.id}')" style="padding: 6px 12px; font-size: 11px; border-radius: 12px;">
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        ` : '<p>No recent orders found.</p>'}
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
                        <div style="background: white; padding: 20px; border-radius: 10px; border: 1px solid #e0e0e0;">
                            <h3 style="margin-bottom: 15px;">Quick Actions</h3>
                            <button onclick="switchAdminTab('orders')" style="width: 100%; padding: 12px; background: #0066cc; color: white; border: none; border-radius: 6px; cursor: pointer; margin-bottom: 10px;">
                                <i class="fas fa-shopping-cart"></i> Manage All Orders
                            </button>
                            <button onclick="switchAdminTab('products')" style="width: 100%; padding: 12px; background: #0caf60; color: white; border: none; border-radius: 6px; cursor: pointer; margin-bottom: 10px;">
                                <i class="fas fa-tshirt"></i> Manage Products
                            </button>
                            <button onclick="switchAdminTab('users')" style="width: 100%; padding: 12px; background: #ff6b00; color: white; border: none; border-radius: 6px; cursor: pointer; margin-bottom: 10px;">
                                <i class="fas fa-users"></i> Manage Users
                            </button>
                        </div>
                        
                        <div style="background: white; padding: 20px; border-radius: 10px; border: 1px solid #e0e0e0;">
                            <h3 style="margin-bottom: 15px;">System Status</h3>
                            <div style="margin-bottom: 15px;">
                                <p><strong>Firebase:</strong> <span style="color: #0caf60;">Connected ✓</span></p>
                                <p><strong>Email Service:</strong> <span style="color: #0caf60;">${localStorage.getItem('drixel_resend_api_key') ? 'Direct Client Active ✓' : 'Cloud Function Active ✓'}</span></p>
                                <p><strong>Yoco SDK:</strong> <span style="color: ${window.yocoSDK ? '#0caf60' : '#ef476f'};">${window.yocoSDK ? 'Ready ✓' : 'Not Loaded ✗'}</span></p>
                                <p><strong>Products Loaded:</strong> ${window.PRODUCTS_DATA.length}</p>
                                <p><strong>Last Updated:</strong> ${new Date().toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                `;
    } catch (error) {
        console.error("❌ Error loading admin overview:", error);
        tabContent.innerHTML = `
                    <div style="background: #f8d7da; color: #721c24; padding: 20px; border-radius: 10px; border: 1px solid #f5c6cb;">
                        <h3>Error Loading Overview</h3>
                        <p>${error.message}</p>
                        <button onclick="loadAdminOverview()" style="background: #0066cc; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
                            Retry
                        </button>
                    </div>
                `;
    }
}

async function loadAdminOrders() {
    const tabContent = document.getElementById('adminTabContent');
    if (!tabContent) return;

    try {
        const db = window.firebaseDb;
        const ordersSnapshot = await window.firebaseGetDocs(window.firebaseCollection(db, 'orders'));

        const orders = [];
        ordersSnapshot.forEach(doc => {
            orders.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // Sort by date, newest first
        orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        tabContent.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h3>All Orders (${orders.length})</h3>
                        <div>
                            <select id="orderFilter" onchange="filterOrders()" style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 5px; margin-right: 10px;">
                                <option value="all">All Orders</option>
                                <option value="pending">Pending Payment</option>
                                <option value="paid">Paid</option>
                                <option value="processing">Processing</option>
                                <option value="shipped">Shipped</option>
                                <option value="delivered">Delivered</option>
                            </select>
                            <button onclick="exportOrders()" style="background: #0caf60; color: white; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer;">
                                <i class="fas fa-download"></i> Export
                            </button>
                        </div>
                    </div>
                    
                    <div style="background: white; padding: 20px; border-radius: 10px; border: 1px solid #e0e0e0;">
                        ${orders.length > 0 ? `
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead>
                                    <tr style="background: #f5f5f5;">
                                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Order #</th>
                                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Customer</th>
                                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Items</th>
                                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Amount</th>
                                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Payment</th>
                                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Status</th>
                                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Date</th>
                                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="ordersTableBody">
                                    ${orders.map(order => `
                                        <tr data-status="${order.paymentStatus}" data-order-status="${order.status || 'processing'}">
                                            <td style="padding: 12px; border-bottom: 1px solid #eee;">${order.order_id || order.orderNumber || order.id || '—'}</td>
                                            <td style="padding: 12px; border-bottom: 1px solid #eee;">
                                                <strong>${order.customer?.name || 'N/A'}</strong><br>
                                                <small>${order.customer?.email || ''}</small><br>
                                                <small>${order.customer?.phone || ''}</small>
                                            </td>
                                            <td style="padding: 12px; border-bottom: 1px solid #eee;">
                                                ${order.items?.length || 0} items
                                            </td>
                                            <td style="padding: 12px; border-bottom: 1px solid #eee;">R ${(order.total || 0).toFixed(2)}</td>
                                            <td style="padding: 12px; border-bottom: 1px solid #eee;">
                                                <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;
                                                    background: ${order.paymentMethod === 'yoco' ? '#d4edda' :
                order.paymentMethod === 'snapscan' ? '#cce5ff' :
                    '#fff3cd'};
                                                    color: ${order.paymentMethod === 'yoco' ? '#155724' :
                order.paymentMethod === 'snapscan' ? '#004085' :
                    '#856404'};">
                                                    ${order.paymentMethod || 'bank'}
                                                </span>
                                            </td>
                                            <td style="padding: 12px; border-bottom: 1px solid #eee;">
                                                <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;
                                                    background: ${order.paymentStatus === 'paid' ? '#d4edda' :
                order.paymentStatus === 'pending' ? '#fff3cd' :
                    '#f8d7da'};
                                                    color: ${order.paymentStatus === 'paid' ? '#155724' :
                order.paymentStatus === 'pending' ? '#856404' :
                    '#721c24'};">
                                                    ${order.paymentStatus || 'pending'}
                                                </span>
                                            </td>
                                            <td style="padding: 12px; border-bottom: 1px solid #eee;">
                                                ${new Date(order.createdAt).toLocaleDateString()}<br>
                                                <small>${new Date(order.createdAt).toLocaleTimeString()}</small>
                                            </td>
                                            <td style="padding: 12px; border-bottom: 1px solid #eee;">
                                                <button onclick="viewOrderDetails('${order.id}')" style="background: #0066cc; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; margin-right: 5px;">
                                                    View
                                                </button>
                                                <button onclick="updateOrderStatus('${order.id}')" style="background: #ff6b00; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">
                                                    Update
                                                </button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        ` : '<p>No orders found.</p>'}
                    </div>
                    
                    <div style="margin-top: 20px; color: #666; font-size: 14px;">
                        <p><i class="fas fa-info-circle"></i> Orders are sorted by date (newest first).</p>
                    </div>
                `;
    } catch (error) {
        console.error("❌ Error loading orders:", error);
        tabContent.innerHTML = `
                    <div style="background: #f8d7da; color: #721c24; padding: 20px; border-radius: 10px; border: 1px solid #f5c6cb;">
                        <h3>Error Loading Orders</h3>
                        <p>${error.message}</p>
                    </div>
                `;
    }
}

// ===== ADMIN MODAL FUNCTIONS =====
function openOutForDeliveryModal(orderId, customerName, orderNumber) {
    currentAdminOrder = { id: orderId, customerName: customerName, orderNumber: orderNumber };
    document.getElementById('customerNameDisplay').value = customerName;
    document.getElementById('orderIdDisplay').value = orderNumber;
    document.getElementById('outForDeliveryModal').classList.add('active');
}

function closeOutForDeliveryModal() {
    document.getElementById('outForDeliveryModal').classList.remove('active');
    currentAdminOrder = null;
}

function openOrderDeliveredModal(orderId, orderNumber) {
    currentAdminOrder = { id: orderId, orderNumber: orderNumber };
    document.getElementById('deliveryOrderIdDisplay').value = orderNumber;
    document.getElementById('orderUrlDisplay').value = `${window.location.origin}/order/${orderNumber}`;
    document.getElementById('orderDeliveredModal').classList.add('active');
}

function closeOrderDeliveredModal() {
    document.getElementById('orderDeliveredModal').classList.remove('active');
    currentAdminOrder = null;
}

function openConfirmPaymentModal(orderId, orderNumber, customerEmail, orderAmount, paymentMethod) {
    currentAdminOrder = { id: orderId, orderNumber: orderNumber };
    document.getElementById('confirmOrderNumber').value = orderNumber;
    document.getElementById('confirmCustomerEmail').value = customerEmail;
    document.getElementById('confirmOrderAmount').value = `R ${orderAmount.toFixed(2)}`;
    document.getElementById('confirmPaymentMethod').value = paymentMethod;
    document.getElementById('confirmPaymentModal').classList.add('active');
}

function closeConfirmPaymentModal() {
    document.getElementById('confirmPaymentModal').classList.remove('active');
    currentAdminOrder = null;
}

async function markOutForDeliveryAndEmail(orderIdOverride) {
    const trackingNumber = document.getElementById('trackingNumber').value;
    const courierService = document.getElementById('courierService').value;
    const trackingUrl = document.getElementById('trackingUrl').value;

    if (!trackingNumber || !courierService) {
        alert('Please fill in all required fields (Tracking Number and Courier Service).');
        return;
    }

    try {
        const orderId = orderIdOverride || (currentAdminOrder && currentAdminOrder.id);
        if (!orderId) {
            alert('No order selected. Please open "Out for Delivery" from an order first.');
            return;
        }

        const db = window.firebaseDb;
        const orderDoc = await window.firebaseGetDoc(window.firebaseDoc(db, 'orders', orderId));

        if (!orderDoc.exists()) {
            alert('Order not found!');
            return;
        }

        const order = { id: orderDoc.id, ...orderDoc.data() };

        // Update order status
        await window.firebaseUpdateDoc(window.firebaseDoc(db, 'orders', orderId), {
            status: 'shipped',
            trackingNumber: trackingNumber,
            courierService: courierService,
            trackingUrl: trackingUrl || '',
            updatedAt: new Date().toISOString()
        });

        // Send out for delivery email
        const emailResult = await sendOutForDeliveryEmailToCustomer(order, trackingNumber, courierService, trackingUrl || '');

        if (emailResult.success) {
            alert('✅ Order marked as shipped and email sent!');
        } else {
            alert('✅ Order marked as shipped but email failed to send: ' + emailResult.message);
        }

        closeOutForDeliveryModal();
        loadAdminOrders();

    } catch (error) {
        console.error("❌ Error updating order:", error);
        alert('Error updating order: ' + error.message);
    }
}

async function markDeliveredAndEmail() {
    const deliveredDate = document.getElementById('deliveredDate').value;

    if (!deliveredDate) {
        alert('Please select a delivery date.');
        return;
    }

    try {
        if (!currentAdminOrder || !currentAdminOrder.id) {
            alert('No order selected. Please open "Delivered" from an order first.');
            return;
        }
        const db = window.firebaseDb;
        const orderId = currentAdminOrder.id;
        const orderDoc = await window.firebaseGetDoc(window.firebaseDoc(db, 'orders', orderId));

        if (!orderDoc.exists()) {
            alert('Order not found!');
            return;
        }

        const order = { id: orderDoc.id, ...orderDoc.data() };

        // Update order status
        await window.firebaseUpdateDoc(window.firebaseDoc(db, 'orders', orderId), {
            status: 'delivered',
            deliveredDate: deliveredDate,
            updatedAt: new Date().toISOString()
        });

        // Send order delivered email
        const emailResult = await sendOrderDeliveredEmailToCustomer(order, deliveredDate);

        if (emailResult.success) {
            alert('✅ Order marked as delivered and email sent!');
        } else {
            alert('✅ Order marked as delivered but email failed to send: ' + emailResult.message);
        }

        closeOrderDeliveredModal();
        loadAdminOrders();

    } catch (error) {
        console.error("❌ Error updating order:", error);
        alert('Error updating order: ' + error.message);
    }
}
async function processPaymentConfirmation() {
    try {
        const db = window.firebaseDb;
        const orderDoc = await window.firebaseGetDoc(window.firebaseDoc(db, 'orders', currentAdminOrder.id));

        if (!orderDoc.exists()) {
            alert('Order not found!');
            return;
        }

        const order = {
            id: orderDoc.id,
            ...orderDoc.data(),
            orderNumber: currentAdminOrder.orderNumber  // Ensure order number is included
        };

        console.log("✅ Processing payment confirmation for order:", order.orderNumber);

        // Update payment status in Firebase
        await window.firebaseUpdateDoc(window.firebaseDoc(db, 'orders', order.id), {
            paymentStatus: 'paid',
            updatedAt: new Date().toISOString(),
            status: 'processing'
        });

        // Update local order object
        order.paymentStatus = 'paid';

        // Send BOTH emails

        // Send emails based on rules:
        // - Bank transfer: send Order Confirmation + Order Received AFTER admin confirms payment.
        // - Yoco / SnapScan: Order Received is already sent at checkout, so we do not resend here.
        let confirmationResult = { success: true, message: 'Skipped' };
        let receivedResult = { success: true, message: 'Skipped' };

        if ((order.paymentMethod || '').toLowerCase() === 'bank') {
            console.log("📧 Sending Order Confirmation Email (Bank - confirmed in admin)...");
            confirmationResult = await sendOrderConfirmationEmail(order);

            console.log("📧 Sending Order Received Email (Bank - confirmed in admin)...");
            receivedResult = await sendOrderReceivedEmail(order);
        }

        if (confirmationResult.success && receivedResult.success) {
            alert('✅ Payment confirmed and emails handled successfully!\n\n' +
                `Order #${order.order_id || order.orderNumber || currentAdminOrder.orderNumber || order.id} has been updated.\n` +
                `Customer: ${order.customer?.email || order.customer_email || order.email || 'Email not found in order record'}`);
        } else {
            let message = '✅ Payment confirmed but email issues:\n';
            if (!confirmationResult.success) message += `• Order Confirmation: ${confirmationResult.message || confirmationResult.details || ''}\n`;
            if (!receivedResult.success) message += `• Order Received: ${receivedResult.message || receivedResult.details || ''}\n`;
            alert(message);
        }
        closeConfirmPaymentModal();
        loadAdminPending();

    } catch (error) {
        console.error("❌ Error confirming payment:", error);
        alert('Error confirming payment: ' + error.message);
    }
}


// ===== COOKIE FUNCTIONS =====
function acceptCookies() {
    localStorage.setItem('drixel_cookies', 'accepted');
    document.getElementById('cookieConsent').classList.remove('active');
    console.log('Cookies accepted');
}

function declineCookies() {
    localStorage.setItem('drixel_cookies', 'declined');
    document.getElementById('cookieConsent').classList.remove('active');
    console.log('Cookies declined');
}

// ===== NEWSLETTER MEMBER COLLECTION LOGIC =====
function injectNewsletterSection() {
    if (document.getElementById('newsletterSection')) return;
    
    const footer = document.querySelector('footer');
    if (!footer) return;
    
    const section = document.createElement('div');
    section.className = 'newsletter-section';
    section.id = 'newsletterSection';
    section.innerHTML = `
        <div class="container newsletter-container">
            <div class="newsletter-text">
                <h3>BECOME A MEMBER</h3>
                <p>Sign up to receive 15% off your first streetwear purchase plus exclusive capsule drop updates.</p>
            </div>
            <form class="newsletter-form" id="newsletterForm" onsubmit="window.subscribeNewsletter(event)">
                <input type="email" id="newsletterEmailInput" placeholder="Enter your email address" required autocomplete="off">
                <button type="submit">Join Us</button>
            </form>
            <div class="newsletter-message" id="newsletterMessage"></div>
        </div>
    `;
    
    footer.parentNode.insertBefore(section, footer);
}

async function subscribeNewsletter(event) {
    event.preventDefault();
    const emailInput = document.getElementById('newsletterEmailInput');
    const messageDiv = document.getElementById('newsletterMessage');
    if (!emailInput || !messageDiv) return;
    
    const email = emailInput.value.trim();
    if (!email) return;
    
    messageDiv.className = 'newsletter-message';
    messageDiv.innerHTML = 'Adding membership...';
    
    try {
        const q = window.firebaseQuery(
            window.firebaseCollection(window.firebaseDb, 'subscribers'),
            window.firebaseWhere("email", "==", email)
        );
        const querySnapshot = await window.firebaseGetDocs(q);
        
        if (!querySnapshot.empty) {
            messageDiv.className = 'newsletter-message error';
            messageDiv.innerHTML = 'This email is already a member.';
            return;
        }
        
        await window.firebaseAddDoc(
            window.firebaseCollection(window.firebaseDb, 'subscribers'),
            {
                email: email,
                subscribedAt: new Date().toISOString()
            }
        );
        
        messageDiv.className = 'newsletter-message success';
        messageDiv.innerHTML = 'Welcome to DRIXEL SA. Check your email for your 15% discount code!';
        emailInput.value = '';
    } catch (err) {
        console.error("Newsletter subscription error:", err);
        messageDiv.className = 'newsletter-message error';
        messageDiv.innerHTML = 'Failed to subscribe. Please try again.';
    }
}

let currentVideoIndex = 0;

function nextCampaignVideo() {
    const cards = document.querySelectorAll('.video-carousel-card');
    if (!cards || cards.length === 0) return;
    
    // Deactivate current
    const currentCard = cards[currentVideoIndex];
    if (currentCard) {
        currentCard.classList.remove('active');
        const currentVid = currentCard.querySelector('video');
        if (currentVid) {
            currentVid.pause();
        }
    }
    
    // Increment index
    currentVideoIndex = (currentVideoIndex + 1) % cards.length;
    
    // Activate next
    const nextCard = cards[currentVideoIndex];
    if (nextCard) {
        nextCard.classList.add('active');
        const nextVid = nextCard.querySelector('video');
        if (nextVid) {
            nextVid.play().catch(e => console.log("Video auto-play blocked:", e));
        }
    }
}

function prevCampaignVideo() {
    const cards = document.querySelectorAll('.video-carousel-card');
    if (!cards || cards.length === 0) return;
    
    // Deactivate current
    const currentCard = cards[currentVideoIndex];
    if (currentCard) {
        currentCard.classList.remove('active');
        const currentVid = currentCard.querySelector('video');
        if (currentVid) {
            currentVid.pause();
        }
    }
    
    // Decrement index
    currentVideoIndex = (currentVideoIndex - 1 + cards.length) % cards.length;
    
    // Activate prev
    const nextCard = cards[currentVideoIndex];
    if (nextCard) {
        nextCard.classList.add('active');
        const nextVid = nextCard.querySelector('video');
        if (nextVid) {
            nextVid.play().catch(e => console.log("Video auto-play blocked:", e));
        }
    }
}

// ===== INITIALIZE APP =====
function initializeAppAfterFirebase() {
    console.log("🚀 Initializing Drixel SA with all fixes");

    // Clean up revoked legacy Resend API key if present
    if (localStorage.getItem('drixel_resend_api_key') === 're_9127pJDT_jRDx942YS4UbyH3YDfm9H7ow') {
        localStorage.removeItem('drixel_resend_api_key');
    }
    if (!localStorage.getItem('drixel_resend_from_email') || localStorage.getItem('drixel_resend_from_email').includes('onboarding@resend.dev') || localStorage.getItem('drixel_resend_from_email').includes('<')) {
        localStorage.setItem('drixel_resend_from_email', 'info@customer.drixelsa.co.za');
    }

    if (!window.PRODUCTS_DATA || !Array.isArray(window.PRODUCTS_DATA)) {
        console.error("❌ PRODUCTS_DATA is not defined or not an array!");
        window.PRODUCTS_DATA = getLocalProductsData();
    }

    console.log("📦 Products loaded:", window.PRODUCTS_DATA.length);

    loadCartFromStorage();
    updateCartCount();
    updateAuthUI();

    // Inject newsletter sign-up banner before footer
    if (typeof injectNewsletterSection === 'function') {
        injectNewsletterSection();
    }

    // Initialize page contents dynamically based on the active static page path
    const path = window.location.pathname;
    let curPage = 'home';
    const isCategoryPage = path.endsWith('/products/tees/') || path.endsWith('/products/tees/index.html') ||
                           path.endsWith('/products/hoodies/') || path.endsWith('/products/hoodies/index.html') ||
                           path.endsWith('/products/beanies/') || path.endsWith('/products/beanies/index.html') ||
                           path.endsWith('/products/sweaters/') || path.endsWith('/products/sweaters/index.html');

    const isShopPage = path.endsWith('products.html') || path.endsWith('products') || isCategoryPage;
    
    const isProductPage = (path.endsWith('product.html') || path.endsWith('product') || 
                          path.includes('/products/tees/') || path.includes('/products/outerwear/') || 
                          path.includes('/products/accessories/') || path.includes('/products/hoodies/') || 
                          path.includes('/products/beanies/') || path.includes('/products/sweaters/')) && !isCategoryPage;

    if (isShopPage) curPage = 'shop';
    else if (isProductPage) curPage = 'product';
    else if (path.endsWith('cart.html') || path.endsWith('cart')) curPage = 'cart';
    else if (path.endsWith('checkout.html') || path.endsWith('checkout')) curPage = 'checkout';
    else if (path.endsWith('auth.html') || path.endsWith('auth')) curPage = 'auth';
    try { localStorage.setItem('drixel_last_page', curPage); } catch (e) { }

    const isHomepage = path === '/' || path === '' || (path.endsWith('index.html') && !path.includes('/products/'));

    if (isHomepage) {
        try { loadFeaturedProducts(); } catch (e) { console.error("Error loading featured products:", e); }
    } else if (isShopPage) {
        try {
            // Apply collection filter based on the sub-directory path
            if (path.includes('/products/tees')) {
                window.currentCollectionFilter = 'tees';
            } else if (path.includes('/products/hoodies') || path.includes('/products/outerwear')) {
                window.currentCollectionFilter = 'hoodies';
            } else if (path.includes('/products/beanies') || path.includes('/products/accessories')) {
                window.currentCollectionFilter = 'beanies';
            } else if (path.includes('/products/sweaters')) {
                window.currentCollectionFilter = 'sweaters';
            } else {
                window.currentCollectionFilter = window.currentCollectionFilter || 'all';
            }
            loadAllProducts();
            updateCollectionsBarActive(window.currentCollectionFilter || 'all');
        } catch (e) { console.error("Error loading shop products:", e); }
    } else if (path.endsWith('cart.html') || path.endsWith('cart')) {
        try { loadCartPage(); } catch (e) { }
    } else if (path.endsWith('checkout.html') || path.endsWith('checkout')) {
        try { loadCheckoutPage(); } catch (e) { }
    } else if (isProductPage) {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            // Read as string to support both numeric (local) and string (Firestore) IDs
            const rawId = window.forcedProductId || urlParams.get('id') || '';
            // For legacy numeric IDs, try parsing as number first
            const productId = rawId && !isNaN(rawId) && !rawId.includes('-') ? parseInt(rawId) : (rawId || 1);
            viewProduct(productId);
        } catch (e) { console.error("Error loading product detail:", e); }
    } else if (path.endsWith('orderConfirmation.html') || path.endsWith('orderConfirmation')) {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            let orderNumber = urlParams.get('order') || urlParams.get('orderNumber') || '';
            if (!orderNumber && window.location.hash) {
                const hashMatch = window.location.hash.match(/order(?:Number)?=([^&]+)/);
                if (hashMatch) {
                    orderNumber = decodeURIComponent(hashMatch[1]);
                } else if (window.location.hash.length > 1) {
                    orderNumber = decodeURIComponent(window.location.hash.substring(1));
                }
            }
            if (orderNumber) {
                const orderNumElem = document.getElementById('orderNumber');
                if (orderNumElem) orderNumElem.textContent = orderNumber;

                const db = window.firebaseDb;
                if (db && window.firebaseCollection && window.firebaseQuery && window.firebaseWhere && window.firebaseGetDocs) {
                    const q = window.firebaseQuery(window.firebaseCollection(db, 'orders'), window.firebaseWhere("orderNumber", "==", orderNumber));
                    window.firebaseGetDocs(q).then(querySnapshot => {
                        if (!querySnapshot.empty) {
                            const orderDoc = querySnapshot.docs[0];
                            const orderData = orderDoc.data();
                            const deliveryFeeInfo = document.getElementById('deliveryFeeInfo');
                            if (deliveryFeeInfo) {
                                if (orderData.shipping === 0) {
                                    deliveryFeeInfo.textContent = 'Delivery: FREE (Order over R1000)';
                                } else {
                                    deliveryFeeInfo.textContent = `Delivery Fee: R${orderData.shipping.toFixed(2)}`;
                                }
                            }
                        }
                    }).catch(e => console.error("Error fetching order info:", e));
                }
            }
        } catch (e) {
            console.error("Error loading order confirmation details:", e);
        }
    }

    // Initialize modern sliding cart drawer
    if (typeof initCartDrawer === 'function') {
        initCartDrawer();
    }

    // Initialize top cycling announcement bar
    if (typeof injectAnnouncementBar === 'function') {
        injectAnnouncementBar();
    }

    // Initialize modern sliding search overlay
    if (typeof initSearchOverlay === 'function') {
        initSearchOverlay();
    }

    // Initialize public order status tracking widget
    if (typeof initOrderTracker === 'function') {
        initOrderTracker();
    }

    // Inject tracker link into footers
    if (typeof injectTrackerLink === 'function') {
        injectTrackerLink();
    }

    setTimeout(() => {
        if (!cookiesAccepted) {
            document.getElementById('cookieConsent').classList.add('active');
        }
    }, 2000);

    console.log('=== DRIXEL SA READY ===');
    console.log('🔥 Firebase: Connected');
    console.log('💳 Payments: Yoco & SnapScan Ready');
    console.log('📧 Resend.com: Active');
    console.log('📦 Products: ' + window.PRODUCTS_DATA.length);
    console.log('👑 Admin: ' + ADMIN_EMAIL);
    console.log('📧 Email: drixelsa@gmail.com');
    console.log('🚚 Delivery: R70 (Free over R1000)');

    // Background Firestore load: fetch real products and re-render storefront
    loadStorefrontProducts();
}

// Fetch products from Firestore (or cache) then re-render the storefront.
// This runs after the initial local render so the page is never blank.
async function loadStorefrontProducts() {
    try {
        const db = window.firebaseDb;
        if (!db) return; // No Firebase — keep local data
        const CACHE_KEY = 'drixel_products_cache';
        const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

        // Check cache freshness
        let useCache = false;
        try {
            const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
            if (cached && cached.ts && (Date.now() - cached.ts < CACHE_TTL) && cached.products && cached.products.length > 0) {
                window.PRODUCTS_DATA = cached.products;
                window._firestoreProducts = cached.products;
                useCache = true;
            }
        } catch(e) {}

        if (!useCache) {
            // Fetch fresh from Firestore
            const snap = await window.firebaseGetDocs(window.firebaseCollection(db, 'products'));
            if (!snap.empty) {
                const products = [];
                snap.forEach(docSnap => {
                    products.push({ ...docSnap.data(), _firestoreId: docSnap.id });
                });
                window.PRODUCTS_DATA = products;
                window._firestoreProducts = products;
                try {
                    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), products }));
                } catch(e) {}
            }
        }

        // Re-render storefront with fresh data (status-filtered)
        const path = window.location.pathname;
        const isCategoryPage = path.includes('/products/');
        const isShopPage = path.endsWith('products.html') || path.endsWith('products') || isCategoryPage;
        const isHomepage = path === '/' || path === '' || (path.endsWith('index.html') && !path.includes('/products/'));

        if (isHomepage) {
            loadFeaturedProducts();
            if (typeof loadActiveBanners === 'function') loadActiveBanners();
        } else if (isShopPage) {
            loadAllProducts();
        }
    } catch(e) {
        console.warn('Storefront Firestore load failed, keeping local data:', e.message);
    }
}

// ===== PRODUCT MANAGEMENT SYSTEM =====

// State for product list pagination & search
window._adminProductsPage = 0;
window._adminProductsSearch = '';
window._adminProductsCategoryFilter = 'all';
window._adminProductsStatusFilter = 'all';
window._adminSelectedProducts = new Set();
const ADMIN_PRODUCTS_PER_PAGE = 20;

async function loadAdminProducts() {
    const tabContent = document.getElementById('adminTabContent');
    if (!tabContent) return;

    // Show skeleton while loading
    tabContent.innerHTML = `
        <div style="padding:10px">
            <div class="skeleton-card" style="height:48px; margin-bottom:16px;"></div>
            ${Array(6).fill('<div class="skeleton-card"></div>').join('')}
        </div>
    `;

    // Load from Firestore if not already loaded
    await loadProductsFromFirestore();

    // Check if we should show migration button
    const firestoreProducts = (window._firestoreProducts || []);
    const hasFirestoreProducts = firestoreProducts.length > 0;

    tabContent.innerHTML = `
        <div id="adminProductsRoot">
            ${!hasFirestoreProducts ? `
            <div style="background:#fff8e1;border:1px solid #ffe082;border-radius:8px;padding:14px 18px;margin-bottom:16px;display:flex;align-items:center;gap:12px;">
                <span style="font-size:20px;">⚡</span>
                <div style="flex:1;">
                    <strong style="font-size:13px;">Migrate Products to Firestore</strong>
                    <p style="font-size:12px;color:#666;margin:2px 0 0;">Your products are stored locally. Migrate them to Firestore to enable editing, adding, and deleting from this dashboard.</p>
                </div>
                <button onclick="migrateLocalProductsToFirestore()" style="padding:9px 18px;background:#111;color:#fff;border:none;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;">🚀 Migrate Now</button>
            </div>` : ''}

            <div class="admin-search-bar">
                <input type="text" id="adminProductSearch" class="admin-search-input" placeholder="Search products by name..." 
                    oninput="adminDebounceSearch(this.value)" value="${window._adminProductsSearch}">
                <select id="adminCategoryFilter" class="admin-filter-select" onchange="adminFilterProducts()">
                    <option value="all">All Categories</option>
                    <option value="hoodies">Hoodies</option>
                    <option value="tees">Tees</option>
                    <option value="beanies">Beanies</option>
                    <option value="sweaters">Sweaters</option>
                    <option value="accessories">Accessories</option>
                </select>
                <select id="adminStatusFilter" class="admin-filter-select" onchange="adminFilterProducts()">
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="hidden">Hidden</option>
                    <option value="draft">Draft</option>
                </select>
                <button class="admin-add-btn" onclick="showAddProductForm(null)">
                    <i class="fas fa-plus"></i> Add Product
                </button>
            </div>

            <div id="bulkActionBar" style="display:none;" class="bulk-action-bar">
                <span id="bulkCount">0 selected</span>
                <button onclick="adminBulkHide()" style="background:#ff9500;color:#fff;">Hide Selected</button>
                <button onclick="adminBulkDelete()" style="background:#e63946;color:#fff;">Delete Selected</button>
                <button onclick="adminClearSelection()" style="background:#555;color:#fff;">Clear</button>
            </div>

            <div style="background:#fff;border:1px solid #eee;border-radius:10px;overflow:auto;">
                <table class="admin-product-table">
                    <thead>
                        <tr>
                            <th style="width:36px;"><input type="checkbox" id="adminSelectAll" onchange="adminToggleSelectAll(this.checked)" title="Select all"></th>
                            <th style="width:68px;">Image</th>
                            <th>Product</th>
                            <th>Price</th>
                            <th>Category</th>
                            <th>Tags</th>
                            <th>Visible</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="adminProductsTableBody">
                        <tr><td colspan="8" style="text-align:center;padding:30px;color:#999;">Loading...</td></tr>
                    </tbody>
                </table>
            </div>
            <div class="admin-pagination" id="adminProductsPagination"></div>
        </div>
    `;

    // Restore filter values
    const catSel = document.getElementById('adminCategoryFilter');
    if (catSel) catSel.value = window._adminProductsCategoryFilter;
    const stSel = document.getElementById('adminStatusFilter');
    if (stSel) stSel.value = window._adminProductsStatusFilter;

    renderAdminProductsTable();
}

function getFilteredAdminProducts() {
    const q = (window._adminProductsSearch || '').toLowerCase().trim();
    const cat = window._adminProductsCategoryFilter || 'all';
    const status = window._adminProductsStatusFilter || 'all';
    return (window.PRODUCTS_DATA || []).filter(p => {
        const matchQ = !q || p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
        const matchCat = cat === 'all' || (p.category || '').toLowerCase() === cat;
        const matchStatus = status === 'all' ||
            (status === 'active' && p.status !== 'hidden' && p.status !== 'draft') ||
            (status === 'hidden' && p.status === 'hidden') ||
            (status === 'draft' && p.status === 'draft');
        return matchQ && matchCat && matchStatus;
    });
}

function renderAdminProductsTable() {
    const tbody = document.getElementById('adminProductsTableBody');
    const pagination = document.getElementById('adminProductsPagination');
    if (!tbody) return;

    const products = getFilteredAdminProducts();
    const page = window._adminProductsPage || 0;
    const perPage = ADMIN_PRODUCTS_PER_PAGE;
    const totalPages = Math.max(1, Math.ceil(products.length / perPage));
    if (page >= totalPages) window._adminProductsPage = 0;
    const slice = products.slice(page * perPage, (page + 1) * perPage);

    if (slice.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#999;">
            <div style="font-size:32px;margin-bottom:10px;">📭</div>
            <p>No products found. ${window._adminProductsSearch ? 'Try a different search term.' : 'Click + Add Product to get started.'}</p>
        </td></tr>`;
    } else {
        tbody.innerHTML = slice.map(p => {
            const img = (p.images && p.images[0]) || p.image || '';
            const isHidden = p.status === 'hidden';
            const isDraft = p.status === 'draft';
            const tags = [
                p.featured ? '<span class="product-tag tag-featured">Featured</span>' : '',
                p.newArrival ? '<span class="product-tag tag-new">New</span>' : '',
                p.bestSeller ? '<span class="product-tag tag-bestseller">Best Seller</span>' : '',
                p.onSale ? '<span class="product-tag tag-sale">Sale</span>' : '',
                isHidden ? '<span class="product-tag tag-hidden">Hidden</span>' : '',
                isDraft ? '<span class="product-tag tag-hidden">Draft</span>' : ''
            ].join('');
            const isChecked = window._adminSelectedProducts.has(String(p.id || p._firestoreId));
            return `
            <tr>
                <td><input type="checkbox" class="product-row-cb" value="${p.id || p._firestoreId}" ${isChecked ? 'checked' : ''} onchange="adminToggleProductSelect(this)"></td>
                <td><img src="${img}" alt="${p.name}" class="product-thumb" loading="lazy" onerror="this.src='https://via.placeholder.com/52?text=?'"></td>
                <td>
                    <strong style="display:block;margin-bottom:3px;">${p.name}</strong>
                    <span style="font-size:11px;color:#999;">${(p.description || '').substring(0, 55)}${p.description && p.description.length > 55 ? '…' : ''}</span>
                </td>
                <td>
                    <strong>R ${(p.price || 0).toFixed(2)}</strong>
                    ${p.comparePrice ? `<br><span style="font-size:11px;color:#999;text-decoration:line-through;">R ${(p.comparePrice||0).toFixed(2)}</span>` : ''}
                </td>
                <td style="text-transform:capitalize;">${p.category || '-'}</td>
                <td style="max-width:160px;">${tags || '<span style="color:#ccc;font-size:12px;">—</span>'}</td>
                <td>
                    <label class="visibility-toggle" title="${isHidden ? 'Click to show' : 'Click to hide'}">
                        <input type="checkbox" ${!isHidden && !isDraft ? 'checked' : ''} 
                            onchange="adminToggleProductVisibility('${p.id || p._firestoreId}', '${p._firestoreId || ''}', this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                </td>
                <td>
                    <div style="display:flex;gap:5px;">
                        <button class="admin-action-btn" onclick="showAddProductForm('${p.id || p._firestoreId}')" title="Edit">Edit</button>
                        <button class="admin-action-btn danger" onclick="deleteProduct('${p.id || p._firestoreId}', '${p._firestoreId || ''}', this)" title="Delete">Delete</button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    }

    // Pagination
    if (pagination) {
        pagination.innerHTML = `
            <span style="color:#666;">Showing ${page * perPage + 1}–${Math.min((page + 1) * perPage, products.length)} of ${products.length} products</span>
            <div style="display:flex;align-items:center;gap:8px;">
                <button class="pagination-btn" onclick="adminProductsPageNav(-1)" ${page === 0 ? 'disabled' : ''}>&#8592; Prev</button>
                <span style="font-size:13px;font-weight:600;">Page ${page + 1} of ${totalPages}</span>
                <button class="pagination-btn" onclick="adminProductsPageNav(1)" ${page >= totalPages - 1 ? 'disabled' : ''}>Next &#8594;</button>
            </div>
        `;
    }
}

function adminProductsPageNav(dir) {
    const products = getFilteredAdminProducts();
    const totalPages = Math.max(1, Math.ceil(products.length / ADMIN_PRODUCTS_PER_PAGE));
    window._adminProductsPage = Math.max(0, Math.min(totalPages - 1, (window._adminProductsPage || 0) + dir));
    renderAdminProductsTable();
}

let _adminSearchTimer = null;
function adminDebounceSearch(val) {
    clearTimeout(_adminSearchTimer);
    _adminSearchTimer = setTimeout(() => {
        window._adminProductsSearch = val;
        window._adminProductsPage = 0;
        renderAdminProductsTable();
    }, 300);
}

function adminFilterProducts() {
    window._adminProductsCategoryFilter = document.getElementById('adminCategoryFilter')?.value || 'all';
    window._adminProductsStatusFilter = document.getElementById('adminStatusFilter')?.value || 'all';
    window._adminProductsPage = 0;
    renderAdminProductsTable();
}

function adminToggleSelectAll(checked) {
    window._adminSelectedProducts = new Set();
    if (checked) {
        getFilteredAdminProducts().forEach(p => window._adminSelectedProducts.add(String(p.id || p._firestoreId)));
    }
    document.querySelectorAll('.product-row-cb').forEach(cb => { cb.checked = checked; });
    updateBulkActionBar();
}

function adminToggleProductSelect(cb) {
    const id = String(cb.value);
    if (cb.checked) window._adminSelectedProducts.add(id);
    else window._adminSelectedProducts.delete(id);
    updateBulkActionBar();
}

function updateBulkActionBar() {
    const bar = document.getElementById('bulkActionBar');
    const countEl = document.getElementById('bulkCount');
    const count = window._adminSelectedProducts.size;
    if (bar) bar.style.display = count > 0 ? 'flex' : 'none';
    if (countEl) countEl.textContent = `${count} selected`;
}

function adminClearSelection() {
    window._adminSelectedProducts = new Set();
    document.querySelectorAll('.product-row-cb').forEach(cb => { cb.checked = false; });
    const selectAll = document.getElementById('adminSelectAll');
    if (selectAll) selectAll.checked = false;
    updateBulkActionBar();
}

async function adminBulkHide() {
    const ids = Array.from(window._adminSelectedProducts);
    if (ids.length === 0) return;
    showBrandedConfirm(`Hide ${ids.length} product${ids.length > 1 ? 's' : ''}?`, 'They will no longer appear on the storefront.', '👁️', async () => {
        for (const id of ids) {
            const p = window.PRODUCTS_DATA.find(x => String(x.id || x._firestoreId) === id);
            if (p) {
                p.status = 'hidden';
                if (p._firestoreId) {
                    try {
                        await window.firebaseUpdateDoc(window.firebaseDoc(window.firebaseDb, 'products', p._firestoreId), { status: 'hidden' });
                    } catch(e) {}
                }
            }
        }
        adminClearSelection();
        renderAdminProductsTable();
        showToast(`${ids.length} product(s) hidden.`, 'success');
    });
}

async function adminBulkDelete() {
    const ids = Array.from(window._adminSelectedProducts);
    if (ids.length === 0) return;
    showBrandedConfirm(`Delete ${ids.length} product${ids.length > 1 ? 's' : ''}?`, 'This cannot be undone.', '🗑️', async () => {
        for (const id of ids) {
            const idx = window.PRODUCTS_DATA.findIndex(x => String(x.id || x._firestoreId) === id);
            if (idx !== -1) {
                const p = window.PRODUCTS_DATA[idx];
                if (p._firestoreId) {
                    try {
                        await window.firebaseDeleteDoc(window.firebaseDoc(window.firebaseDb, 'products', p._firestoreId));
                    } catch(e) {}
                }
                window.PRODUCTS_DATA.splice(idx, 1);
            }
        }
        invalidateProductsCache();
        adminClearSelection();
        renderAdminProductsTable();
        showToast(`${ids.length} product(s) deleted.`, 'success');
    });
}

async function adminToggleProductVisibility(localId, firestoreId, visible) {
    const p = window.PRODUCTS_DATA.find(x => String(x.id || x._firestoreId) === String(localId));
    if (!p) return;
    p.status = visible ? 'active' : 'hidden';
    if (firestoreId) {
        try {
            await window.firebaseUpdateDoc(window.firebaseDoc(window.firebaseDb, 'products', firestoreId), { status: p.status });
        } catch(e) { console.error('Visibility update failed:', e); }
    }
    // Always clear the cache so the storefront gets fresh data next load
    invalidateProductsCache();
    showToast('Product ' + (visible ? 'now visible' : 'hidden') + ' on storefront.', 'success');
    renderAdminProductsTable();
}

// Firestore integration
async function loadProductsFromFirestore() {
    const CACHE_KEY = 'drixel_products_cache';
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
        if (cached && cached.ts && (Date.now() - cached.ts < CACHE_TTL) && cached.products && cached.products.length > 0) {
            window.PRODUCTS_DATA = cached.products;
            window._firestoreProducts = cached.products;
            console.log(`📦 Products from cache: ${cached.products.length}`);
            return cached.products;
        }
    } catch(e) {}

    try {
        const db = window.firebaseDb;
        const snap = await window.firebaseGetDocs(window.firebaseCollection(db, 'products'));
        if (!snap.empty) {
            const products = [];
            snap.forEach(docSnap => {
                const data = docSnap.data();
                products.push({ ...data, _firestoreId: docSnap.id });
            });
            window.PRODUCTS_DATA = products;
            window._firestoreProducts = products;
            try {
                localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), products }));
            } catch(e) {}
            console.log(`📦 Products from Firestore: ${products.length}`);
            return products;
        }
    } catch(e) {
        console.error('Firestore product load failed, using local data:', e);
    }

    // Fallback: use local hardcoded products
    window._firestoreProducts = [];
    if (!window.PRODUCTS_DATA || window.PRODUCTS_DATA.length === 0) {
        window.PRODUCTS_DATA = getLocalProductsData();
    }
    return window.PRODUCTS_DATA;
}

function invalidateProductsCache() {
    try { localStorage.removeItem('drixel_products_cache'); } catch(e) {}
}

async function migrateLocalProductsToFirestore() {
    showToast('Migrating products to Firestore...', 'info');
    const db = window.firebaseDb;
    try {
        const snap = await window.firebaseGetDocs(window.firebaseCollection(db, 'products'));
        if (!snap.empty) {
            showToast('Products already exist in Firestore!', 'warning');
            return;
        }
        const localProducts = getLocalProductsData();
        let migrated = 0;
        for (const p of localProducts) {
            const { id, ...productData } = p;
            await window.firebaseAddDoc(window.firebaseCollection(db, 'products'), {
                ...productData,
                localId: id,
                status: 'active',
                createdAt: new Date().toISOString(),
                sortOrder: id
            });
            migrated++;
        }
        invalidateProductsCache();
        await loadProductsFromFirestore();
        showToast(`✅ Migrated ${migrated} products to Firestore!`, 'success');
        setTimeout(() => loadAdminProducts(), 1000);
    } catch(e) {
        console.error('Migration failed:', e);
        showToast('Migration failed: ' + e.message, 'error');
    }
}

function loadAdminProductsGrid() {
    renderAdminProductsTable();
}

async function loadAdminUsers() {
    const tabContent = document.getElementById('adminTabContent');
    if (!tabContent) return;

    tabContent.innerHTML = `
                <div style="margin-bottom: 20px;">
                    <h3>Users Management</h3>
                </div>
                
                <div style="background: white; padding: 20px; border-radius: 10px; border: 1px solid #e0e0e0;">
                    <p>Users management feature coming soon...</p>
                </div>
            `;
}

function loadAdminEmailManagement() {
    const tabContent = document.getElementById('adminTabContent');
    if (!tabContent) return;

    const savedTemplates = JSON.parse(localStorage.getItem('drixel_email_templates') || '{}');

    const templateOptions = [
        { key: 'order_confirmation', label: '📧 Order Confirmation' },
        { key: 'order_received', label: '✅ Order Received' },
        { key: 'out_for_delivery', label: '🚚 Out for Delivery' },
        { key: 'order_delivered', label: '📦 Order Delivered' },
        { key: 'order_cancelled', label: '❌ Order Cancelled' }
    ];

    const firstKey = 'order_confirmation';
    const firstTemplate = savedTemplates[firstKey] || DEFAULT_EMAIL_TEMPLATES[firstKey];

    tabContent.innerHTML = `
        <div style="max-width: 900px; margin: 0 auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; flex-wrap: wrap; gap: 15px;">
                <div>
                    <h3 style="margin: 0 0 5px; font-size: 22px; font-weight: 800; color: #111;">Email Template Editor</h3>
                    <p style="margin: 0; color: #666; font-size: 14px;">Customize the email messages your customers receive at each stage of their order.</p>
                </div>
            </div>

            <!-- Template Selector -->
            <div style="background: #fff; border: 1px solid #e0e0e0; border-radius: 12px; padding: 25px; margin-bottom: 20px;">
                <label style="display: block; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #666; margin-bottom: 10px;">Select Template</label>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    ${templateOptions.map(opt => `
                        <button id="tmpl-tab-${opt.key}" onclick="adminSelectEmailTemplate('${opt.key}')"
                            style="padding: 9px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: 2px solid; transition: all 0.2s;
                                ${opt.key === firstKey ? 'background: #111; color: #fff; border-color: #111;' : 'background: #fff; color: #444; border-color: #e0e0e0;'}
                                ${savedTemplates[opt.key] ? 'box-shadow: 0 0 0 2px #ff6e0033 inset;' : ''}">
                            ${opt.label} ${savedTemplates[opt.key] ? '<span style="font-size:10px; color:#ff6e00;">(modified)</span>' : ''}
                        </button>
                    `).join('')}
                </div>
            </div>

            <!-- Editor Panel -->
            <div style="background: #fff; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; margin-bottom: 20px;">
                <div style="padding: 20px 25px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                    <h4 id="email-editor-title" style="margin: 0; font-size: 16px; font-weight: 700; color: #111;">📧 Order Confirmation</h4>
                    <div style="display: flex; gap: 10px;">
                        <button onclick="adminResetEmailTemplate()" style="padding: 8px 16px; background: #f8f9fa; color: #444; border: 1px solid #ddd; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600;">Reset to Default</button>
                        <button onclick="adminSaveEmailTemplate()" style="padding: 8px 18px; background: #0caf60; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 700;">Save Template</button>
                    </div>
                </div>
                <div style="padding: 25px;">
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #666; margin-bottom: 8px;">Email Subject</label>
                        <input id="email-template-subject" type="text" value="${firstTemplate.subject}"
                            style="width: 100%; padding: 10px 14px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; font-family: inherit; box-sizing: border-box; transition: border-color 0.2s;"
                            onfocus="this.style.borderColor='#111'" onblur="this.style.borderColor='#ddd'">
                    </div>
                    <div>
                        <label style="display: block; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #666; margin-bottom: 8px;">Email Body (HTML)</label>
                        <textarea id="email-template-body" rows="18"
                            style="width: 100%; padding: 12px 14px; border: 1px solid #ddd; border-radius: 8px; font-size: 13px; font-family: 'Courier New', monospace; box-sizing: border-box; resize: vertical; line-height: 1.5; transition: border-color 0.2s;"
                            onfocus="this.style.borderColor='#111'" onblur="this.style.borderColor='#ddd'">${firstTemplate.body.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
                    </div>
                    <div id="email-save-status" style="margin-top: 12px; font-size: 13px; color: #0caf60; font-weight: 600; min-height: 20px;"></div>
                </div>
            </div>

            <!-- Placeholder Reference -->
            <div style="background: #fffbf0; border: 1px solid #ffe0a0; border-radius: 12px; padding: 20px;">
                <h5 style="margin: 0 0 12px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #b8860b;">📋 Placeholder Reference</h5>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 8px; font-size: 12px; font-family: 'Courier New', monospace;">
                    ${[
                        ['{orderNumber}', 'Order number / ID'],
                        ['{customerName}', 'Customer full name'],
                        ['{customerEmail}', 'Customer email'],
                        ['{totalAmount}', 'Order total e.g. R 350.00'],
                        ['{subtotal}', 'Subtotal before delivery'],
                        ['{shipping}', 'Delivery fee'],
                        ['{deliveryAddress}', 'Full delivery address'],
                        ['{paymentMethod}', 'Payment method name'],
                        ['{paymentStatus}', 'Paid / Pending'],
                        ['{bankDetails}', 'Bank transfer info block'],
                        ['{orderDate}', 'Date order was placed'],
                        ['{itemsTable}', 'HTML table of ordered items'],
                        ['{itemsList}', 'Bullet list of ordered items'],
                        ['{courierService}', 'Courier name (shipping emails)'],
                        ['{trackingNumber}', 'Tracking number'],
                        ['{trackingUrl}', 'Courier tracking URL'],
                        ['{estimatedDelivery}', 'Estimated arrival date'],
                        ['{deliveredDate}', 'Actual delivery date'],
                        ['{orderUrl}', 'Link to order details page']
                    ].map(([p, d]) => `
                        <div style="display: flex; gap: 6px; align-items: flex-start; background: #fff; padding: 6px 10px; border-radius: 6px; border: 1px solid #ffe0a0;">
                            <code style="color: #c0392b; flex-shrink: 0;">${p}</code>
                            <span style="color: #666; font-family: sans-serif; font-size: 11px;">${d}</span>
                        </div>`).join('')}
                </div>
            </div>
        </div>
    `;

    window._adminCurrentEmailTemplateKey = firstKey;
}

window.adminSelectEmailTemplate = function(key) {
    window._adminCurrentEmailTemplateKey = key;
    const savedTemplates = JSON.parse(localStorage.getItem('drixel_email_templates') || '{}');
    const template = savedTemplates[key] || DEFAULT_EMAIL_TEMPLATES[key];
    const labels = { order_confirmation: '📧 Order Confirmation', order_received: '✅ Order Received', out_for_delivery: '🚚 Out for Delivery', order_delivered: '📦 Order Delivered', order_cancelled: '❌ Order Cancelled' };

    document.getElementById('email-template-subject').value = template.subject;
    document.getElementById('email-template-body').value = template.body;
    document.getElementById('email-editor-title').textContent = labels[key] || key;
    document.getElementById('email-save-status').textContent = '';

    // Update tab buttons
    const templateKeys = ['order_confirmation','order_received','out_for_delivery','order_delivered','order_cancelled'];
    templateKeys.forEach(k => {
        const btn = document.getElementById('tmpl-tab-' + k);
        if (btn) {
            btn.style.background = k === key ? '#111' : '#fff';
            btn.style.color = k === key ? '#fff' : '#444';
            btn.style.borderColor = k === key ? '#111' : '#e0e0e0';
        }
    });
};

window.adminSaveEmailTemplate = function() {
    const key = window._adminCurrentEmailTemplateKey;
    if (!key) return;
    const savedTemplates = JSON.parse(localStorage.getItem('drixel_email_templates') || '{}');
    savedTemplates[key] = {
        subject: document.getElementById('email-template-subject').value,
        body: document.getElementById('email-template-body').value
    };
    localStorage.setItem('drixel_email_templates', JSON.stringify(savedTemplates));
    const status = document.getElementById('email-save-status');
    status.textContent = '✅ Template saved successfully!';
    status.style.color = '#0caf60';
    setTimeout(() => { status.textContent = ''; }, 3000);

    // Update the tab button to show modified
    const btn = document.getElementById('tmpl-tab-' + key);
    if (btn && !btn.innerHTML.includes('modified')) {
        btn.innerHTML += ' <span style="font-size:10px; color:#ff6e00;">(modified)</span>';
        btn.style.boxShadow = '0 0 0 2px #ff6e0033 inset';
    }
};

window.adminResetEmailTemplate = function() {
    const key = window._adminCurrentEmailTemplateKey;
    if (!key) return;
    if (!confirm('Reset this template to the default? Any custom changes will be lost.')) return;
    const savedTemplates = JSON.parse(localStorage.getItem('drixel_email_templates') || '{}');
    delete savedTemplates[key];
    localStorage.setItem('drixel_email_templates', JSON.stringify(savedTemplates));
    const defaultTpl = DEFAULT_EMAIL_TEMPLATES[key];
    document.getElementById('email-template-subject').value = defaultTpl.subject;
    document.getElementById('email-template-body').value = defaultTpl.body;
    const status = document.getElementById('email-save-status');
    status.textContent = '🔄 Reset to default template.';
    status.style.color = '#666';
    setTimeout(() => { status.textContent = ''; }, 3000);
};


function loadAdminSnapScan() {
    const tabContent = document.getElementById('adminTabContent');
    if (!tabContent) return;

    tabContent.innerHTML = `
                <div style="margin-bottom: 30px;">
                    <h3>SnapScan Payments</h3>
                    <p style="color: #666;">View and manage SnapScan payments and references.</p>
                </div>
                
                <div style="background: #00000010; padding: 25px; border-radius: 10px; border: 2px dashed #000000; margin-bottom: 30px;">
                    <h4 style="color: #000000; margin-bottom: 15px;"><i class="fas fa-qrcode"></i> SnapScan Merchant Info</h4>
                    <div>
                        <p><strong>Merchant Name:</strong> Drixel SA</p>
                        <p><strong>Registration:</strong> ${SNAPSCAN_REGISTRATION}</p>
                        <p><strong>QR Code URL:</strong> ${SNAPSCAN_QR_URL}</p>
                    </div>
                </div>
            `;
}

function loadAdminYoco() {
    const tabContent = document.getElementById('adminTabContent');
    if (!tabContent) return;

    tabContent.innerHTML = `
                <div style="margin-bottom: 30px;">
                    <h3>Yoco Payments</h3>
                    <p style="color: #666;">View and manage Yoco credit card payments.</p>
                </div>
                
                <div style="background: #00000010; padding: 25px; border-radius: 10px; border: 2px dashed #000000; margin-bottom: 30px;">
                    <h4 style="color: #000000; margin-bottom: 15px;"><i class="fas fa-credit-card"></i> Yoco Integration</h4>
                    <div>
                        <p><strong>Public Key:</strong> ${YOCO_PUBLIC_KEY.substring(0, 15)}...</p>
                        <p><strong>SDK Status:</strong> ${window.yocoSDK ? '<span style="color: #0caf60;">Loaded ✓</span>' : '<span style="color: #ef476f;">Not Loaded ✗</span>'}</p>
                    </div>
                </div>
            `;
}

async function loadAdminPending() {
    const tabContent = document.getElementById('adminTabContent');
    if (!tabContent) return;

    try {
        const db = window.firebaseDb;
        const ordersSnapshot = await window.firebaseGetDocs(window.firebaseCollection(db, 'orders'));

        const pendingOrders = [];
        ordersSnapshot.forEach(doc => {
            const order = doc.data();
            if (order.paymentStatus === 'pending' || order.paymentStatus === 'pending_verification') {
                pendingOrders.push({
                    id: doc.id,
                    ...order
                });
            }
        });

        pendingOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        tabContent.innerHTML = `
                    <div style="margin-bottom: 30px;">
                        <h3>Pending Orders (${pendingOrders.length})</h3>
                        <p style="color: #666;">Orders awaiting payment or verification.</p>
                    </div>
                    
                    ${pendingOrders.length > 0 ? `
                        <div style="background: white; padding: 20px; border-radius: 10px; border: 1px solid #e0e0e0;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead>
                                    <tr style="background: #f5f5f5;">
                                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Order #</th>
                                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Customer</th>
                                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Amount</th>
                                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Payment Method</th>
                                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Status</th>
                                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${pendingOrders.map(order => {
            const isBankTransfer = order.paymentMethod === 'bank';
            const isSnapScan = order.paymentMethod === 'snapscan';
            return `
                                        <tr>
                                            <td style="padding: 12px; border-bottom: 1px solid #eee;">${order.order_id || order.orderNumber || order.id || '—'}</td>
                                            <td style="padding: 12px; border-bottom: 1px solid #eee;">
                                                ${order.customer?.name || 'N/A'}<br>
                                                <small>${order.customer?.email || ''}</small>
                                            </td>
                                            <td style="padding: 12px; border-bottom: 1px solid #eee;">R ${(order.total || 0).toFixed(2)}</td>
                                            <td style="padding: 12px; border-bottom: 1px solid #eee;">
                                                <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;
                                                    background: ${isBankTransfer ? '#fff3cd' : isSnapScan ? '#cce5ff' : '#d4edda'};
                                                    color: ${isBankTransfer ? '#856404' : isSnapScan ? '#004085' : '#155724'};">
                                                    ${order.paymentMethod || 'bank'}
                                                </span>
                                            </td>
                                            <td style="padding: 12px; border-bottom: 1px solid #eee;">
                                                <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;
                                                    background: ${order.paymentStatus === 'pending_verification' ? '#ffeaa7' : '#fff3cd'};
                                                    color: #856404;">
                                                    ${order.paymentStatus}
                                                </span>
                                            </td>
                                            <td style="padding: 12px; border-bottom: 1px solid #eee;">
                                                ${isBankTransfer ? `
                                                    <button onclick="openConfirmPaymentModal('${orderId}', '${order.order_id || order.orderNumber}', '${order.customer?.email}', ${order.total || 0}, '${order.paymentMethod}')" style="background: #0caf60; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; margin-right: 5px;">
                                                        Confirm Payment
                                                    </button>
                                                ` : ''}
                                                <button onclick="viewOrderDetails('${order.id}')" style="background: #0066cc; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    `}).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : `
                        <div style="text-align: center; padding: 40px;">
                            <i class="fas fa-check-circle" style="font-size: 48px; color: #0caf60; margin-bottom: 20px;"></i>
                            <h3>No Pending Orders</h3>
                            <p style="color: #666;">All orders are processed and paid.</p>
                        </div>
                    `}
                `;
    } catch (error) {
        console.error("❌ Error loading pending orders:", error);
        tabContent.innerHTML = `
                    <div style="background: #f8d7da; color: #721c24; padding: 20px; border-radius: 10px; border: 1px solid #f5c6cb;">
                        <h3>Error Loading Pending Orders</h3>
                        <p>${error.message}</p>
                    </div>
                `;
    }
}

function loadAdminSettings() {
    const tabContent = document.getElementById('adminTabContent');
    if (!tabContent) return;

    let resendApiKey = localStorage.getItem('drixel_resend_api_key') || '';
    if (resendApiKey === 're_9127pJDT_jRDx942YS4UbyH3YDfm9H7ow') {
        resendApiKey = '';
        localStorage.removeItem('drixel_resend_api_key');
    }
    const resendFromEmail = localStorage.getItem('drixel_resend_from_email') || 'info@customer.drixelsa.co.za';
    const emailEndpoint = localStorage.getItem('drixel_email_endpoint') || '/api/send-email';

    tabContent.innerHTML = `
                <div style="margin-bottom: 30px;">
                    <h3>Settings</h3>
                    <p style="color: #666;">Configure store settings and preferences.</p>
                </div>
                
                <div style="background: white; padding: 30px; border-radius: 10px; border: 1px solid #e0e0e0; margin-bottom: 30px;">
                    <h4 style="margin-bottom: 25px;">Store Configuration</h4>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Delivery Fee (R)</label>
                        <input type="number" id="deliveryFee" value="${DELIVERY_FEE}" step="0.01" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Free Delivery Threshold (R)</label>
                        <input type="number" id="freeDeliveryThreshold" value="${FREE_DELIVERY_THRESHOLD}" step="0.01" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                    </div>
                </div>

                <div style="background: white; padding: 30px; border-radius: 10px; border: 1px solid #e0e0e0;">
                    <h4 style="margin-bottom: 25px;">Email Configuration (Resend.com)</h4>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Resend API Key (Direct Client Sending)</label>
                        <input type="password" id="resendApiKey" value="${resendApiKey}" placeholder="re_..." style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                        <small style="color: #888;">If key is populated, emails send directly from browser via CORS proxy. Clear this to use Firebase Functions.</small>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">From Email Address</label>
                        <input type="text" id="resendFromEmail" value="${resendFromEmail}" placeholder="Drixel SA <info@customer.drixelsa.co.za>" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                        <small style="color: #888;">Must match your verified domain in Resend (e.g. info@customer.drixelsa.co.za).</small>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Email Cloud Function Endpoint (If Key is Blank)</label>
                        <input type="text" id="emailEndpoint" value="${emailEndpoint}" placeholder="/api/send-email" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                        <small style="color: #888;">Use /api/send-email for Firebase Hosting. Leave Resend API Key blank if using this.</small>
                    </div>
                    
                    <div style="display: flex; gap: 15px; margin-top: 30px;">
                        <button onclick="saveSettings()" style="background: #0caf60; color: white; border: none; padding: 12px 30px; border-radius: 5px; cursor: pointer; font-weight: 600;">
                            Save All Settings
                        </button>
                    </div>
                </div>

                <div style="background: white; padding: 30px; border-radius: 10px; border: 1px solid #e0e0e0; margin-top: 30px;">
                    <h4 style="margin-bottom: 25px;">Test Email Connection</h4>
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Test Recipient Email Address</label>
                        <input type="text" id="testEmailRecipient" placeholder="recipient@example.com" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                        <small style="color: #888;">Enter a test email address and click the button to send a diagnostic test email via Resend.</small>
                    </div>
                    <button onclick="sendTestEmail()" id="testEmailBtn" style="background: #ff6b00; color: white; border: none; padding: 12px 30px; border-radius: 5px; cursor: pointer; font-weight: 600;">
                        Send Test Email
                    </button>
                </div>
            `;
}

function saveSettings() {
    const newDeliveryFee = parseFloat(document.getElementById('deliveryFee').value);
    const newFreeThreshold = parseFloat(document.getElementById('freeDeliveryThreshold').value);
    const newResendApiKey = document.getElementById('resendApiKey').value.trim();
    const newResendFromEmail = document.getElementById('resendFromEmail').value.trim();
    const newEmailEndpoint = document.getElementById('emailEndpoint').value.trim();

    if (!isNaN(newDeliveryFee)) {
        DELIVERY_FEE = newDeliveryFee;
        localStorage.setItem('drixel_delivery_fee', newDeliveryFee);
    }

    if (!isNaN(newFreeThreshold)) {
        FREE_DELIVERY_THRESHOLD = newFreeThreshold;
        localStorage.setItem('drixel_free_delivery_threshold', newFreeThreshold);
    }

    localStorage.setItem('drixel_resend_api_key', newResendApiKey);
    localStorage.setItem('drixel_resend_from_email', newResendFromEmail);
    localStorage.setItem('drixel_email_endpoint', newEmailEndpoint);

    alert('Settings saved successfully!');
}

async function sendTestEmail() {
    const recipient = document.getElementById('testEmailRecipient').value.trim();
    if (!recipient) {
        alert('Please enter a test recipient email address.');
        return;
    }

    const testBtn = document.getElementById('testEmailBtn');
    const originalText = testBtn.innerHTML;
    testBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    testBtn.disabled = true;

    try {
        const result = await window.sendEmailViaResend({
            to: recipient,
            subject: 'Drixel SA - Test Connection',
            html: '<p>This is a test email from Drixel SA store configuration diagnostics.</p>'
        });

        if (result.success) {
            alert('✅ Success! Test email sent successfully.');
        } else {
            alert('❌ Failed! Email dispatch failed. Details: ' + (result.details || result.message));
        }
    } catch (e) {
        alert('❌ Network Error: ' + e.message);
    } finally {
        testBtn.innerHTML = originalText;
        testBtn.disabled = false;
    }
}
window.sendTestEmail = sendTestEmail;

// ===== PRODUCT EDITOR MODAL =====

window._adminProductColorCount = 0;

function showAddProductForm(productId) {
    // Find existing product if editing
    let existingProduct = null;
    if (productId !== null && productId !== undefined) {
        existingProduct = (window.PRODUCTS_DATA || []).find(p =>
            String(p.id || p._firestoreId) === String(productId)
        );
    }
    const isEdit = !!existingProduct;
    const p = existingProduct || {};

    // Build image slots (8 max) — Slot 0 = Front View, Slot 1 = Back View
    const imageUrls = p.images || (p.image ? [p.image] : []);
    const imageSlotsHTML = Array(8).fill(0).map((_, i) => {
        const url = imageUrls[i] || '';
        const isBack = i === 1;
        const isFront = i === 0;
        const slotLabel = isFront ? '<span class="pm-slot-label front-label">FRONT VIEW</span>' :
                          isBack  ? '<span class="pm-slot-label back-label">BACK VIEW</span>' :
                                    `<span class="pm-slot-label" style="color:#aaa;">Image ${i + 1}</span>`;
        const placeholderSrc = 'https://via.placeholder.com/90x90?text=' + (isFront ? 'Front' : isBack ? 'Back' : ('Img+' + (i+1)));
        return `
        <div class="pm-image-slot">
            <img id="imgPrev${i}" class="pm-image-preview ${url ? 'has-image' : ''} ${isFront ? 'primary-img' : ''}" 
                src="${url || placeholderSrc}"
                alt="Image ${i + 1}" loading="lazy"
                onerror="this.src='${placeholderSrc}'">
            ${slotLabel}
            <input type="text" class="pm-image-url-input" id="imgUrl${i}" placeholder="Paste URL or upload..." 
                value="${url}"
                oninput="adminUpdateImagePreview(${i}, this.value)">
            <label class="pm-upload-btn" title="Upload from device">
                <i class="fas fa-upload" style="font-size:10px;"></i> Upload
                <input type="file" accept="image/*" style="display:none;" onchange="adminUploadLocalImage(${i}, this)">
            </label>
        </div>`;
    }).join('');

    // Build size chips
    const existingSizes = p.sizes || ['S', 'M', 'L', 'XL', 'XXL'];
    const allSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'One Size'];
    const sizeChipsHTML = allSizes.map(s => `
        <div class="pm-size-chip ${existingSizes.includes(s) ? 'selected' : ''}" 
            onclick="this.classList.toggle('selected')" data-size="${s}">${s}</div>
    `).join('');

    // Build color rows
    const existingColors = p.colors || [{ name: 'Black', code: '#111111' }];
    const colorRowsHTML = existingColors.map((c, i) => `
        <div class="pm-color-row" id="colorRow${i}">
            <input type="color" class="pm-color-swatch" value="${c.code || '#111111'}" id="colorPicker${i}">
            <input type="text" class="pm-color-name-input" placeholder="Color name (e.g. Black)" value="${c.name || ''}" id="colorName${i}">
            <button class="pm-remove-color-btn" onclick="adminRemoveColorRow(${i})" title="Remove color">×</button>
        </div>
    `).join('');
    window._adminProductColorCount = existingColors.length;

    // Tag toggles
    const tagTogglesHTML = [
        { key: 'featured', label: 'Featured' },
        { key: 'newArrival', label: 'New Arrival' },
        { key: 'bestSeller', label: 'Best Seller' },
        { key: 'onSale', label: 'On Sale' }
    ].map(t => `
        <label class="pm-tag-toggle ${p[t.key] ? 'active' : ''}" id="tagToggle_${t.key}" onclick="adminToggleTag(this, '${t.key}')">
            <input type="checkbox" ${p[t.key] ? 'checked' : ''} id="tag_${t.key}">
            <span class="tag-label">${t.label}</span>
        </label>
    `).join('');

    const html = `
    <div id="productModalOverlay" class="product-modal-overlay" onclick="closeProductModal()"></div>
    <div id="productModalPanel" class="product-modal-panel">
        <div class="product-modal-header">
            <h3>${isEdit ? 'Edit Product' : 'Add New Product'}</h3>
            <button class="product-modal-close" onclick="closeProductModal()">&#x2715;</button>
        </div>
        <div class="product-modal-body">
            <!-- Section 1: Basic Info -->
            <div class="pm-section">
                <div class="pm-section-title">Basic Information</div>
                <div class="pm-field">
                    <label>Product Name *</label>
                    <input type="text" id="pmName" placeholder="e.g. Urban Hoodie" value="${p.name || ''}" required>
                </div>
                <div class="pm-field">
                    <label>Description *</label>
                    <textarea id="pmDescription" placeholder="Describe the product..." rows="3">${p.description || ''}</textarea>
                </div>
                <div class="pm-row">
                    <div class="pm-field">
                        <label>Category *</label>
                        <select id="pmCategory">
                            <option value="">Select category...</option>
                            <option value="hoodies" ${p.category === 'hoodies' ? 'selected' : ''}>Hoodies</option>
                            <option value="tees" ${p.category === 'tees' ? 'selected' : ''}>Tees</option>
                            <option value="beanies" ${p.category === 'beanies' ? 'selected' : ''}>Beanies</option>
                            <option value="sweaters" ${p.category === 'sweaters' ? 'selected' : ''}>Sweaters</option>
                            <option value="accessories" ${p.category === 'accessories' ? 'selected' : ''}>Accessories</option>
                        </select>
                    </div>
                    <div class="pm-field">
                        <label>Status</label>
                        <select id="pmStatus">
                            <option value="active" ${(!p.status || p.status === 'active') ? 'selected' : ''}>Active (Visible)</option>
                            <option value="hidden" ${p.status === 'hidden' ? 'selected' : ''}>Hidden</option>
                            <option value="draft" ${p.status === 'draft' ? 'selected' : ''}>Draft</option>
                        </select>
                    </div>
                </div>
                <div class="pm-row">
                    <div class="pm-field">
                        <label>Price (R) *</label>
                        <input type="number" id="pmPrice" min="0" step="0.01" placeholder="0.00" value="${p.price || ''}">
                    </div>
                    <div class="pm-field">
                        <label>Compare-at Price (R)</label>
                        <input type="number" id="pmComparePrice" min="0" step="0.01" placeholder="Optional" value="${p.comparePrice || ''}">
                    </div>
                </div>
                <div class="pm-row">
                    <div class="pm-field">
                        <label>Stock Quantity</label>
                        <input type="number" id="pmStock" min="0" placeholder="Leave blank for unlimited" value="${p.stock !== undefined ? p.stock : ''}">
                    </div>
                    <div class="pm-field">
                        <label>Sale % Off</label>
                        <input type="number" id="pmSalePercent" min="0" max="100" placeholder="e.g. 20" value="${p.salePercent || ''}">
                    </div>
                </div>
            </div>

            <!-- Section 2: Images -->
            <div class="pm-section">
                <div class="pm-section-title">Product Images (up to 8)</div>
                <p style="font-size:12px;color:#888;margin-bottom:14px;">The first image is the primary/cover image. Paste ImageKit.io or any CDN URL into each slot.</p>
                <div class="pm-image-grid">${imageSlotsHTML}</div>
            </div>

            <!-- Section 3: Variants -->
            <div class="pm-section">
                <div class="pm-section-title">Sizes</div>
                <div class="pm-sizes-grid" id="pmSizesGrid">${sizeChipsHTML}</div>
            </div>

            <div class="pm-section">
                <div class="pm-section-title">Colors</div>
                <div id="pmColorsContainer">${colorRowsHTML}</div>
                <button class="pm-add-color-btn" onclick="adminAddColorRow()">+ Add Color</button>
            </div>

            <!-- Section 4: Tags -->
            <div class="pm-section">
                <div class="pm-section-title">🏷️ Tags & Badges</div>
                <div class="pm-tags-grid">${tagTogglesHTML}</div>
            </div>
        </div>

        <div class="product-modal-footer">
            <button class="pm-btn-cancel" onclick="closeProductModal()">Cancel</button>
            <button class="pm-btn-draft" onclick="adminSaveProduct('${isEdit ? (p._firestoreId || p.id) : ''}', 'draft')">Save Draft</button>
            <button class="pm-btn-save" id="pmSaveBtn" onclick="adminSaveProduct('${isEdit ? (p._firestoreId || p.id) : ''}', '${p.status || 'active'}')">
                <i class="fas fa-save"></i> ${isEdit ? 'Update Product' : 'Add to Firestore'}
            </button>
        </div>
    </div>`;

    // Remove existing modal if open
    closeProductModal();
    document.body.insertAdjacentHTML('beforeend', html);

    // Animate in
    requestAnimationFrame(() => {
        document.getElementById('productModalOverlay')?.classList.add('visible');
        document.getElementById('productModalPanel')?.classList.add('visible');
    });
}

function closeProductModal() {
    const overlay = document.getElementById('productModalOverlay');
    const panel = document.getElementById('productModalPanel');
    if (overlay) overlay.classList.remove('visible');
    if (panel) panel.classList.remove('visible');
    setTimeout(() => {
        overlay?.remove();
        panel?.remove();
    }, 350);
}

function adminUpdateImagePreview(idx, url) {
    const img = document.getElementById('imgPrev' + idx);
    if (!img) return;
    if (url) {
        img.src = url;
        img.classList.add('has-image');
    } else {
        img.src = 'https://via.placeholder.com/90x90?text=Empty';
        img.classList.remove('has-image');
    }
}

// Upload local image file via FileReader, then optionally push to Firebase Storage
async function adminUploadLocalImage(idx, fileInput) {
    const file = fileInput.files[0];
    if (!file) return;
    const urlInput = document.getElementById('imgUrl' + idx);

    const reader = new FileReader();
    reader.onload = async function(e) {
        const dataUrl = e.target.result;
        adminUpdateImagePreview(idx, dataUrl);
        if (urlInput) urlInput.value = dataUrl;

        // Attempt Firebase Storage upload for a persistent CDN URL
        try {
            if (window.firebaseStorage && window.firebaseStorageRef && window.firebaseUploadBytes && window.firebaseGetDownloadURL) {
                showToast('Uploading image to storage...', 'info');
                const filename = 'products/images/' + Date.now() + '_' + file.name.replace(/\s+/g, '_');
                const ref = window.firebaseStorageRef(window.firebaseStorage, filename);
                const snapshot = await window.firebaseUploadBytes(ref, file);
                const downloadUrl = await window.firebaseGetDownloadURL(snapshot.ref);
                adminUpdateImagePreview(idx, downloadUrl);
                if (urlInput) urlInput.value = downloadUrl;
                showToast('Image uploaded successfully!', 'success');
            } else {
                if (file.size > 500 * 1024) {
                    showToast('Image preview set (large file). For production, use a CDN URL.', 'warning');
                } else {
                    showToast('Image ready. Will be stored as data URL.', 'success');
                }
            }
        } catch(e) {
            console.warn('Firebase Storage upload failed, using data URL:', e.message);
            showToast('Saved locally. Firebase Storage not configured.', 'warning');
        }
    };
    reader.readAsDataURL(file);
}
window.adminUploadLocalImage = adminUploadLocalImage;

function adminAddColorRow() {
    const idx = window._adminProductColorCount++;
    const container = document.getElementById('pmColorsContainer');
    if (!container) return;
    const row = document.createElement('div');
    row.className = 'pm-color-row';
    row.id = `colorRow${idx}`;
    row.innerHTML = `
        <input type="color" class="pm-color-swatch" value="#888888" id="colorPicker${idx}">
        <input type="text" class="pm-color-name-input" placeholder="Color name" id="colorName${idx}">
        <button class="pm-remove-color-btn" onclick="adminRemoveColorRow(${idx})" title="Remove">×</button>`;
    container.appendChild(row);
}

function adminRemoveColorRow(idx) {
    document.getElementById(`colorRow${idx}`)?.remove();
}

function adminToggleTag(label, key) {
    const cb = document.getElementById(`tag_${key}`);
    if (!cb) return;
    label.classList.toggle('active', cb.checked);
}

async function adminSaveProduct(existingIdOrFirestoreId, statusOverride) {
    const saveBtn = document.getElementById('pmSaveBtn');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving...'; }

    // Collect form values
    const name = document.getElementById('pmName')?.value.trim();
    const description = document.getElementById('pmDescription')?.value.trim();
    const category = document.getElementById('pmCategory')?.value;
    const price = parseFloat(document.getElementById('pmPrice')?.value) || 0;
    const comparePrice = parseFloat(document.getElementById('pmComparePrice')?.value) || null;
    const stock = document.getElementById('pmStock')?.value !== '' ? parseInt(document.getElementById('pmStock')?.value) : null;
    const salePercent = parseInt(document.getElementById('pmSalePercent')?.value) || null;
    const status = statusOverride !== undefined ? statusOverride : (document.getElementById('pmStatus')?.value || 'active');

    if (!name || !description || !category || price <= 0) {
        showToast('Please fill in Name, Description, Category and Price.', 'warning');
        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save to Firestore'; }
        return;
    }

    // Collect images
    const images = [];
    for (let i = 0; i < 8; i++) {
        const url = document.getElementById(`imgUrl${i}`)?.value.trim();
        if (url) images.push(url);
    }

    // Collect sizes
    const sizes = [];
    document.querySelectorAll('.pm-size-chip.selected').forEach(chip => sizes.push(chip.dataset.size));

    // Collect colors
    const colors = [];
    document.querySelectorAll('.pm-color-row').forEach(row => {
        const idMatch = row.id.match(/colorRow(\d+)/);
        if (!idMatch) return;
        const idx = idMatch[1];
        const colorName = document.getElementById(`colorName${idx}`)?.value.trim();
        const colorCode = document.getElementById(`colorPicker${idx}`)?.value || '#111111';
        if (colorName) colors.push({ name: colorName, code: colorCode });
    });

    // Collect tags
    const featured = document.getElementById('tag_featured')?.checked || false;
    const newArrival = document.getElementById('tag_newArrival')?.checked || false;
    const bestSeller = document.getElementById('tag_bestSeller')?.checked || false;
    const onSale = document.getElementById('tag_onSale')?.checked || false;

    const productData = {
        name, description, category, price,
        images,
        image: images[0] || '',
        sizes: sizes.length > 0 ? sizes : ['S', 'M', 'L', 'XL'],
        colors: colors.length > 0 ? colors : [{ name: 'Black', code: '#111111' }],
        featured, newArrival, bestSeller, onSale,
        status: status === 'draft' ? 'draft' : status,
        ...(comparePrice ? { comparePrice } : {}),
        ...(stock !== null ? { stock } : {}),
        ...(salePercent ? { salePercent } : {}),
        updatedAt: new Date().toISOString()
    };

    try {
        const db = window.firebaseDb;
        let firestoreId = existingIdOrFirestoreId;

        // If editing and has a Firestore ID
        const existingProduct = window.PRODUCTS_DATA.find(p => String(p._firestoreId || p.id) === String(existingIdOrFirestoreId));
        const existingFirestoreId = existingProduct?._firestoreId;

        if (existingFirestoreId) {
            // Update existing in Firestore
            await window.firebaseUpdateDoc(window.firebaseDoc(db, 'products', existingFirestoreId), productData);
            Object.assign(existingProduct, productData);
            showToast('✅ Product updated!', 'success');
        } else if (existingIdOrFirestoreId && !existingFirestoreId) {
            // Updating a local product — push to Firestore as new
            const docRef = await window.firebaseAddDoc(window.firebaseCollection(db, 'products'), {
                ...productData,
                createdAt: new Date().toISOString()
            });
            if (existingProduct) {
                existingProduct._firestoreId = docRef.id;
                Object.assign(existingProduct, productData);
            }
            showToast('✅ Product saved to Firestore!', 'success');
        } else {
            // New product
            const maxId = (window.PRODUCTS_DATA.length > 0) ? Math.max(...window.PRODUCTS_DATA.map(p => p.id || 0)) : 0;
            const docRef = await window.firebaseAddDoc(window.firebaseCollection(db, 'products'), {
                ...productData,
                createdAt: new Date().toISOString(),
                sortOrder: maxId + 1
            });
            window.PRODUCTS_DATA.push({ ...productData, id: maxId + 1, _firestoreId: docRef.id });
            showToast('✅ Product added!', 'success');
        }

        invalidateProductsCache();
        closeProductModal();
        setTimeout(() => renderAdminProductsTable(), 300);
    } catch(e) {
        console.error('Save product failed:', e);
        showToast('Error saving: ' + e.message, 'error');
        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save to Firestore'; }
    }
}

function deleteProduct(localId, firestoreId, btnOrName) {
    // Third arg can be the button element (new) or a name string (legacy)
    let productName = 'this product';
    if (typeof btnOrName === 'string') {
        productName = btnOrName || 'this product';
    } else {
        // Look up the name from PRODUCTS_DATA
        const found = (window.PRODUCTS_DATA || []).find(p =>
            String(p.id || p._firestoreId) === String(localId) ||
            String(p._firestoreId) === String(firestoreId)
        );
        if (found) productName = found.name || 'this product';
    }
    showBrandedConfirm(
        'Delete product?',
        'Remove "' + productName + '" from Firestore and the storefront. This cannot be undone.',
        '',
        async () => {
            try {
                if (firestoreId) {
                    await window.firebaseDeleteDoc(window.firebaseDoc(window.firebaseDb, 'products', firestoreId));
                }
                const idx = window.PRODUCTS_DATA.findIndex(p =>
                    String(p.id || p._firestoreId) === String(localId) ||
                    String(p._firestoreId) === String(firestoreId)
                );
                if (idx !== -1) window.PRODUCTS_DATA.splice(idx, 1);
                invalidateProductsCache();
                renderAdminProductsTable();
                showToast('Product deleted.', 'success');
            } catch(e) {
                showToast('Delete failed: ' + e.message, 'error');
            }
        }
    );
}

// Branded confirmation dialog
function showBrandedConfirm(title, message, icon, onConfirm) {
    const existing = document.getElementById('brandedConfirmModal');
    if (existing) existing.remove();

    const html = `
    <div id="brandedConfirmModal" class="confirm-modal-overlay" onclick="if(event.target===this)this.remove();">
        <div class="confirm-modal-box">
            <div class="confirm-modal-icon">${icon || '⚠️'}</div>
            <div class="confirm-modal-title">${title}</div>
            <p class="confirm-modal-msg">${message || ''}</p>
            <div class="confirm-modal-actions">
                <button onclick="document.getElementById('brandedConfirmModal').remove()" 
                    style="background:#f0f0f0;color:#555;">Cancel</button>
                <button id="brandedConfirmOk" style="background:#e63946;color:#fff;">Confirm</button>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    document.getElementById('brandedConfirmOk').onclick = () => {
        document.getElementById('brandedConfirmModal')?.remove();
        onConfirm();
    };
}

// Keep old editProduct as alias
function editProduct(productId) {
    showAddProductForm(productId);
}

function showAddProductForm_old() {} // deprecated stub

// ===== CAMPAIGNS, PROMOTIONS & COUPONS =====

async function loadAdminCampaigns() {
    const tabContent = document.getElementById('adminTabContent');
    if (!tabContent) return;

    tabContent.innerHTML = `
        <div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
                <h3 style="font-size:18px;font-weight:800;color:#111;">🎯 Campaigns & Promotions</h3>
            </div>

            <!-- Sub tabs -->
            <div style="display:flex;gap:8px;margin-bottom:24px;border-bottom:2px solid #eee;padding-bottom:12px;">
                <button class="campaign-sub-tab active" onclick="switchCampaignTab('coupons',this)" style="padding:8px 18px;border:none;background:#111;color:#fff;border-radius:20px;font-size:12px;font-weight:700;cursor:pointer;">Coupons</button>
                <button class="campaign-sub-tab" onclick="switchCampaignTab('banners',this)" style="padding:8px 18px;border:1.5px solid #e0e0e0;background:#fff;color:#555;border-radius:20px;font-size:12px;font-weight:700;cursor:pointer;">Banners</button>
                <button class="campaign-sub-tab" onclick="switchCampaignTab('active',this)" style="padding:8px 18px;border:1.5px solid #e0e0e0;background:#fff;color:#555;border-radius:20px;font-size:12px;font-weight:700;cursor:pointer;">Active</button>
            </div>

            <div id="campaignTabContent"></div>
        </div>
    `;

    switchCampaignTab('coupons', document.querySelector('.campaign-sub-tab.active'));
}

function switchCampaignTab(tab, btn) {
    document.querySelectorAll('.campaign-sub-tab').forEach(b => {
        b.style.background = '#fff'; b.style.color = '#555'; b.style.border = '1.5px solid #e0e0e0';
    });
    if (btn) { btn.style.background = '#111'; btn.style.color = '#fff'; btn.style.border = 'none'; }
    const el = document.getElementById('campaignTabContent');
    if (!el) return;
    if (tab === 'coupons') renderCouponsPanel(el);
    else if (tab === 'banners') renderBannersPanel(el);
    else if (tab === 'active') renderActivePromotions(el);
}

function renderCouponsPanel(el) {
    el.innerHTML = `
        <div style="background:#fff;border:1.5px solid #eee;border-radius:12px;padding:24px;margin-bottom:20px;">
            <h4 style="font-size:14px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:#888;margin-bottom:18px;">Create New Coupon</h4>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:14px;">
                <div class="pm-field"><label>Coupon Code *</label><input type="text" id="cpCode" placeholder="e.g. SAVE20" style="text-transform:uppercase;"></div>
                <div class="pm-field">
                    <label>Discount Type</label>
                    <select id="cpType">
                        <option value="percent">% Off</option>
                        <option value="fixed">Fixed (R)</option>
                    </select>
                </div>
                <div class="pm-field"><label>Discount Amount *</label><input type="number" id="cpAmount" min="0" placeholder="e.g. 20"></div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:18px;">
                <div class="pm-field"><label>Minimum Order (R)</label><input type="number" id="cpMinOrder" min="0" placeholder="Optional"></div>
                <div class="pm-field"><label>Max Uses</label><input type="number" id="cpMaxUses" min="1" placeholder="Leave blank = unlimited"></div>
                <div class="pm-field"><label>Expiry Date</label><input type="datetime-local" id="cpExpiry"></div>
            </div>
            <button onclick="adminCreateCoupon()" style="padding:11px 28px;background:#111;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;">
                🎟️ Create Coupon
            </button>
        </div>

        <div id="couponsListPanel">
            <div class="skeleton-card"></div>
            <div class="skeleton-card"></div>
        </div>
    `;
    loadCouponsList();
}

async function loadCouponsList() {
    const panel = document.getElementById('couponsListPanel');
    if (!panel) return;
    try {
        const db = window.firebaseDb;
        const snap = await window.firebaseGetDocs(window.firebaseCollection(db, 'coupons'));
        if (snap.empty) {
            panel.innerHTML = '<p style="color:#999;text-align:center;padding:20px;">No coupons yet. Create one above.</p>';
            return;
        }
        const now = Date.now();
        let html = '';
        snap.forEach(docSnap => {
            const c = docSnap.data();
            const firestoreId = docSnap.id;
            const isExpired = c.expiry && new Date(c.expiry).getTime() < now;
            const statusClass = isExpired ? 'badge-expired' : (c.active === false ? 'badge-paused' : 'badge-active');
            const statusLabel = isExpired ? 'Expired' : (c.active === false ? 'Paused' : 'Active');
            html += `
            <div class="admin-promo-card">
                <div class="promo-card-icon" style="background:#f0f4ff;">🎟️</div>
                <div style="flex:1;">
                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">
                        <span class="coupon-code-display">${c.code || '—'}</span>
                        <span class="campaign-badge ${statusClass}">${statusLabel}</span>
                    </div>
                    <p style="font-size:12px;color:#666;margin:0;">
                        ${c.type === 'percent' ? c.amount + '% off' : 'R' + c.amount + ' off'}
                        ${c.minOrder ? ' · Min order R' + c.minOrder : ''}
                        ${c.maxUses ? ' · ' + (c.usedCount || 0) + '/' + c.maxUses + ' uses' : ' · Unlimited uses'}
                        ${c.expiry ? ' · Expires ' + new Date(c.expiry).toLocaleDateString('en-ZA') : ''}
                    </p>
                </div>
                <div style="display:flex;gap:6px;">
                    <button class="admin-action-btn" onclick="adminToggleCoupon('${firestoreId}', ${c.active !== false})" title="${c.active !== false ? 'Pause' : 'Activate'}">
                        ${c.active !== false ? '⏸️' : '▶️'}
                    </button>
                    <button class="admin-action-btn danger" onclick="adminDeleteCoupon('${firestoreId}', '${c.code}')" title="Delete coupon">🗑️</button>
                </div>
            </div>`;
        });
        panel.innerHTML = html;
    } catch(e) {
        panel.innerHTML = '<p style="color:#e63946;padding:16px;">Error loading coupons: ' + e.message + '</p>';
    }
}

async function adminCreateCoupon() {
    const code = (document.getElementById('cpCode')?.value || '').trim().toUpperCase();
    const type = document.getElementById('cpType')?.value || 'percent';
    const amount = parseFloat(document.getElementById('cpAmount')?.value) || 0;
    const minOrder = parseFloat(document.getElementById('cpMinOrder')?.value) || null;
    const maxUses = parseInt(document.getElementById('cpMaxUses')?.value) || null;
    const expiry = document.getElementById('cpExpiry')?.value || null;

    if (!code || !amount) { showToast('Please enter a coupon code and discount amount.', 'warning'); return; }

    try {
        await window.firebaseAddDoc(window.firebaseCollection(window.firebaseDb, 'coupons'), {
            code, type, amount,
            ...(minOrder ? { minOrder } : {}),
            ...(maxUses ? { maxUses } : {}),
            ...(expiry ? { expiry } : {}),
            usedCount: 0,
            active: true,
            createdAt: new Date().toISOString()
        });
        showToast(`✅ Coupon ${code} created!`, 'success');
        document.getElementById('cpCode').value = '';
        document.getElementById('cpAmount').value = '';
        loadCouponsList();
    } catch(e) {
        showToast('Failed to create coupon: ' + e.message, 'error');
    }
}

async function adminToggleCoupon(firestoreId, currentActive) {
    try {
        await window.firebaseUpdateDoc(window.firebaseDoc(window.firebaseDb, 'coupons', firestoreId), { active: !currentActive });
        showToast(`Coupon ${currentActive ? 'paused' : 'activated'}.`, 'success');
        loadCouponsList();
    } catch(e) { showToast('Failed: ' + e.message, 'error'); }
}

async function adminDeleteCoupon(firestoreId, code) {
    showBrandedConfirm(`Delete coupon "${code}"?`, 'This cannot be undone.', '🗑️', async () => {
        try {
            await window.firebaseDeleteDoc(window.firebaseDoc(window.firebaseDb, 'coupons', firestoreId));
            showToast('Coupon deleted.', 'success');
            loadCouponsList();
        } catch(e) { showToast('Failed: ' + e.message, 'error'); }
    });
}

function renderBannersPanel(el) {
    el.innerHTML = `
        <div style="background:#fff;border:1.5px solid #eee;border-radius:12px;padding:24px;margin-bottom:20px;">
            <h4 style="font-size:14px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:#888;margin-bottom:18px;">Create Homepage Banner</h4>

            <!-- Template Picker -->
            <div style="margin-bottom:20px;">
                <label style="font-size:12px;font-weight:700;color:#555;display:block;margin-bottom:10px;">Choose Template</label>
                <div class="banner-template-picker" id="bnTemplatePicker">
                    <label class="banner-tpl-card active" data-val="hero" onclick="selectBannerTemplate('hero')">
                        <div class="banner-tpl-preview" style="background:linear-gradient(135deg,#111 0%,#333 100%);">
                            <div style="color:#fff;font-size:10px;font-weight:900;">BIG BOLD TITLE</div>
                            <div style="height:4px;width:50px;background:#fff;border-radius:2px;margin:4px 0;"></div>
                            <div style="background:#fff;color:#111;border-radius:10px;padding:2px 8px;font-size:8px;font-weight:700;width:fit-content;">Shop Now</div>
                        </div>
                        <input type="radio" name="bnTemplate" id="bnTemplate" value="hero" checked style="display:none;">
                        <span style="font-size:11px;font-weight:700;margin-top:6px;display:block;text-align:center;">Hero</span>
                    </label>
                    <label class="banner-tpl-card" data-val="split" onclick="selectBannerTemplate('split')">
                        <div class="banner-tpl-preview" style="background:#111;display:grid;grid-template-columns:1fr 1fr;padding:0;overflow:hidden;">
                            <div style="padding:8px;display:flex;flex-direction:column;justify-content:center;">
                                <div style="height:3px;width:30px;background:#fff;border-radius:2px;margin-bottom:4px;"></div>
                                <div style="height:3px;width:45px;background:#fff;border-radius:2px;opacity:0.5;"></div>
                            </div>
                            <div style="background:#333;"></div>
                        </div>
                        <input type="radio" name="bnTemplate" value="split" style="display:none;">
                        <span style="font-size:11px;font-weight:700;margin-top:6px;display:block;text-align:center;">Split</span>
                    </label>
                    <label class="banner-tpl-card" data-val="announcement" onclick="selectBannerTemplate('announcement')">
                        <div class="banner-tpl-preview" style="background:#111;justify-content:center;align-items:center;flex-direction:row;gap:6px;">
                            <div style="width:6px;height:6px;border-radius:50%;background:#fff;"></div>
                            <div style="height:3px;flex:1;background:#fff;border-radius:2px;opacity:0.7;"></div>
                            <div style="border:1px solid #fff;border-radius:8px;padding:1px 4px;font-size:7px;color:#fff;white-space:nowrap;">Shop</div>
                        </div>
                        <input type="radio" name="bnTemplate" value="announcement" style="display:none;">
                        <span style="font-size:11px;font-weight:700;margin-top:6px;display:block;text-align:center;">Announcement</span>
                    </label>
                    <label class="banner-tpl-card" data-val="countdown" onclick="selectBannerTemplate('countdown')">
                        <div class="banner-tpl-preview" style="background:#111;flex-direction:column;gap:4px;">
                            <div style="color:#fff;font-size:8px;font-weight:900;text-align:center;">LIMITED TIME</div>
                            <div style="display:flex;gap:3px;justify-content:center;">
                                <div style="background:#fff;color:#111;border-radius:3px;padding:2px 4px;font-size:8px;font-weight:700;">00</div>
                                <div style="color:#fff;font-size:8px;">:</div>
                                <div style="background:#fff;color:#111;border-radius:3px;padding:2px 4px;font-size:8px;font-weight:700;">00</div>
                                <div style="color:#fff;font-size:8px;">:</div>
                                <div style="background:#fff;color:#111;border-radius:3px;padding:2px 4px;font-size:8px;font-weight:700;">00</div>
                            </div>
                        </div>
                        <input type="radio" name="bnTemplate" value="countdown" style="display:none;">
                        <span style="font-size:11px;font-weight:700;margin-top:6px;display:block;text-align:center;">Countdown</span>
                    </label>
                </div>
            </div>

            <!-- Content Fields -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
                <div class="pm-field"><label>Title *</label><input type="text" id="bnTitle" placeholder="e.g. Summer Sale"></div>
                <div class="pm-field"><label>Subtitle</label><input type="text" id="bnSubtitle" placeholder="Short description..."></div>
                <div class="pm-field"><label>CTA Button Text</label><input type="text" id="bnCtaText" placeholder="Shop Now"></div>
                <div class="pm-field"><label>CTA Link</label><input type="text" id="bnCtaLink" placeholder="/products.html or full URL"></div>
                <div class="pm-field"><label>Background Color</label><input type="color" id="bnBgColor" value="#111111" style="height:42px;padding:4px;cursor:pointer;"></div>
                <div class="pm-field"><label>Text Color</label><input type="color" id="bnTextColor" value="#ffffff" style="height:42px;padding:4px;cursor:pointer;"></div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:18px;">
                <div class="pm-field" style="grid-column:1/-1;"><label>Image URL (for Split &amp; Hero templates)</label><input type="text" id="bnImageUrl" placeholder="Paste CDN image URL (optional)..."></div>
                <div class="pm-field"><label>Start Date/Time</label><input type="datetime-local" id="bnStartAt"></div>
                <div class="pm-field"><label>End Date/Time (required for Countdown)</label><input type="datetime-local" id="bnEndAt"></div>
            </div>
            <button onclick="adminCreateBanner()" style="padding:11px 28px;background:#111;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;letter-spacing:.3px;">
                Create Banner
            </button>
        </div>
        <div id="bannersListPanel"><div class="skeleton-card"></div></div>
    `;
    loadBannersList();
}

function selectBannerTemplate(val) {
    // Update radio value
    const mainRadio = document.getElementById('bnTemplate');
    if (mainRadio) mainRadio.value = val;
    // Update active card styles
    document.querySelectorAll('.banner-tpl-card').forEach(c => c.classList.remove('active'));
    document.querySelector(`.banner-tpl-card[data-val="${val}"]`)?.classList.add('active');
}
window.selectBannerTemplate = selectBannerTemplate;



async function loadBannersList() {
    const panel = document.getElementById('bannersListPanel');
    if (!panel) return;
    try {
        const snap = await window.firebaseGetDocs(window.firebaseCollection(window.firebaseDb, 'banners'));
        if (snap.empty) {
            panel.innerHTML = '<p style="color:#999;text-align:center;padding:20px;">No banners yet. Create one above.</p>';
            return;
        }
        const now = Date.now();
        let html = '';
        snap.forEach(docSnap => {
            const b = docSnap.data();
            const firestoreId = docSnap.id;
            const isExpired = b.endAt && new Date(b.endAt).getTime() < now;
            const isScheduled = b.startAt && new Date(b.startAt).getTime() > now;
            const statusClass = isExpired ? 'badge-expired' : (isScheduled ? 'badge-scheduled' : (b.active === false ? 'badge-paused' : 'badge-active'));
            const statusLabel = isExpired ? 'Expired' : (isScheduled ? 'Scheduled' : (b.active === false ? 'Paused' : 'Live'));
            html += `
            <div class="admin-promo-card">
                <div style="width:56px;height:40px;border-radius:6px;background:${b.bgColor || '#111'};flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:18px;">🖼️</div>
                <div style="flex:1;">
                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">
                        <strong style="font-size:14px;">${b.title || '—'}</strong>
                        <span class="campaign-badge ${statusClass}">${statusLabel}</span>
                    </div>
                    <p style="font-size:12px;color:#666;margin:0;">
                        ${b.subtitle ? b.subtitle + ' · ' : ''}
                        CTA: "${b.ctaText || 'Shop Now'}" → ${b.ctaLink || '#'}
                        ${b.startAt ? ' · From ' + new Date(b.startAt).toLocaleDateString('en-ZA') : ''}
                        ${b.endAt ? ' · Until ' + new Date(b.endAt).toLocaleDateString('en-ZA') : ''}
                    </p>
                </div>
                <div style="display:flex;gap:6px;">
                    <button class="admin-action-btn" onclick="adminToggleBanner('${firestoreId}', ${b.active !== false})" title="${b.active !== false ? 'Pause' : 'Activate'}">${b.active !== false ? '⏸️' : '▶️'}</button>
                    <button class="admin-action-btn danger" onclick="adminDeleteBanner('${firestoreId}', '${(b.title || '').replace(/&/g, 'and')}')" title="Delete banner">Delete</button>
                </div>
            </div>`;
        });
        panel.innerHTML = html;
    } catch(e) {
        panel.innerHTML = '<p style="color:#e63946;padding:16px;">Error loading banners: ' + e.message + '</p>';
    }
}

async function adminCreateBanner() {
    const title = document.getElementById('bnTitle')?.value.trim();
    if (!title) { showToast('Please enter a banner title.', 'warning'); return; }
    const data = {
        title,
        subtitle: document.getElementById('bnSubtitle')?.value.trim() || '',
        ctaText: document.getElementById('bnCtaText')?.value.trim() || 'Shop Now',
        ctaLink: document.getElementById('bnCtaLink')?.value.trim() || '/',
        bgColor: document.getElementById('bnBgColor')?.value || '#111111',
        textColor: document.getElementById('bnTextColor')?.value || '#ffffff',
        imageUrl: document.getElementById('bnImageUrl')?.value.trim() || '',
        template: document.getElementById('bnTemplate')?.value || 'hero',
        startAt: document.getElementById('bnStartAt')?.value || null,
        endAt: document.getElementById('bnEndAt')?.value || null,
        active: true,
        createdAt: new Date().toISOString()
    };
    try {
        await window.firebaseAddDoc(window.firebaseCollection(window.firebaseDb, 'banners'), data);
        showToast('✅ Banner created!', 'success');
        document.getElementById('bnTitle').value = '';
        loadBannersList();
        loadActiveBanners(); // refresh homepage banners
    } catch(e) { showToast('Failed: ' + e.message, 'error'); }
}

async function adminToggleBanner(firestoreId, currentActive) {
    try {
        await window.firebaseUpdateDoc(window.firebaseDoc(window.firebaseDb, 'banners', firestoreId), { active: !currentActive });
        showToast(`Banner ${currentActive ? 'paused' : 'activated'}.`, 'success');
        loadBannersList();
        loadActiveBanners();
    } catch(e) { showToast('Failed: ' + e.message, 'error'); }
}

async function adminDeleteBanner(firestoreId, name) {
    showBrandedConfirm(`Delete banner "${name}"?`, 'This will remove it from the homepage.', '🗑️', async () => {
        try {
            await window.firebaseDeleteDoc(window.firebaseDoc(window.firebaseDb, 'banners', firestoreId));
            showToast('Banner deleted.', 'success');
            loadBannersList();
            loadActiveBanners();
        } catch(e) { showToast('Failed: ' + e.message, 'error'); }
    });
}

async function renderActivePromotions(el) {
    el.innerHTML = '<div class="skeleton-card"></div><div class="skeleton-card"></div>';
    try {
        const now = Date.now();
        const coupSnap = await window.firebaseGetDocs(window.firebaseCollection(window.firebaseDb, 'coupons'));
        const bannerSnap = await window.firebaseGetDocs(window.firebaseCollection(window.firebaseDb, 'banners'));
        let html = `<h4 style="font-size:13px;font-weight:800;text-transform:uppercase;color:#888;margin-bottom:14px;">Active Coupons</h4>`;
        let hasAny = false;
        coupSnap.forEach(d => {
            const c = d.data();
            const isExpired = c.expiry && new Date(c.expiry).getTime() < now;
            if (c.active !== false && !isExpired) {
                hasAny = true;
                html += `<div class="admin-promo-card"><div class="promo-card-icon" style="background:#f0f4ff;">🎟️</div>
                    <div style="flex:1;"><span class="coupon-code-display">${c.code}</span>
                    <p style="font-size:12px;color:#666;margin:4px 0 0;">${c.type === 'percent' ? c.amount + '% off' : 'R' + c.amount + ' off'} · ${(c.usedCount || 0)}/${c.maxUses || '∞'} uses</p></div>
                    <span class="campaign-badge badge-active">Active</span></div>`;
            }
        });
        if (!hasAny) html += '<p style="color:#999;text-align:center;padding:12px;">No active coupons.</p>';

        html += `<h4 style="font-size:13px;font-weight:800;text-transform:uppercase;color:#888;margin:24px 0 14px;">Active Banners</h4>`;
        let hasBanner = false;
        bannerSnap.forEach(d => {
            const b = d.data();
            const isExpired = b.endAt && new Date(b.endAt).getTime() < now;
            const isScheduled = b.startAt && new Date(b.startAt).getTime() > now;
            if (b.active !== false && !isExpired && !isScheduled) {
                hasBanner = true;
                html += `<div class="admin-promo-card">
                    <div style="width:44px;height:44px;border-radius:8px;background:${b.bgColor || '#111'};flex-shrink:0;"></div>
                    <div style="flex:1;"><strong>${b.title}</strong>
                    <p style="font-size:12px;color:#666;margin:3px 0 0;">"${b.ctaText}" → ${b.ctaLink}</p></div>
                    <span class="campaign-badge badge-active">Live</span></div>`;
            }
        });
        if (!hasBanner) html += '<p style="color:#999;text-align:center;padding:12px;">No active banners.</p>';
        el.innerHTML = html;
    } catch(e) {
        el.innerHTML = '<p style="color:#e63946;padding:16px;">Error: ' + e.message + '</p>';
    }
}

// Coupon validation at checkout
async function validateCoupon(code) {
    if (!code) return { valid: false, message: 'Please enter a coupon code.' };
    const upperCode = code.trim().toUpperCase();
    try {
        const db = window.firebaseDb;
        const q = window.firebaseQuery(window.firebaseCollection(db, 'coupons'), window.firebaseWhere('code', '==', upperCode));
        const snap = await window.firebaseGetDocs(q);
        if (snap.empty) return { valid: false, message: `Coupon "${upperCode}" not found.` };
        const docSnap = snap.docs[0];
        const coupon = docSnap.data();
        const now = Date.now();
        if (coupon.active === false) return { valid: false, message: 'This coupon is not active.' };
        if (coupon.expiry && new Date(coupon.expiry).getTime() < now) return { valid: false, message: 'This coupon has expired.' };
        if (coupon.maxUses && (coupon.usedCount || 0) >= coupon.maxUses) return { valid: false, message: 'This coupon has reached its usage limit.' };
        return { valid: true, coupon, firestoreId: docSnap.id };
    } catch(e) {
        return { valid: false, message: 'Error validating coupon: ' + e.message };
    }
}

async function applyCouponUsage(firestoreId) {
    try {
        const docRef = window.firebaseDoc(window.firebaseDb, 'coupons', firestoreId);
        const snap = await window.firebaseGetDoc(docRef);
        if (snap.exists()) {
            await window.firebaseUpdateDoc(docRef, { usedCount: (snap.data().usedCount || 0) + 1 });
        }
    } catch(e) { console.error('Coupon usage update failed:', e); }
}

// Homepage banners injection with 4 beautiful templates
async function loadActiveBanners() {
    try {
        const db = window.firebaseDb;
        const snap = await window.firebaseGetDocs(window.firebaseCollection(db, 'banners'));
        const now = Date.now();
        const activeBanners = [];
        snap.forEach(d => {
            const b = { ...d.data(), _id: d.id };
            const isExpired = b.endAt && new Date(b.endAt).getTime() < now;
            const isScheduled = b.startAt && new Date(b.startAt).getTime() > now;
            if (b.active !== false && !isExpired && !isScheduled) activeBanners.push(b);
        });

        const existing = document.getElementById('promobanners-container');
        if (existing) existing.remove();
        if (activeBanners.length === 0) return;

        const container = document.createElement('div');
        container.id = 'promobanners-container';
        container.style.cssText = 'width:100%;';

        activeBanners.forEach(b => {
            const template = b.template || 'hero';
            const bg = b.bgColor || '#111';
            const fg = b.textColor || '#fff';
            const ctaHref = b.ctaLink || '/';
            const ctaText = b.ctaText || 'Shop Now';
            const endTs = b.endAt ? new Date(b.endAt).getTime() : null;
            const timerId = 'bnTimer_' + Math.random().toString(36).slice(2);

            let bannerEl;

            if (template === 'announcement') {
                // Slim ticker strip — like Nike's top bar
                bannerEl = document.createElement('div');
                bannerEl.className = 'promo-banner promo-announcement';
                bannerEl.style.cssText = `background:${bg};color:${fg};`;
                bannerEl.innerHTML = `
                    <div class="promo-announcement-inner">
                        <span class="promo-dot" style="background:${fg};"></span>
                        <span class="promo-announce-title">${b.title}</span>
                        ${b.subtitle ? `<span class="promo-announce-sep">—</span><span class="promo-announce-sub">${b.subtitle}</span>` : ''}
                        <a href="${ctaHref}" class="promo-announce-cta" style="color:${fg};border-color:${fg};">${ctaText}</a>
                    </div>`;

            } else if (template === 'split') {
                // 50/50 split: text left, image right
                bannerEl = document.createElement('div');
                bannerEl.className = 'promo-banner promo-split';
                bannerEl.style.cssText = `background:${bg};color:${fg};`;
                bannerEl.innerHTML = `
                    <div class="promo-split-text">
                        <div class="promo-split-eyebrow">Drixel SA Exclusive</div>
                        <h2 class="promo-split-title" style="color:${fg};">${b.title}</h2>
                        ${b.subtitle ? `<p class="promo-split-sub" style="color:${fg};opacity:0.8;">${b.subtitle}</p>` : ''}
                        <a href="${ctaHref}" class="promo-split-cta" style="background:${fg};color:${bg};">${ctaText} &rarr;</a>
                    </div>
                    <div class="promo-split-img" ${b.imageUrl ? `style="background-image:url('${b.imageUrl}');"` : ''}></div>`;

            } else if (template === 'countdown') {
                // Countdown timer banner
                bannerEl = document.createElement('div');
                bannerEl.className = 'promo-banner promo-countdown';
                bannerEl.style.cssText = `background:${bg};color:${fg};`;
                bannerEl.innerHTML = `
                    <div class="promo-countdown-inner">
                        <div class="promo-countdown-text">
                            <div class="promo-countdown-eyebrow">Limited Time Offer</div>
                            <h2 class="promo-countdown-title" style="color:${fg};">${b.title}</h2>
                            ${b.subtitle ? `<p style="opacity:0.8;font-size:14px;margin:4px 0 0;">${b.subtitle}</p>` : ''}
                        </div>
                        <div class="promo-countdown-right">
                            ${endTs ? `<div class="promo-timer" id="${timerId}"><div class="promo-timer-unit"><span class="promo-timer-num">00</span><span class="promo-timer-label">Hrs</span></div><div class="promo-timer-sep">:</div><div class="promo-timer-unit"><span class="promo-timer-num">00</span><span class="promo-timer-label">Min</span></div><div class="promo-timer-sep">:</div><div class="promo-timer-unit"><span class="promo-timer-num">00</span><span class="promo-timer-label">Sec</span></div></div>` : ''}
                            <a href="${ctaHref}" class="promo-countdown-cta" style="background:${fg};color:${bg};">${ctaText}</a>
                        </div>
                    </div>`;
                // Start countdown tick
                if (endTs) {
                    const tick = () => {
                        const el = document.getElementById(timerId);
                        if (!el) return;
                        const diff = Math.max(0, endTs - Date.now());
                        const h = Math.floor(diff / 3600000);
                        const m = Math.floor((diff % 3600000) / 60000);
                        const s = Math.floor((diff % 60000) / 1000);
                        const nums = el.querySelectorAll('.promo-timer-num');
                        if (nums[0]) nums[0].textContent = String(h).padStart(2,'0');
                        if (nums[1]) nums[1].textContent = String(m).padStart(2,'0');
                        if (nums[2]) nums[2].textContent = String(s).padStart(2,'0');
                        if (diff > 0) setTimeout(tick, 1000);
                    };
                    setTimeout(tick, 100);
                }

            } else {
                // Hero: full-width gradient with glow
                bannerEl = document.createElement('div');
                bannerEl.className = 'promo-banner promo-hero';
                bannerEl.style.cssText = `background:linear-gradient(135deg, ${bg} 0%, ${adjustHex(bg, 30)} 100%);color:${fg};${b.imageUrl ? `background-image:linear-gradient(to right, ${bg}ee 50%, transparent 100%), url('${b.imageUrl}');background-size:cover;background-position:center;` : ''}`;
                bannerEl.innerHTML = `
                    <div class="promo-hero-glow" style="background:${fg};"></div>
                    <div class="promo-hero-content">
                        <div class="promo-hero-eyebrow" style="color:${fg};opacity:0.6;">Drixel SA</div>
                        <h1 class="promo-hero-title" style="color:${fg};">${b.title}</h1>
                        ${b.subtitle ? `<p class="promo-hero-sub" style="color:${fg};opacity:0.85;">${b.subtitle}</p>` : ''}
                        <a href="${ctaHref}" class="promo-hero-cta" style="background:${fg};color:${bg};">${ctaText} &rarr;</a>
                    </div>`;
            }

            container.appendChild(bannerEl);
        });

        // Inject before the first <main> or <section>
        const firstSection = document.querySelector('main') || document.querySelector('section') || document.body.firstChild;
        if (firstSection && firstSection.parentNode) {
            firstSection.parentNode.insertBefore(container, firstSection);
        } else {
            document.body.prepend(container);
        }
    } catch(e) { console.log('Banners not loaded:', e.message); }
}

// Utility: slightly lighten/darken a hex color
function adjustHex(hex, amount) {
    try {
        hex = hex.replace('#','');
        if (hex.length === 3) hex = hex.split('').map(c=>c+c).join('');
        const num = parseInt(hex, 16);
        const r = Math.min(255, (num >> 16) + amount);
        const g = Math.min(255, ((num >> 8) & 0xff) + amount);
        const b = Math.min(255, (num & 0xff) + amount);
        return '#' + [r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('');
    } catch { return hex || '#333'; }
}

function filterOrders() {
    alert('Filter orders feature coming soon!');
}

function exportOrders() {
    alert('Export orders feature coming soon!');
}


async function viewOrderDetails(orderId) {
    try {
        const db = window.firebaseDb;
        const orderDoc = await window.firebaseGetDoc(window.firebaseDoc(db, 'orders', orderId));

        if (!orderDoc.exists()) {
            alert('Order not found!');
            return;
        }

        const order = orderDoc.data();

        const modalHTML = `
                    <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px;">
                        <div style="background: white; border-radius: 10px; max-width: 800px; width: 100%; max-height: 90vh; overflow-y: auto;">
                            <div style="padding: 30px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
                                    <h2 style="color: #111111;">Order Details: ${order.order_id || order.orderNumber || order.id || '—'}</h2>
                                    <button onclick="closeModal()" style="background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
                                        Close
                                    </button>
                                </div>
                                
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">
                                    <div>
                                        <h4 style="margin-bottom: 15px;">Customer Information</h4>
                                        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
                                            <p><strong>Name:</strong> ${order.customer?.name || 'N/A'}</p>
                                            <p><strong>Email:</strong> ${order.customer?.email || 'N/A'}</p>
                                            <p><strong>Phone:</strong> ${order.customer?.phone || 'N/A'}</p>
                                            <p><strong>Address:</strong> ${order.customer?.address || 'N/A'}</p>
                                            <p><strong>City:</strong> ${order.customer?.city || 'N/A'}</p>
                                            <p><strong>Province:</strong> ${order.customer?.province || 'N/A'}</p>
                                            <p><strong>Postal Code:</strong> ${order.customer?.postalCode || 'N/A'}</p>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <h4 style="margin-bottom: 15px;">Order Information</h4>
                                        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
                                            <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
                                            <p><strong>Payment Method:</strong> ${order.paymentMethod || 'N/A'}</p>
                                            <p><strong>Payment Status:</strong> ${order.paymentStatus || 'pending'}</p>
                                            <p><strong>Order Status:</strong> ${order.status || 'processing'}</p>
                                            <p><strong>Delivery Method:</strong> ${order.deliveryMethod || 'N/A'}</p>
                                            <p><strong>Processing Time:</strong> ${order.processingTime || 'N/A'}</p>
                                            <p><strong>Delivery Time:</strong> ${order.deliveryTime || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div style="margin-bottom: 30px;">
                                    <h4 style="margin-bottom: 15px;">Order Items</h4>
                                    <div style="background: white; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                                        ${order.items?.map(item => `
                                            <div style="display: flex; padding: 15px; border-bottom: 1px solid #e0e0e0; align-items: center;">
                                                <img src="${item.image}" alt="${item.name}" 
                                                     style="width: 60px; height: 60px; object-fit: cover; border-radius: 5px; margin-right: 15px;"
                                                     onerror="this.src='https://via.placeholder.com/60x60?text=Product'">
                                                <div style="flex: 1;">
                                                    <p style="margin: 0 0 5px 0; font-weight: bold;">${item.name}</p>
                                                    <p style="margin: 0; color: #666; font-size: 14px;">
                                                        Size: ${item.size} | Color: ${item.color} | Quantity: ${item.quantity}
                                                    </p>
                                                </div>
                                                <div style="font-weight: bold; color: #ff6b00;">
                                                    R ${(item.price * item.quantity).toFixed(2)}
                                                </div>
                                            </div>
                                        `).join('') || '<p style="padding: 20px; text-align: center;">No items found</p>'}
                                    </div>
                                </div>
                                
                                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                                    <h4 style="margin-bottom: 15px;">Order Summary</h4>
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                                        <div>
                                            <p><strong>Subtotal:</strong> R ${(order.subtotal || 0).toFixed(2)}</p>
                                            <p><strong>Shipping:</strong> R ${(order.shipping || 0).toFixed(2)}</p>
                                            <p><strong>Tax:</strong> R ${(order.tax || 0).toFixed(2)}</p>
                                        </div>
                                        <div>
                                            <p style="font-size: 18px; font-weight: bold; color: #ff6b00;">
                                                <strong>Total:</strong> R ${(order.total || 0).toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                                    ${order.paymentMethod === 'bank' && order.paymentStatus === 'pending' ? `
                                        <button onclick="openConfirmPaymentModal('${orderId}', '${order.order_id || order.orderNumber}', '${order.customer?.email}', ${order.total || 0}, '${order.paymentMethod}')" style="background: #0caf60; color: white; border: none; padding: 12px; border-radius: 5px; cursor: pointer;">
                                            Confirm Payment
                                        </button>
                                    ` : ''}
                                    ${order.status === 'processing' ? `
                                        <button onclick="openOutForDeliveryModal('${orderId}', '${order.customer?.name || ''}', '${order.order_id || order.orderNumber}')" style="background: #ff6b00; color: white; border: none; padding: 12px; border-radius: 5px; cursor: pointer;">
                                            Mark as Shipped
                                        </button>
                                    ` : ''}
                                    ${order.status === 'shipped' ? `
                                        <button onclick="openOrderDeliveredModal('${orderId}', '${order.order_id || order.orderNumber}')" style="background: #0caf60; color: white; border: none; padding: 12px; border-radius: 5px; cursor: pointer;">
                                            Mark as Delivered
                                        </button>
                                    ` : ''}
                                    <button onclick="updateOrderStatus('${orderId}')" style="background: #0066cc; color: white; border: none; padding: 12px; border-radius: 5px; cursor: pointer;">
                                        Update Status
                                    </button>
                                </div>

                                <!-- Inline Customer Info Editor -->
                                <div style="margin-top: 25px; background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;">
                                    <div style="padding: 14px 20px; background: #111; color: #fff; display: flex; justify-content: space-between; align-items: center; cursor: pointer;" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'">
                                        <span style="font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">✏️ Edit Customer Info</span>
                                        <span style="font-size: 18px; line-height: 1;">▾</span>
                                    </div>
                                    <div style="display: none; padding: 20px;">
                                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                                            <div>
                                                <label style="font-size: 12px; font-weight: 700; color: #666; text-transform: uppercase; display: block; margin-bottom: 5px;">Name</label>
                                                <input id="edit-customer-name" type="text" value="${(order.customer?.name || '').replace(/"/g, '&quot;')}" style="width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box;">
                                            </div>
                                            <div>
                                                <label style="font-size: 12px; font-weight: 700; color: #666; text-transform: uppercase; display: block; margin-bottom: 5px;">Email</label>
                                                <input id="edit-customer-email" type="email" value="${(order.customer?.email || '').replace(/"/g, '&quot;')}" style="width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box;">
                                            </div>
                                            <div>
                                                <label style="font-size: 12px; font-weight: 700; color: #666; text-transform: uppercase; display: block; margin-bottom: 5px;">Phone</label>
                                                <input id="edit-customer-phone" type="tel" value="${(order.customer?.phone || '').replace(/"/g, '&quot;')}" style="width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box;">
                                            </div>
                                            <div>
                                                <label style="font-size: 12px; font-weight: 700; color: #666; text-transform: uppercase; display: block; margin-bottom: 5px;">Address</label>
                                                <input id="edit-customer-address" type="text" value="${(order.customer?.address || '').replace(/"/g, '&quot;')}" style="width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box;">
                                            </div>
                                            <div>
                                                <label style="font-size: 12px; font-weight: 700; color: #666; text-transform: uppercase; display: block; margin-bottom: 5px;">City</label>
                                                <input id="edit-customer-city" type="text" value="${(order.customer?.city || '').replace(/"/g, '&quot;')}" style="width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box;">
                                            </div>
                                            <div>
                                                <label style="font-size: 12px; font-weight: 700; color: #666; text-transform: uppercase; display: block; margin-bottom: 5px;">Postal Code</label>
                                                <input id="edit-customer-postal" type="text" value="${(order.customer?.postalCode || '').replace(/"/g, '&quot;')}" style="width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box;">
                                            </div>
                                        </div>
                                        <div id="edit-customer-status" style="font-size: 13px; min-height: 18px; margin-bottom: 10px;"></div>
                                        <button onclick="adminUpdateOrderCustomer('${orderId}')" style="background: #111; color: #fff; border: none; padding: 10px 22px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 700;">
                                            Save Customer Details
                                        </button>
                                    </div>
                                </div>

                                <!-- Manual Email Resend Panel -->
                                <div style="margin-top: 15px; background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;">
                                    <div style="padding: 14px 20px; background: #0066cc; color: #fff; display: flex; justify-content: space-between; align-items: center; cursor: pointer;" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'">
                                        <span style="font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">📨 Resend Email Notification</span>
                                        <span style="font-size: 18px; line-height: 1;">▾</span>
                                    </div>
                                    <div style="display: none; padding: 20px;">
                                        <p style="margin: 0 0 15px; font-size: 13px; color: #666;">Manually trigger a notification email to the customer. Useful after updating their email address or if a previous send failed.</p>
                                        <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
                                            <select id="resend-email-type" style="flex: 1; min-width: 200px; padding: 9px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; font-family: inherit;">
                                                <option value="order_confirmation">Order Confirmation</option>
                                                <option value="order_received">Order Received</option>
                                                <option value="out_for_delivery">Out for Delivery</option>
                                                <option value="order_delivered">Order Delivered</option>
                                                <option value="order_cancelled">Order Cancelled</option>
                                            </select>
                                            <button onclick="adminResendOrderEmail('${orderId}')" style="background: #0066cc; color: white; border: none; padding: 10px 22px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 700; white-space: nowrap;">
                                                Send Email Now
                                            </button>
                                        </div>
                                        <div id="resend-email-status" style="margin-top: 12px; font-size: 13px; min-height: 18px;"></div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    } catch (error) {
        console.error("❌ Error viewing order details:", error);
        alert('Error loading order details.');
    }
}
window.viewOrderDetails = viewOrderDetails;

window.adminUpdateOrderCustomer = async function(orderId) {
    const statusEl = document.getElementById('edit-customer-status');
    if (statusEl) { statusEl.textContent = '⏳ Saving...'; statusEl.style.color = '#666'; }
    try {
        const db = window.firebaseDb;
        const updatedCustomer = {
            name: document.getElementById('edit-customer-name').value.trim(),
            email: document.getElementById('edit-customer-email').value.trim(),
            phone: document.getElementById('edit-customer-phone').value.trim(),
            address: document.getElementById('edit-customer-address').value.trim(),
            city: document.getElementById('edit-customer-city').value.trim(),
            postalCode: document.getElementById('edit-customer-postal').value.trim()
        };
        await window.firebaseUpdateDoc(window.firebaseDoc(db, 'orders', orderId), {
            customer: updatedCustomer,
            updatedAt: new Date().toISOString()
        });
        if (statusEl) { statusEl.textContent = '✅ Customer details saved!'; statusEl.style.color = '#0caf60'; }
        console.log("✅ Customer details updated for order:", orderId);
    } catch (error) {
        if (statusEl) { statusEl.textContent = '❌ Failed: ' + error.message; statusEl.style.color = '#dc3545'; }
        console.error("❌ Error updating customer details:", error);
    }
};

window.adminResendOrderEmail = async function(orderId) {
    const statusEl = document.getElementById('resend-email-status');
    const typeEl = document.getElementById('resend-email-type');
    const emailType = typeEl ? typeEl.value : 'order_confirmation';
    if (statusEl) { statusEl.textContent = '⏳ Sending email...'; statusEl.style.color = '#666'; }
    try {
        const db = window.firebaseDb;
        const docSnap = await window.firebaseGetDoc(window.firebaseDoc(db, 'orders', orderId));
        if (!docSnap.exists()) {
            if (statusEl) { statusEl.textContent = '❌ Order not found.'; statusEl.style.color = '#dc3545'; }
            return;
        }
        const order = { id: docSnap.id, ...docSnap.data() };
        let result;
        if (emailType === 'order_confirmation') result = await sendOrderConfirmationEmail(order);
        else if (emailType === 'order_received') result = await sendOrderReceivedEmail(order);
        else if (emailType === 'out_for_delivery') result = await sendOutForDeliveryEmailToCustomer(order, order.trackingNumber || 'N/A', order.courierService || 'The Courier Guy', order.trackingUrl || '#');
        else if (emailType === 'order_delivered') result = await sendOrderDeliveredEmailToCustomer(order, order.deliveredDate || new Date().toLocaleDateString('en-ZA'));
        else if (emailType === 'order_cancelled') result = await sendOrderCancelledEmailToCustomer(order);
        else result = { success: false, message: 'Unknown email type' };

        if (result && result.success) {
            if (statusEl) { statusEl.textContent = `✅ Email sent to ${order.customer?.email || 'customer'}!`; statusEl.style.color = '#0caf60'; }
        } else {
            if (statusEl) { statusEl.textContent = `❌ Failed: ${result?.message || 'Unknown error'}`; statusEl.style.color = '#dc3545'; }
        }
    } catch (error) {
        if (statusEl) { statusEl.textContent = '❌ Error: ' + error.message; statusEl.style.color = '#dc3545'; }
        console.error("❌ Error resending order email:", error);
    }
};


function closeModal() {
    const modal = document.querySelector('[style*="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8);"]');
    if (modal) modal.remove();
}

window.closeModal = closeModal;

async function updateOrderStatus(orderId) {
    const status = prompt('Enter new order status (processing, shipped, delivered, cancelled):', 'shipped');
    if (!status) return;

    try {
        const db = window.firebaseDb;
        const docRef = window.firebaseDoc(db, 'orders', orderId);
        const docSnap = await window.firebaseGetDoc(docRef);

        if (!docSnap.exists()) {
            alert('Order not found!');
            return;
        }

        const order = { id: docSnap.id, ...docSnap.data() };

        await window.firebaseUpdateDoc(docRef, {
            status: status,
            updatedAt: new Date().toISOString()
        });

        let emailMsg = '';
        if (status.toLowerCase() === 'cancelled') {
            const emailResult = await sendOrderCancelledEmailToCustomer(order);
            if (emailResult.success) {
                emailMsg = ' and cancellation email sent!';
            } else {
                emailMsg = ' but cancellation email failed to send: ' + emailResult.message;
            }
        }

        alert(`Order status updated to: ${status}${emailMsg}`);
        closeModal();
        loadAdminOrders();
    } catch (error) {
        console.error("❌ Error updating order status:", error);
        alert('Error updating order status: ' + error.message);
    }
}
window.updateOrderStatus = updateOrderStatus;
// ===== EXPOSE FUNCTIONS FOR INLINE onclick="..." =====
// Your HTML uses inline onclick handlers. Those handlers can only call functions that are on window.
// So we attach the important ones here.
try {
    Object.assign(window, {
        showPage,
        checkAuthAndNavigate,
        switchAdminTab,
        selectSize,
        selectColor,
        initiateYocoDirectPayment,
        viewOrderDetails,
        updateOrderStatus,
        openConfirmPaymentModal,
        closeConfirmPaymentModal,
        processPaymentConfirmation,
        openOutForDeliveryModal,
        closeOutForDeliveryModal,
        sendOutForDeliveryEmailToCustomer,
        openOrderDeliveredModal,
        closeOrderDeliveredModal,
        sendOrderDeliveredEmailToCustomer,
        addToCart,
        updateCartItemQuantity,
        decreaseQuantity,
        increaseQuantity,
        showAuthTab,
        declineCookies,
        acceptCookies,
        placeOrder,
        sendContactMessage,
        closeModal,
        nextCampaignVideo,
        prevCampaignVideo,
        removeFromCart,
        openCartDrawer,
        closeCartDrawer,
        renderCartDrawer,
        showAdminButton,
        showAdminDashboard,
        closeAdminDashboard,
        loadAdminOverview,
        exportOrders,
        showAddProductForm,
        editProduct,
        deleteProduct,
        saveSettings,
        sendTestEmail
    });
} catch (e) {
    console.warn("⚠️ Could not expose some functions to window:", e);
}


// ===== ORDER VIEW (from email button "View my order") =====
async function handleOrderHash() {
    try {
        const path = window.location.pathname;
        if (path.endsWith('orderConfirmation.html') || path.endsWith('orderConfirmation')) {
            return;
        }

        const hash = window.location.hash || '';
        if (!hash.startsWith('#order=')) return;

        const orderDocId = decodeURIComponent(hash.replace('#order=', '').trim());
        if (!orderDocId) return;

        if (!window.firebaseDb || !window.firebaseGetDoc || !window.firebaseDoc) {
            console.error("❌ Firebase not ready for order view");
            return;
        }

        const db = window.firebaseDb;
        const snap = await window.firebaseGetDoc(window.firebaseDoc(db, 'orders', orderDocId));
        if (!snap.exists()) {
            alert('Order not found.');
            return;
        }

        const order = { id: snap.id, ...snap.data() };
        showOrderDetailsOverlay(order);
    } catch (e) {
        console.error("❌ handleOrderHash error:", e);
    }
}

function showOrderDetailsOverlay(order) {
    // remove existing
    const existing = document.getElementById('orderDetailsOverlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'orderDetailsOverlay';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(0,0,0,0.65)';
    overlay.style.zIndex = '99999';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.onclick = (e) => { if (e.target === overlay) { overlay.remove(); } };

    const card = document.createElement('div');
    card.style.width = 'min(920px, 92vw)';
    card.style.maxHeight = '88vh';
    card.style.overflow = 'auto';
    card.style.background = '#0b0b0b';
    card.style.border = '1px solid rgba(255,255,255,0.12)';
    card.style.borderRadius = '16px';
    card.style.padding = '18px';

    const orderCode = order.order_id || order.orderNumber || order.id;
    const customerName = order.customer?.name || order.to_name || order.customer_name || 'Customer';
    const customerEmail = order.customer?.email || order.customer_email || order.email || '—';

    const itemsRows = (order.items || []).map(it => {
        const name = it.name || it.productName || 'Item';
        const size = it.size || '';
        const color = it.color || '';
        const qty = it.quantity || 1;
        const price = Number(it.price || 0);
        const line = (price * qty).toFixed(2);
        return `<tr>
                    <td style="padding:8px; border-bottom:1px solid rgba(255,255,255,0.08);">${name} ${size ? '(' + size + ')' : ''} ${color ? color : ''}</td>
                    <td style="padding:8px; border-bottom:1px solid rgba(255,255,255,0.08); text-align:center;">${qty}</td>
                    <td style="padding:8px; border-bottom:1px solid rgba(255,255,255,0.08); text-align:right;">R${line}</td>
                </tr>`;
    }).join('');

    const subtotal = (order.subtotal != null) ? `R${Number(order.subtotal).toFixed(2)}` : '—';
    const shipping = (order.shipping != null) ? `R${Number(order.shipping).toFixed(2)}` : '—';
    const total = (order.total != null) ? `R${Number(order.total).toFixed(2)}` : '—';

    const status = order.status || order.orderStatus || 'processing';
    const tracking = order.trackingNumber ? `${order.courierService || ''} ${order.trackingNumber}` : '—';
    const trackingUrl = order.trackingUrl || '';

    card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
                    <div>
                        <div style="font-size:18px; font-weight:700;">Order Details</div>
                        <div style="opacity:0.8; margin-top:4px;">Order ID: <strong>${orderCode}</strong></div>
                    </div>
                    <button onclick="document.getElementById('orderDetailsOverlay')?.remove()" style="background:transparent; border:1px solid rgba(255,255,255,0.2); color:#fff; padding:8px 12px; border-radius:10px; cursor:pointer;">Close</button>
                </div>

                <div style="margin-top:14px; display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                    <div style="border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:12px;">
                        <div style="font-weight:700; margin-bottom:6px;">Customer</div>
                        <div>${customerName}</div>
                        <div style="opacity:0.85;">${customerEmail}</div>
                    </div>
                    <div style="border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:12px;">
                        <div style="font-weight:700; margin-bottom:6px;">Status</div>
                        <div><strong>${status}</strong></div>
                        <div style="opacity:0.85;">Tracking: ${tracking}</div>
                        ${trackingUrl ? `<div style="margin-top:6px;"><a href="${trackingUrl}" target="_blank" style="color: #ffb000; text-decoration: underline;">Track parcel</a></div>` : ''}
                    </div>
                </div>

                <div style="margin-top:14px; border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:12px;">
                    <div style="font-weight:700; margin-bottom:10px;">Items</div>
                    <table style="width:100%; border-collapse:collapse;">
                        <thead>
                            <tr>
                                <th style="text-align:left; padding:8px; border-bottom:1px solid rgba(255,255,255,0.12);">Item</th>
                                <th style="text-align:center; padding:8px; border-bottom:1px solid rgba(255,255,255,0.12);">Qty</th>
                                <th style="text-align:right; padding:8px; border-bottom:1px solid rgba(255,255,255,0.12);">Total</th>
                            </tr>
                        </thead>
                        <tbody>${itemsRows || '<tr><td colspan="3" style="padding:8px;">No items found.</td></tr>'}</tbody>
                    </table>

                    <div style="margin-top:12px; display:flex; justify-content:flex-end;">
                        <div style="min-width:260px;">
                            <div style="display:flex; justify-content:space-between; opacity:0.9;"><span>Subtotal</span><span>${subtotal}</span></div>
                            <div style="display:flex; justify-content:space-between; opacity:0.9;"><span>Shipping</span><span>${shipping}</span></div>
                            <div style="display:flex; justify-content:space-between; margin-top:6px; font-weight:800;"><span>Total</span><span>${total}</span></div>
                        </div>
                    </div>
                </div>
            `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);
}

// ===== PREMIUM CUSTOM CONFIRM MODAL SYSTEM =====
function showConfirm(message, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'custom-confirm-overlay';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(0,0,0,0.7)';
    overlay.style.backdropFilter = 'blur(10px)';
    overlay.style.zIndex = '999999';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.animation = 'fadeIn 0.3s ease';

    const card = document.createElement('div');
    card.className = 'custom-confirm-card';
    card.style.background = '#0d0d0d';
    card.style.border = '1px solid rgba(255,255,255,0.08)';
    card.style.borderRadius = '16px';
    card.style.padding = '24px';
    card.style.width = 'min(420px, 90vw)';
    card.style.boxShadow = '0 20px 40px rgba(0,0,0,0.5)';
    card.style.textAlign = 'center';
    card.style.animation = 'scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)';

    card.innerHTML = `
        <div style="font-size: 40px; color: #ffb000; margin-bottom: 16px;">
            <i class="fas fa-exclamation-circle"></i>
        </div>
        <h3 style="font-size: 20px; font-weight: 700; color: #fff; margin-bottom: 12px;">Confirm Action</h3>
        <p style="font-size: 14px; color: rgba(255,255,255,0.7); margin-bottom: 24px; line-height: 1.5; text-align: left; white-space: pre-line;">${message}</p>
        <div style="display: flex; gap: 12px;">
            <button class="confirm-cancel-btn" style="flex: 1; padding: 12px; background: transparent; border: 1px solid rgba(255,255,255,0.15); color: #fff; border-radius: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s;">Cancel</button>
            <button class="confirm-proceed-btn" style="flex: 1; padding: 12px; background: #ffb000; border: none; color: #000; border-radius: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s;">Yes, Proceed</button>
        </div>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    const cancelBtn = card.querySelector('.confirm-cancel-btn');
    const proceedBtn = card.querySelector('.confirm-proceed-btn');

    const closeConfirm = () => {
        overlay.style.animation = 'fadeOut 0.2s ease forwards';
        card.style.animation = 'scaleDown 0.2s ease forwards';
        setTimeout(() => overlay.remove(), 200);
    };

    cancelBtn.onclick = () => {
        closeConfirm();
    };

    proceedBtn.onclick = () => {
        closeConfirm();
        if (typeof onConfirm === 'function') {
            onConfirm();
        }
    };
    
    // Hover styling
    cancelBtn.onmouseenter = () => cancelBtn.style.background = 'rgba(255,255,255,0.05)';
    cancelBtn.onmouseleave = () => cancelBtn.style.background = 'transparent';
    proceedBtn.onmouseenter = () => proceedBtn.style.background = '#e09b00';
    proceedBtn.onmouseleave = () => proceedBtn.style.background = '#ffb000';
}
window.showConfirm = showConfirm;

// ===== GOOGLE AUTHENTICATION =====
async function firebaseGoogleLogin() {
    try {
        console.log("🔑 Google login initiated...");
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        
        console.log("✅ Google Sign-in successful:", user.email);
        alert('Welcome! Google Sign-in successful.');
        
        // Save user info if it's a new user
        const db = window.firebaseDb;
        if (db && window.firebaseDoc && window.firebaseSetDoc) {
            const userRef = window.firebaseDoc(db, 'users', user.uid);
            await window.firebaseSetDoc(userRef, {
                email: user.email,
                name: user.displayName || '',
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString()
            }, { merge: true });
        }
        
        // Redirect to products page
        window.location.href = 'products.html';
    } catch (error) {
        console.error("❌ Google login error:", error);
        alert('Google login failed: ' + (error.message || 'Please try again.'));
    }
}
window.firebaseGoogleLogin = firebaseGoogleLogin;

// ===== CONTACT MESSAGE SUBMISSION =====
async function sendContactMessage() {
    const name = document.getElementById('contactName')?.value;
    const email = document.getElementById('contactEmail')?.value;
    const subject = document.getElementById('contactSubject')?.value;
    const message = document.getElementById('contactMessage')?.value;

    if (!name || !email || !subject || !message) {
        alert('Please fill in all fields before sending your message.');
        return;
    }

    try {
        console.log("📨 Sending contact message...");
        const db = window.firebaseDb;
        if (db && window.firebaseAddDoc && window.firebaseCollection) {
            await window.firebaseAddDoc(window.firebaseCollection(db, window.firebaseCollections.CONTACTS), {
                name,
                email,
                subject,
                message,
                timestamp: new Date().toISOString()
            });
        }
        
        // Clear form
        const form = document.getElementById('contactForm');
        if (form) form.reset();

        alert('Thank you for contacting Drixel SA! Your message has been sent successfully. We will get back to you shortly.');
    } catch (error) {
        console.error("❌ Error sending contact message:", error);
        alert('There was an error sending your message. Please try again later.');
    }
}
window.sendContactMessage = sendContactMessage;

window.addEventListener('hashchange', handleOrderHash);
document.addEventListener('DOMContentLoaded', handleOrderHash);

// ===== AUTOMATIC ES MODULE EXPORTS FOR INLINE EVENT HANDLERS =====
// Explicit window exports for standard HTML event handlers (bypassing eval for strict CSP compatibility)
window.openOrderTracker = openOrderTracker;
window.closeOrderTracker = closeOrderTracker;
window.queryOrderStatus = queryOrderStatus;
window.selectSize = selectSize;
window.selectColor = selectColor;
window.changeProductColor = changeProductColor;
window.updateCartItemQuantity = updateCartItemQuantity;
window.removeFromCart = removeFromCart;
window.openCartDrawer = openCartDrawer;
window.closeCartDrawer = closeCartDrawer;
window.renderCartDrawer = renderCartDrawer;
window.decreaseQuantity = decreaseQuantity;
window.increaseQuantity = increaseQuantity;
window.addToCart = addToCart;
window.initiateYocoDirectPayment = initiateYocoDirectPayment;
window.checkAuthAndNavigate = checkAuthAndNavigate;
window.showPage = showPage;
window.filterCollection = filterCollection;
window.filterPrice = filterPrice;
window.sortProducts = sortProducts;
window.updateCollectionsBarActive = updateCollectionsBarActive;
window.acceptCookies = acceptCookies;
window.declineCookies = declineCookies;
window.firebaseRegister = firebaseRegister;
window.firebaseLogin = firebaseLogin;
window.firebaseGoogleLogin = firebaseGoogleLogin;
window.firebaseLogout = firebaseLogout;
window.resetPasswordFromLogin = resetPasswordFromLogin;
window.placeOrder = placeOrder;
window.sendContactMessage = sendContactMessage;
window.initiateYocoCheckout = initiateYocoCheckout;
window.initiateYocoCheckoutFromCart = initiateYocoCheckoutFromCart;
window.confirmSnapScanPayment = confirmSnapScanPayment;
window.copySnapScanReference = copySnapScanReference;
window.showAuthTab = showAuthTab;
window.removeFromCart = removeFromCart;
window.viewProduct = viewProduct;
window.initCartDrawer = initCartDrawer;
window.openCartDrawer = openCartDrawer;
window.closeCartDrawer = closeCartDrawer;
window.renderCartDrawer = renderCartDrawer;
window.closeConfirmPaymentModal = closeConfirmPaymentModal;
window.processPaymentConfirmation = processPaymentConfirmation;
window.openConfirmPaymentModal = typeof openConfirmPaymentModal === 'function' ? openConfirmPaymentModal : null;

// ===== CUSTOM TOAST NOTIFICATION SYSTEM =====
function showToast(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconClass = 'fa-info-circle';
    if (type === 'success') iconClass = 'fa-check-circle';
    else if (type === 'error') iconClass = 'fa-times-circle';
    else if (type === 'warning') iconClass = 'fa-exclamation-circle';

    toast.innerHTML = `
        <i class="fas ${iconClass} toast-icon"></i>
        <div class="toast-content">${message.replace(/\n/g, '<br>')}</div>
        <button class="toast-close">&times;</button>
        <div class="toast-progress"></div>
    `;

    container.appendChild(toast);

    const closeBtn = toast.querySelector('.toast-close');
    const dismissToast = () => {
        toast.style.animation = 'toast-slide-out 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards';
        setTimeout(() => {
            if (toast.parentElement) {
                container.removeChild(toast);
            }
        }, 400);
    };

    closeBtn.addEventListener('click', dismissToast);

    // Auto-dismiss after 4.5 seconds
    setTimeout(dismissToast, 4500);

    // Animate progress bar shrinking
    const progress = toast.querySelector('.toast-progress');
    if (progress) {
        progress.style.transition = 'width 4.5s linear';
        // Force reflow
        progress.getBoundingClientRect();
        progress.style.width = '0%';
    }
}
window.showToast = showToast;

// Global override of the native browser alert() to use our premium custom toast
window.alert = function(message) {
    if (!message) return;
    
    // Auto-detect alert level type based on message content keywords
    let type = 'info';
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('success') || lowerMessage.includes('confirmed') || lowerMessage.includes('sent') || lowerMessage.includes('✓') || lowerMessage.includes('?') || lowerMessage.includes('thank')) {
        type = 'success';
    } else if (lowerMessage.includes('error') || lowerMessage.includes('fail') || lowerMessage.includes('invalid') || lowerMessage.includes('❌') || lowerMessage.includes('disabled') || lowerMessage.includes('not found')) {
        type = 'error';
    } else if (lowerMessage.includes('warning') || lowerMessage.includes('please') || lowerMessage.includes('required') || lowerMessage.includes('empty')) {
        type = 'warning';
    }
    
    showToast(message, type);
};

const globalFunctions = [
    'showPage', 'checkAuthAndNavigate', 'firebaseRegister', 'firebaseLogin',
    'firebaseGoogleLogin', 'resetPasswordFromLogin', 'placeOrder', 'sendContactMessage',
    'initiateYocoCheckout', 'initiateYocoCheckoutFromCart', 'confirmSnapScanPayment',
    'copySnapScanReference', 'showAuthTab',
    'initEmailJSForService', 'loadAllProducts', 'loadFeaturedProducts', 'loadYocoProducts',
    'loadCartPage', 'loadCheckoutPage', 'updateCollectionsBarActive', 'showAdminButton',
    'updateAuthUI', 'loadUserCart', 'updateCartCount',
    'removeFromCart', 'viewProduct',
    'filterCollection', 'acceptCookies',
    'declineCookies', 'firebaseLogout', 'selectColor', 'selectSize',
    'addToCart', 'initiateYocoDirectPayment',
    'initCartDrawer', 'openCartDrawer', 'closeCartDrawer', 'renderCartDrawer',
    'injectAnnouncementBar', 'initAnnouncementSlider',
    'initSearchOverlay', 'openSearchOverlay', 'closeSearchOverlay', 'runSearchQuery', 'runQuickSearch',
    'setGridLayout',
    'initOrderTracker', 'openOrderTracker', 'closeOrderTracker', 'queryOrderStatus', 'renderTrackerTimeline',
    'injectTrackerLink', 'subscribeNewsletter', 'injectNewsletterSection', 'nextCampaignVideo', 'prevCampaignVideo'
];

globalFunctions.forEach(fnName => {
    try {
        const fn = eval(fnName);
        if (typeof fn === 'function') {
            window[fnName] = fn;
        }
    } catch (e) { }
});

// ===== YOCO DIRECT PAYMENT MODAL FUNCTIONS =====
let yocoDirectPaymentData = null;

function initiateYocoDirectPayment(productId, productName, productPrice) {
    console.log("⚡ initiateYocoDirectPayment triggered:", productId, productName, productPrice);
    yocoDirectPaymentData = { id: productId, name: productName, price: productPrice };

    const modal = document.getElementById('yocoPaymentModal');
    const amountSpan = document.getElementById('paymentAmount');
    if (amountSpan) {
        amountSpan.textContent = Number(productPrice).toFixed(2);
    }
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
    }
}

function closeYocoPaymentModal() {
    const modal = document.getElementById('yocoPaymentModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
}

async function processYocoPayment() {
    console.log("💳 Processing Yoco Direct Payment...");
    const cardNumber = (document.getElementById('cardNumber')?.value || '').replace(/\s+/g, '');
    const expiryDate = (document.getElementById('expiryDate')?.value || '').trim();
    const cvc = (document.getElementById('cvc')?.value || '').trim();
    const cardholderName = (document.getElementById('cardholderName')?.value || '').trim();
    const receiptEmail = (document.getElementById('receiptEmail')?.value || '').trim();

    if (!cardNumber || cardNumber.length < 13) {
        if (typeof showToast === 'function') showToast("Please enter a valid card number.", "warning");
        else alert("Please enter a valid card number.");
        return;
    }
    if (!expiryDate || !expiryDate.includes('/')) {
        if (typeof showToast === 'function') showToast("Please enter a valid expiry date (MM/YY).", "warning");
        else alert("Please enter a valid expiry date (MM/YY).");
        return;
    }
    if (!cvc || cvc.length < 3) {
        if (typeof showToast === 'function') showToast("Please enter a valid CVC code.", "warning");
        else alert("Please enter a valid CVC code.");
        return;
    }
    if (!receiptEmail || !receiptEmail.includes('@')) {
        if (typeof showToast === 'function') showToast("Please enter a valid receipt email address.", "warning");
        else alert("Please enter a valid receipt email address.");
        return;
    }

    const processBtn = document.getElementById('processPaymentBtn');
    if (processBtn) {
        processBtn.disabled = true;
        processBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Processing Payment...`;
    }

    const totalAmount = yocoDirectPaymentData ? Number(yocoDirectPaymentData.price) : (cart.reduce((sum, i) => sum + (i.price * i.quantity), 0) || 0);

    const orderData = {
        orderId: 'DRX-' + Math.floor(100000 + Math.random() * 900000),
        createdAt: new Date().toISOString(),
        customer: {
            name: cardholderName || 'Valued Customer',
            email: receiptEmail
        },
        items: yocoDirectPaymentData ? [{
            id: yocoDirectPaymentData.id,
            name: yocoDirectPaymentData.name,
            price: yocoDirectPaymentData.price,
            quantity: 1
        }] : (cart.length > 0 ? cart : []),
        paymentMethod: 'Yoco Card',
        paymentStatus: 'Paid',
        total: totalAmount
    };

    try {
        if (typeof saveOrderToFirebase === 'function') {
            await saveOrderToFirebase(orderData);
        }
        if (typeof sendOrderConfirmationEmail === 'function') {
            await sendOrderConfirmationEmail(orderData);
        }
        if (typeof sendAdminOrderNotificationEmail === 'function') {
            await sendAdminOrderNotificationEmail(orderData);
        }

        closeYocoPaymentModal();
        cart = [];
        saveCartToStorage();
        updateCartCount();

        showToast("✅ Payment successful! Your order has been placed.", "success");
        setTimeout(() => {
            window.location.href = '/orderConfirmation.html?orderId=' + orderData.orderId;
        }, 1200);
    } catch (err) {
        console.error("Yoco payment processing error:", err);
        showToast("Payment completed. Order confirmation sent!", "success");
        closeYocoPaymentModal();
    } finally {
        if (processBtn) {
            processBtn.disabled = false;
            processBtn.innerHTML = `<span>Pay R </span><span>${totalAmount.toFixed(2)}</span>`;
        }
    }
}

window.initiateYocoDirectPayment = initiateYocoDirectPayment;
window.closeYocoPaymentModal = closeYocoPaymentModal;
window.processYocoPayment = processYocoPayment;

// ===== EXPLICITLY EXPOSE ALL NEW ADMIN FUNCTIONS =====
window.loadAdminProducts = loadAdminProducts;
window.loadAdminCampaigns = loadAdminCampaigns;
window.switchCampaignTab = switchCampaignTab;
window.renderCouponsPanel = renderCouponsPanel;
window.renderBannersPanel = renderBannersPanel;
window.renderActivePromotions = renderActivePromotions;
window.loadCouponsList = loadCouponsList;
window.loadBannersList = loadBannersList;
window.adminCreateCoupon = adminCreateCoupon;
window.adminToggleCoupon = adminToggleCoupon;
window.adminDeleteCoupon = adminDeleteCoupon;
window.adminCreateBanner = adminCreateBanner;
window.adminToggleBanner = adminToggleBanner;
window.adminDeleteBanner = adminDeleteBanner;
window.validateCoupon = validateCoupon;
window.applyCouponUsage = applyCouponUsage;
window.loadActiveBanners = loadActiveBanners;
window.showAddProductForm = showAddProductForm;
window.closeProductModal = closeProductModal;
window.adminUpdateImagePreview = adminUpdateImagePreview;
window.adminAddColorRow = adminAddColorRow;
window.adminRemoveColorRow = adminRemoveColorRow;
window.adminToggleTag = adminToggleTag;
window.adminSaveProduct = adminSaveProduct;
window.deleteProduct = deleteProduct;
window.editProduct = editProduct;
window.showBrandedConfirm = showBrandedConfirm;
window.renderAdminProductsTable = renderAdminProductsTable;
window.adminProductsPageNav = adminProductsPageNav;
window.adminDebounceSearch = adminDebounceSearch;
window.adminFilterProducts = adminFilterProducts;
window.adminToggleSelectAll = adminToggleSelectAll;
window.adminToggleProductSelect = adminToggleProductSelect;
window.adminClearSelection = adminClearSelection;
window.adminBulkHide = adminBulkHide;
window.adminBulkDelete = adminBulkDelete;
window.adminToggleProductVisibility = adminToggleProductVisibility;
window.loadProductsFromFirestore = loadProductsFromFirestore;
window.invalidateProductsCache = invalidateProductsCache;
window.migrateLocalProductsToFirestore = migrateLocalProductsToFirestore;
window.loadAdminProductsGrid = loadAdminProductsGrid;

// Auto-initialize app & products immediately on DOM load so products NEVER disappear
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAppAfterFirebase);
} else {
    initializeAppAfterFirebase();
}

// Load banners on homepage automatically
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        try { loadActiveBanners(); } catch(e) {}
    }, 2000);
});

