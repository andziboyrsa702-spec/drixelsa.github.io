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
                recipients.push(subscriber.email.toLowerCase());
            }
        });
        const uniqueRecipients = [...new Set(recipients)];
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
            const results = await Promise.allSettled(batch.map(email =>
                resend.emails.send({
                    from: "Drixel SA <info@customer.drixelsa.co.za>",
                    to: [email],
                    subject: campaign.subject.trim(),
                    html: campaign.html
                })
            ));
            results.forEach(result => result.status === "fulfilled" ? sent++ : failed++);
        }

        await campaignRef.update({
            status: failed === uniqueRecipients.length ? "failed" : "sent",
            deliveredCount: sent,
            failedCount: failed,
            sentAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return res.status(200).json({ success: true, sent, failed });
    } catch (error) {
        console.error("Campaign send failed:", error);
        return res.status(error.status || 500).json({ success: false, message: error.status ? error.message : "Campaign delivery failed." });
    }
});
