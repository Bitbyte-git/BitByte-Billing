import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Service from '../models/Service.js';
import { encrypt } from './crypto.js';

export async function autoSeed() {
  console.log('Running auto-seeding check...');

  // 1. Check for Admin
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@bitbytetech.com').toLowerCase();
  const adminExists = await User.findOne({ role: 'Admin' });
  if (!adminExists) {
    console.log('No Admin user found. Seeding default Admin...');
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@123';
    const adminHash = await bcrypt.hash(adminPassword, 12);
    await User.create({
      name: process.env.SEED_ADMIN_NAME || 'Admin User',
      email: adminEmail,
      phone: process.env.SEED_ADMIN_PHONE || '1234567890',
      passwordHash: adminHash,
      role: 'Admin',
      status: 'Active'
    });
    console.log(`Default Admin seeded successfully: ${adminEmail}`);
  } else {
    console.log('Admin user exists.');
  }

  // 2. Check for Accountant
  const accountantExists = await User.findOne({ role: 'Accountant' });
  if (!accountantExists) {
    console.log('No Accountant user found. Seeding default Accountant...');
    const accEmail = (process.env.SEED_ACCOUNTANT_EMAIL || 'accountant@bitbytetech.com').toLowerCase();
    const accPassword = process.env.SEED_ACCOUNTANT_PASSWORD || 'Account@123';
    const accHash = await bcrypt.hash(accPassword, 12);
    await User.create({
      name: process.env.SEED_ACCOUNTANT_NAME || 'Default Accountant',
      email: accEmail,
      phone: process.env.SEED_ACCOUNTANT_PHONE || '9876543210',
      passwordHash: accHash,
      encryptedPassword: encrypt(accPassword),
      role: 'Accountant',
      status: 'Active'
    });
    console.log(`Default Accountant seeded successfully: ${accEmail}`);
  } else {
    console.log('Accountant user exists.');
  }

  // 3. Check for Services
  const servicesCount = await Service.countDocuments();
  if (servicesCount === 0) {
    console.log('No Services found. Seeding default Services...');
    const defaultServices = [
      { name: 'Web Development', description: 'Custom website, E-commerce, web dashboard, and landing pages.', basePrice: 25000 },
      { name: 'Digital Marketing', description: 'SEO, AEO, GEO, performance marketing, and branding.', basePrice: 15000 },
      { name: 'Personal Branding', description: 'Profile optimization, content strategy, and visuals.', basePrice: 10000 },
      { name: 'Business Analytics', description: 'BI dashboard, data analytics, and reporting.', basePrice: 30000 },
      { name: 'Imagination to Reality', description: 'Custom innovative technical solutions.', basePrice: 50000 },
      { name: 'Real-Time Sales Data Driven Solutions', description: 'ERP, CRM, and real-time inventory tracking.', basePrice: 45000 }
    ];
    await Service.insertMany(defaultServices);
    console.log('Default Services seeded successfully.');
  } else {
    console.log('Services exist in the database.');
  }

  console.log('Auto-seeding check complete.');
}
