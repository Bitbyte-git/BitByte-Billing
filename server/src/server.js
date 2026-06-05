import dotenv from 'dotenv';
import app from './app.js';
import { connectDb } from './utils/db.js';
import { verifyTransporter } from './utils/email.js';

dotenv.config();

const port = process.env.PORT || 5000;

connectDb().then(() => {
  app.listen(port, () => {
    console.log(`BBT Billing API running on http://localhost:${port}`);
    // Verify SMTP on startup so misconfiguration is visible in logs immediately
    verifyTransporter();
  });
});
