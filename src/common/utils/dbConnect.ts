import mongoose, { Connection } from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || '';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

const globalWithMongo = global as typeof globalThis & {
  mongo: { conn: Connection | null; promise: Promise<Connection> | null };
};

if (!globalWithMongo.mongo) {
  globalWithMongo.mongo = { conn: null, promise: null };
}

async function dbConnect(): Promise<Connection> {
  if (globalWithMongo.mongo.conn) {
    return globalWithMongo.mongo.conn;
  }

  if (!globalWithMongo.mongo.promise) {
    const opts = { bufferCommands: false };

    globalWithMongo.mongo.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => mongooseInstance.connection);
  }

  globalWithMongo.mongo.conn = await globalWithMongo.mongo.promise;
  return globalWithMongo.mongo.conn;
}

export default dbConnect;
