import nodemailer from 'nodemailer';

const createTransport = async () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // Fallback to Ethereal for local/dev if no SMTP configured
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });
};

export const sendEmail = async ({ to, subject, html, text }) => {
  const transporter = await createTransport();
  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'no-reply@resumeiq.local',
    to,
    subject,
    text,
    html
  });

  // If using Ethereal, log preview URL
  if (nodemailer.getTestMessageUrl && info) {
    const url = nodemailer.getTestMessageUrl(info);
    if (url) console.log('Preview email:', url);
  }

  return info;
};
