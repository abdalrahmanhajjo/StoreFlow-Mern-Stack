/**
 * Runs the API against a throwaway in-memory MongoDB — for local development
 * and demos on machines without a MongoDB install. Data lives only for the
 * lifetime of the process.
 *
 *   npm run dev:memory
 */
import { MongoMemoryServer } from 'mongodb-memory-server';

async function main() {
  const mongo = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongo.getUri('storeflow');
  console.log(`[dev:memory] MongoDB (in-memory) at ${process.env.MONGO_URI}`);

  await import('../src/server');

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
