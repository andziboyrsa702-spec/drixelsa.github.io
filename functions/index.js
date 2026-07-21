const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { Resend } = require("resend");
const cors = require("cors")({ origin: true });

admin.initializeApp();

exports.sendEmail = functions.https.onRequest((req, res) => {
    return cors(req, res, async () => {
        if (req.method !== "POST") {
            return res.status(405).json({
                success: false,
                message: "Method Not Allowed. Only POST is supported."
            });
        }

        const { to, subject, html, from } = req.body;

        if (!to || !subject || !html) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: 'to', 'subject', and 'html' must be provided."
            });
        }

        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            console.error("❌ RESEND_API_KEY environment variable is not set.");
            return res.status(500).json({
                success: false,
                message: "Email service is not configured. RESEND_API_KEY is missing."
            });
        }

        try {
            const resend = new Resend(apiKey);
            const data = await resend.emails.send({
                from: from || "Drixel SA <onboarding@resend.dev>",
                to: Array.isArray(to) ? to : [to],
                subject: subject,
                html: html
            });

            console.log("✅ Email sent successfully:", data);
            return res.status(200).json({
                success: true,
                message: "Email sent successfully",
                data: data
            });
        } catch (error) {
            console.error("❌ Error sending email via Resend:", error);
            return res.status(500).json({
                success: false,
                message: "Failed to send email",
                details: error.message
            });
        }
    });
});
