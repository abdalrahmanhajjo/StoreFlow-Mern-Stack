/**
 * CLI runner for billing maintenance jobs.
 * Usage: npx ts-node src/scripts/runBillingJobs.ts [job]
 *
 * Jobs: all, reconcile, gracePeriod, expireCanceled, trialReminder
 */
import mongoose from 'mongoose';
import { runAllJobs, reconcileSubscriptions, expireGracePeriods, expireCanceledSubscriptions, sendTrialEndingReminders } from '../services/billing/billingJobs';

async function main() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://ac-pzgmx2i-shard-00-00.btxtqaw.mongodb.net:27017/storeflow';
  const dbName = process.env.DB_NAME || 'storeflow';

  await mongoose.connect(mongoUri, { dbName });
  console.log(`Connected to MongoDB: ${dbName}`);

  const job = process.argv[2] || 'all';

  try {
    switch (job) {
      case 'reconcile':
        await reconcileSubscriptions();
        break;
      case 'gracePeriod':
        await expireGracePeriods();
        break;
      case 'expireCanceled':
        await expireCanceledSubscriptions();
        break;
      case 'trialReminder':
        await sendTrialEndingReminders();
        break;
      case 'all':
      default:
        await runAllJobs();
        break;
    }
  } catch (err: any) {
    console.error('Job failed:', err.message);
    process.exit(1);
  }

  await mongoose.disconnect();
  console.log('Done');
}

main();
