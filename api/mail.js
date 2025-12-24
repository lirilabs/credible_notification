import admin from "firebase-admin";
import nodemailer from "nodemailer";

/* ======================================================
   Firebase Admin Initialization
====================================================== */
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}

/* ======================================================
   SMTP Transport
====================================================== */
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

/* ======================================================
   API Handler (QUERY PARAMS)
====================================================== */
export default async function handler(req, res) {
  /* =======================
     CORS – ALLOW ALL
  ======================= */
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, OPTIONS"
  );
  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Only GET allowed",
    });
  }

  try {
    const { uid, title, content } = req.query || {};

    if (!uid || !title || !content) {
      return res.status(400).json({
        error: "uid, title and content are required as query params",
      });
    }

    /* -------- Decode URL params -------- */
    const decodedTitle = decodeURIComponent(title);
    const decodedContent = decodeURIComponent(content);

    /* -------- Get user email -------- */
    const user = await admin.auth().getUser(uid);

    if (!user.email) {
      return res.status(400).json({
        error: "User does not have an email",
      });
    }

    /* -------- Send email -------- */
    await transporter.sendMail({
      from: `"Credible" <${process.env.SMTP_EMAIL}>`,
      to: user.email,
      subject: decodedTitle,
      text: decodedContent,
      html: `<p>${decodedContent.replace(/\n/g, "<br/>")}</p>`,
    });

    return res.status(200).json({
      success: true,
      uid,
      email: user.email,
      message: "Email sent successfully",
    });

  } catch (err) {
    console.error("MAIL ERROR:", err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}
