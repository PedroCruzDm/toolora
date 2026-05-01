import { MongoClient, Db } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const mongoUri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/toolora';

let client: MongoClient | null = null;
let dbPromise: Promise<Db> | null = null;

const connectMongo = async () => {
  if (!client) {
    client = new MongoClient(mongoUri);
    await client.connect();
  }

  return client.db();
};

export const getMongoDb = async () => {
  if (!dbPromise) {
    dbPromise = connectMongo();
  }

  return dbPromise;
};
