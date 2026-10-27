import dns from 'dns';
import mongoose from 'mongoose';
import { autoSeed } from './autoSeed.js';

// Fix querySrv ECONNREFUSED on local networks/ISPs that fail DNS SRV resolution
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Fall back to system DNS if setServers fails
}

export async function connectDb() {
  const uri = (process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bbt_billing').trim();
  mongoose.set('strictQuery', true);
  console.log('Connecting to MongoDB using URI:', uri.startsWith('mongodb+srv') ? '[mongodb+srv URI hidden]' : uri);
  await mongoose.connect(uri);
  console.log('MongoDB connected');
  try {
    await autoSeed();
  } catch (err) {
    console.error('Error running autoSeed:', err);
  }
}
