/**
 * Billing/Stripe demo environment — runs the API against a throwaway
 * in-memory MongoDB with the mock payment provider and demo plans seeded,
 * so the full paid-subscription flow (pricing → register → hosted checkout →
 * webhook activation) is clickable without Stripe keys or a MongoDB install.
 *
 *   Backend:  npm run demo:billing                    (port 5178)
 *   Frontend: VITE_API_BASE_URL=http://localhost:5178/api \
 *             npm run dev -- --port 5176 --strictPort   (in frontend/web)
 *
 * Then open http://localhost:5176/pricing and pay with the prefilled test
 * card. With real Stripe test keys in .env, use the normal `npm run dev`
 * instead — checkout then happens on Stripe's hosted page.
 */
process.env.BILLING_PROVIDER = process.env.BILLING_PROVIDER ?? 'mock';
process.env.PORT = process.env.PORT ?? '5178';
process.env.CLIENT_APP_URL = process.env.DEMO_CLIENT_APP_URL ?? 'http://localhost:5176';
process.env.FRONTEND_URL = process.env.CLIENT_APP_URL;
process.env.NODE_ENV = 'development';

import { MongoMemoryReplSet } from 'mongodb-memory-server';

async function main() {
  const mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  process.env.MONGO_URI = mongo.getUri('storeflow');
  console.log(`[demo:billing] MongoDB (in-memory) at ${process.env.MONGO_URI}`);

  await import('../src/server');

  const { default: mongooseInstance } = await import('mongoose');
  while (mongooseInstance.connection.readyState !== 1) {
    await new Promise((r) => setTimeout(r, 200));
  }

  // Seed the exact same canonical plans production uses, plus mock Stripe
  // price IDs so the paid checkout path runs without real Stripe keys.
  const { Plan } = await import('../src/models/plan.model');
  const { PLANS } = await import('../src/scripts/seedPlans');
  await Plan.create(PLANS.map((plan) => ({
    ...plan,
    providerPriceIds: plan.billing.monthlyPriceMinor > 0
      ? { stripe: { monthly: `price_mock_${plan.code}_m`, yearly: `price_mock_${plan.code}_y` } }
      : {},
  })));

  console.log('[demo:billing] Plans seeded (free, pro, enterprise). Open http://localhost:5176/pricing');

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
