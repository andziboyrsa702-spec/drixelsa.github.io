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


async function requireAdmin(req) {
    const authorization = req.get("Authorization") || "";
    const match = authorization.match(/^Bearer (.+)$/);
    if (!match) {
        const error = new Error("Authentication required.");
        error.status = 401;
        throw error;
    }
    let decoded;
    try {
        decoded = await admin.auth().verifyIdToken(match[1]);
    } catch {
        const error = new Error("Invalid authentication token.");
        error.status = 401;
        throw error;
    }
    if (!decoded.email || !ALLOWED_ADMIN_EMAILS.has(decoded.email.toLowerCase())) {
        const error = new Error("Administrator access required.");
        error.status = 403;
        throw error;
    }
    return decoded;
}

exports.sendCampaign = functions.https.onRequest(async (req, res) => {
    if (req.method !== "POST") {
        res.set("Allow", "POST");
        return res.status(405).json({ success: false, message: "Method not allowed." });
    }

    try {
        await requireAdmin(req);
        const campaignId = req.body && req.body.campaignId;
        if (!campaignId || typeof campaignId !== "string") {
            return res.status(400).json({ success: false, message: "Campaign ID is required." });
        }

        const campaignRef = admin.firestore().collection("email_campaigns").doc(campaignId);
        const campaignSnap = await campaignRef.get();
        if (!campaignSnap.exists) {
            return res.status(404).json({ success: false, message: "Campaign not found." });
        }

        const campaign = campaignSnap.data();
        if (!campaign.subject || !campaign.html) {
            return res.status(400).json({ success: false, message: "Campaign is incomplete." });
        }
        if (campaign.status === "sent") {
            return res.status(409).json({ success: false, message: "Campaign has already been sent." });
        }

        const subscriberSnap = await admin.firestore().collection("subscribers").get();
        const recipients = [];
        subscriberSnap.forEach(docSnap => {
            const subscriber = docSnap.data();
            if (isValidEmail(subscriber.email) && subscriber.status !== "unsubscribed") {
                recipients.push({ id: docSnap.id, email: subscriber.email.toLowerCase(), token: subscriber.unsubscribeToken || "" });
            }
        });
        const uniqueRecipients = [...new Map(recipients.map(r => [r.email, r])).values()];
        if (!uniqueRecipients.length) {
            return res.status(400).json({ success: false, message: "No active subscribers." });
        }
        if (uniqueRecipients.length > 5000) {
            return res.status(413).json({ success: false, message: "Audience is too large for this campaign sender." });
        }

        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ success: false, message: "Email service is not configured." });
        }

        const resend = new Resend(apiKey);
        let sent = 0;
        let failed = 0;
        const batchSize = 40;

        await campaignRef.update({
            status: "sending",
            recipientCount: uniqueRecipients.length,
            sendStartedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        for (let i = 0; i < uniqueRecipients.length; i += batchSize) {
            const batch = uniqueRecipients.slice(i, i + batchSize);
            const baseUrl = publicBaseUrl(req);
            const results = await Promise.allSettled(batch.map(recipient => {
                const unsubscribeUrl = recipient.token ? baseUrl + "/api/unsubscribe?id=" + encodeURIComponent(recipient.id) + "&token=" + encodeURIComponent(recipient.token) : "";
                const footer = unsubscribeUrl ? `<div style="max-width:620px;margin:24px auto 0;padding:20px;text-align:center;color:#777;font:12px Arial,sans-serif"><a style="color:#777" href="${unsubscribeUrl}">Unsubscribe</a> from Drixel marketing emails.</div>` : "";
                return resend.emails.send({
                    from: "Drixel SA <info@customer.drixelsa.co.za>",
                    to: [recipient.email],
                    subject: campaign.subject.trim(),
                    html: campaign.html + footer
                });
            }));
            results.forEach(result => result.status === "fulfilled" ? sent++ : failed++);
        }

        await campaignRef.update({
            status: failed === uniqueRecipients.length ? "failed" : "sent",
            acceptedCount: sent,
            failedCount: failed,
            sentAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return res.status(200).json({ success: true, sent, failed });
    } catch (error) {
        console.error("Campaign send failed:", error);
        return res.status(error.status || 500).json({ success: false, message: error.status ? error.message : "Campaign delivery failed." });
    }
});


function newsletterDocId(email) {
    return require("crypto").createHash("sha256").update(email).digest("hex");
}

function publicBaseUrl(req) {
    const configured = process.env.PUBLIC_SITE_URL;
    if (configured) return configured.replace(/\/$/, "");
    const forwardedProto = req.get("x-forwarded-proto") || "https";
    return forwardedProto + "://" + req.get("host");
}

exports.subscribeNewsletter = functions.https.onRequest(async (req, res) => {
    if (req.method !== "POST") {
        res.set("Allow", "POST");
        return res.status(405).json({ success: false, message: "Method not allowed." });
    }
    const email = String(req.body && req.body.email || "").trim().toLowerCase();
    if (!isValidEmail(email)) {
        return res.status(400).json({ success: false, message: "Enter a valid email address." });
    }
    const ref = admin.firestore().collection("subscribers").doc(newsletterDocId(email));
    const snap = await ref.get();
    const existing = snap.exists ? snap.data() : {};
    const unsubscribeToken = existing.unsubscribeToken || require("crypto").randomBytes(32).toString("hex");
    await ref.set({
        email,
        status: "active",
        source: existing.source || "website",
        unsubscribeToken,
        subscribedAt: existing.subscribedAt || admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    return res.status(200).json({ success: true, message: "You're on the list." });
});

exports.unsubscribeNewsletter = functions.https.onRequest(async (req, res) => {
    if (!["GET", "POST"].includes(req.method)) return res.status(405).send("Method not allowed.");
    const id = String((req.query && req.query.id) || (req.body && req.body.id) || "");
    const token = String((req.query && req.query.token) || (req.body && req.body.token) || "");
    if (!/^[a-f0-9]{64}$/.test(id) || !/^[a-f0-9]{64}$/.test(token)) return res.status(400).send("Invalid unsubscribe link.");
    const ref = admin.firestore().collection("subscribers").doc(id), snap = await ref.get();
    if (!snap.exists || snap.data().unsubscribeToken !== token) return res.status(404).send("Unsubscribe link not found.");
    await ref.update({ status: "unsubscribed", unsubscribedAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    res.set("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribed | Drixel</title><body style="margin:0;background:#050505;color:#fff;font-family:Arial,sans-serif;display:grid;place-items:center;min-height:100vh"><main style="max-width:560px;padding:40px;text-align:center"><b style="font-size:28px;letter-spacing:-2px">DRIXEL</b><h1 style="font-size:48px;letter-spacing:-3px">You’re unsubscribed.</h1><p style="color:#999;line-height:1.6">You will no longer receive Drixel marketing emails at this address.</p></main></body>');
});
