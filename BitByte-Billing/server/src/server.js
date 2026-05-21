import dotenv from 'dotenv';
import app from './app.js';
import { connectDb } from './utils/db.js';
import User from './models/User.js';
import { seedData } from './seed.js';

dotenv.config();

const port = process.env.PORT || 5000;

connectDb().then(async () => {
  // Check if database is empty and auto-seed if needed
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('Database is empty. Running auto-seed...');
      await seedData();
      console.log('Database auto-seeded successfully!');
    }
  } catch (err) {
    console.error('Auto-seeding check failed:', err);
  }

  app.listen(port, () => {
    console.log(`BBT Billing API running on http://localhost:${port}`);
  });
});

