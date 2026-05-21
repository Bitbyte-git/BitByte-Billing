import mongoose from 'mongoose';

export async function connectDb() {
  const uri = (process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bbt_billing').trim();
  mongoose.set('strictQuery', true);
  console.log('Connecting to MongoDB using URI:', uri.startsWith('mongodb+srv') ? '[mongodb+srv URI hidden]' : uri);
  await mongoose.connect(uri);
  console.log('MongoDB connected');
}
