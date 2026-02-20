import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env.local for local development
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env.local') });
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const email = (body?.email || "").toString().trim();
    const toName = (body?.toName || "").toString().trim();
    const verificationCode = (body?.verificationCode || "").toString().trim();

    if (!email || !verificationCode) {
      return res.status(400).json({ error: "Missing email or verification code." });
    }

    const serviceId = process.env.EMAILJS_SERVICE_ID;
    const templateId = process.env.EMAILJS_TEMPLATE_ID;
    const publicKey = process.env.EMAILJS_PUBLIC_KEY;

    if (!serviceId || !templateId || !publicKey) {
      return res.status(500).json({ error: "Server missing EmailJS configuration." });
    }

    const emailResponse = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        template_params: {
          email,
          to_name: toName || email.split("@")[0],
          verification_code: verificationCode
        }
      })
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      return res.status(emailResponse.status).json({
        error: `EmailJS error (${emailResponse.status}): ${errorText || emailResponse.statusText}`
      });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Email endpoint error:", error);
    return res.status(500).json({ error: "Server error sending email." });
  }
}
