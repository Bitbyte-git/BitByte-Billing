import dotenv from 'dotenv';
import app from './app.js';
import { connectDb } from './utils/db.js';

dotenv.config();

const port = process.env.PORT || 5000;

connectDb().then(() => {
  app.listen(port, () => {
    console.log(`BBT Billing API running on http://localhost:${port}`);
  });
});
