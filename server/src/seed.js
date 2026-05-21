import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import User from './models/User.js';
import { connectDb } from './utils/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const required = ['SEED_ADMIN_NAME', 'SEED_ADMIN_EMAIL', 'SEED_ADMIN_PHONE', 'SEED_ADMIN_PASSWORD'];

async function seed() {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing required seed environment values: ${missing.join(', ')}`);
  }

  await connectDb();

  const passwordHash = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD, 12);
  const admin = await User.findOneAndUpdate(
    { email: process.env.SEED_ADMIN_EMAIL.toLowerCase() },
    {
      name: process.env.SEED_ADMIN_NAME,
      email: process.env.SEED_ADMIN_EMAIL.toLowerCase(),
      phone: process.env.SEED_ADMIN_PHONE,
      passwordHash,
      role: 'Admin',
      status: 'Active'
    },
    { upsert: true, new: true, runValidators: true }
  );

  console.log(`Admin account ready: ${admin.email}`);
  await mongoose.disconnect();
}

seed().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
