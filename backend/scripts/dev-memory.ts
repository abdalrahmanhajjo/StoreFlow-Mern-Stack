/**
 * Runs the API against a throwaway in-memory MongoDB — for local development
 * and demos on machines without a MongoDB install. Data lives only for the
 * lifetime of the process.
 *
 *   npm run dev:memory
 */
import { MongoMemoryReplSet } from 'mongodb-memory-server';

async function main() {
  // Single-node replica set: the sale endpoint uses transactions, which a
  // standalone mongod refuses ("Transaction numbers are only allowed…").
  const mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  process.env.MONGO_URI = mongo.getUri('storeflow');
  console.log(`[dev:memory] MongoDB (in-memory) at ${process.env.MONGO_URI}`);

  await import('../src/server');

  // Seed the platform admin once the app's connectDB() has finished, so the
  // throwaway database always has a working admin login.
  const { default: mongooseInstance } = await import('mongoose');
  while (mongooseInstance.connection.readyState !== 1) {
    await new Promise((r) => setTimeout(r, 200));
  }
  const { seedAdmin } = await import('./seed-admin');
  await seedAdmin();

  const stop = async () => {
    await mongo.stop();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
