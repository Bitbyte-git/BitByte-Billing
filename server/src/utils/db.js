import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer;

export async function connectDb() {
  mongoose.set('strictQuery', true);
  const uri = (process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bbt_billing').trim();
  console.log('Connecting to MongoDB using URI:', uri.startsWith('mongodb+srv') ? '[mongodb+srv URI hidden]' : uri);
  
  try {
    // Attempt connection with a 3-second timeout
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.warn('Failed to connect to configured MongoDB. Fallback to MongoMemoryServer...');
    try {
      mongoServer = await MongoMemoryServer.create();
      const memoryUri = mongoServer.getUri();
      console.log('In-Memory MongoDB Server started.');
      await mongoose.connect(memoryUri);
      console.log('Connected to In-Memory MongoDB:', memoryUri);
    } catch (memErr) {
      console.error('Failed to start MongoMemoryServer:', memErr);
      throw memErr;
    }
  }
}

export async function disconnectDb() {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
}

