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
