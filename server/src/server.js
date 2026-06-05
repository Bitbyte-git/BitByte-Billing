import dotenv from 'dotenv';
import app from './app.js';
import { connectDb } from './utils/db.js';
import { getEmailProviderStatus, verifyTransporter } from './utils/email.js';

dotenv.config();

const port = process.env.PORT || 5000;

connectDb().then(() => {
  app.listen(port, () => {
    console.log(`BBT Billing API running on http://localhost:${port}`);
    const mail = getEmailProviderStatus();
    console.log(`[Mail] Provider selected: ${mail.provider} | SMTP host: ${mail.smtpHost || '-'} | SendGrid: ${mail.sendgridConfigured ? 'yes' : 'no'} | Resend: ${mail.resendConfigured ? 'yes' : 'no'}`);
    verifyTransporter();
  });
});
