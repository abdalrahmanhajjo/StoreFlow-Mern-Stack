/**
 * Runs the API against a PERSISTENT local MongoDB stored in backend/.data —
 * accounts and store data survive restarts. Uses the mongod binary that
 * mongodb-memory-server already downloaded (no system MongoDB install
 * needed). Started as a single-node replica set because the sale endpoint
 * uses transactions.
 *
 *   npm run dev:local
 *
 * If the binary is missing, run `npm run dev:memory` once — it downloads it.
 */
import { spawn } from 'child_process';
import { existsSync, mkdirSync, readdirSync } from 'fs';
import { homedir } from 'os';
import path from 'path';
import mongoose from 'mongoose';

const PORT = 27017;
const REPL_SET = 'rs0';
const DB_PATH = path.resolve(__dirname, '../.data/db');

function findMongod(): string {
  const cacheDir = path.join(homedir(), '.cache', 'mongodb-binaries');
  if (existsSync(cacheDir)) {
    const bin = readdirSync(cacheDir).find((f) => f.startsWith('mongod'));
    if (bin) return path.join(cacheDir, bin);
  }
  throw new Error(
    'No mongod binary found. Run `npm run dev:memory` once to download it.'
  );
}

async function waitForMongo(uri: string, attempts = 60): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    try {
      const conn = await mongoose
        .createConnection(uri, { serverSelectionTimeoutMS: 1000 })
        .asPromise();
      await conn.close();
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error('mongod did not become reachable');
}

async function ensureReplicaSet(): Promise<void> {
  const conn = await mongoose
    .createConnection(
      `mongodb://127.0.0.1:${PORT}/admin?directConnection=true`,
      { serverSelectionTimeoutMS: 5000 }
    )
    .asPromise();
  try {
    await conn.db!.admin().command({
      replSetInitiate: {
        _id: REPL_SET,
        members: [{ _id: 0, host: `127.0.0.1:${PORT}` }],
      },
    });
    console.log('[dev:local] replica set initiated');
  } catch (err: unknown) {
    const msg = (err as Error).message ?? '';
    if (!/already initialized/i.test(msg)) throw err;
  } finally {
    await conn.close();
  }
}

async function main() {
  const bin = findMongod();
  mkdirSync(DB_PATH, { recursive: true });

  const mongod = spawn(
    bin,
    [
      '--dbpath', DB_PATH,
      '--port', String(PORT),
      '--replSet', REPL_SET,
      '--bind_ip', '127.0.0.1',
      '--quiet',
    ],
    { stdio: ['ignore', 'ignore', 'inherit'] }
  );

  mongod.on('exit', (code) => {
    console.error(`[dev:local] mongod exited (${code})`);
    process.exit(code ?? 1);
  });

  await waitForMongo(`mongodb://127.0.0.1:${PORT}/admin?directConnection=true`);
  await ensureReplicaSet();

  process.env.MONGO_URI = `mongodb://127.0.0.1:${PORT}/storeflow?replicaSet=${REPL_SET}&directConnection=true`;
  console.log(`[dev:local] persistent MongoDB at ${process.env.MONGO_URI}`);
  console.log(`[dev:local] data directory: ${DB_PATH}`);

  await import('../src/server');

  const { default: mongooseInstance } = await import('mongoose');
  while (mongooseInstance.connection.readyState !== 1) {
    await new Promise((r) => setTimeout(r, 200));
  }
  const { seedAdmin } = await import('./seed-admin');
  await seedAdmin();

  const stop = () => {
    mongod.kill('SIGINT');
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
