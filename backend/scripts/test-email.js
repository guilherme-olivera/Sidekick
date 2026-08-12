require("dotenv").config();
const nodemailer = require("nodemailer");

const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587", 10);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_FROM = process.env.SMTP_FROM || '"Sidekick" <no-reply@sidekick.com>';

console.log("=== EMAIL DIAGNOSTIC TEST ===");
console.log("Host:", SMTP_HOST);
console.log("Port:", SMTP_PORT);
console.log("User:", SMTP_USER);
console.log("Pass length:", SMTP_PASS.length);
console.log("From:", SMTP_FROM);

if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
  console.error("❌ ERROR: SMTP credentials missing in .env file.");
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false // avoids SSL handshake rejection
  }
});

async function run() {
  try {
    console.log("\nTesting SMTP connection...");
    await transporter.verify();
    console.log("✅ Connection verified successfully!");

    console.log("\nSending test email...");
    const info = await transporter.sendMail({
      from: SMTP_FROM,
      to: SMTP_USER, // send to self
      subject: "Sidekick Email Test 👟🔥",
      text: "Se você está lendo isso, o SMTP do Gmail está funcionando perfeitamente!",
      html: "<h3>Se você está lendo isso, o SMTP do Gmail está funcionando perfeitamente! 👟🔥</h3>"
    });

    console.log("✅ Email sent successfully!");
    console.log("Message ID:", info.messageId);
    console.log("Response:", info.response);
  } catch (error) {
    console.error("❌ SMTP TEST FAILED:", error);
  }
}

run();
