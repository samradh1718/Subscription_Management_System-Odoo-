import nodemailer from "nodemailer";

let transporter;

async function getTransporter() {
  if (transporter) return transporter;
  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  } else {
    // Ethereal = free fake inbox, email ka preview link console mein milta hai
    const acc = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      auth: { user: acc.user, pass: acc.pass },
    });
  }
  return transporter;
}

export async function sendMail({ to, subject, html }) {
  const t = await getTransporter();
  const info = await t.sendMail({
    from: "Brightloop <no-reply@brightloop.com>",
    to,
    subject,
    html,
  });
  const previewUrl = nodemailer.getTestMessageUrl(info) || null;
  if (previewUrl) console.log("Email preview:", previewUrl);
  return previewUrl;
}
