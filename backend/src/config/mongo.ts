import { Db, MongoClient, ServerApiVersion } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const mongoUri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/toolora_db';
const mongoDbName = process.env.MONGODB_DB ?? process.env.DB_NAME ?? 'toolora_db';

let client: MongoClient | null = null;
let dbPromise: Promise<Db> | null = null;

const connectMongo = async () => {
  if (!client) {
    client = new MongoClient(mongoUri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });

    await client.connect();

    await client.db('admin').command({ ping: 1 });
    console.log(`Pinged your deployment. Connected to MongoDB database "${mongoDbName}"!`);
  }

  return client.db(mongoDbName);
};

export const getMongoDb = async () => {
  if (!dbPromise) {
    dbPromise = connectMongo();
  }

  return dbPromise;
};

export const connectDB = async () => {
  await getMongoDb();
};
