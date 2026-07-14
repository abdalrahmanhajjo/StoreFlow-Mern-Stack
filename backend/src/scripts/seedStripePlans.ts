import mongoose from 'mongoose';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import { Plan } from '../models/plan.model';

dotenv.config({ path: '../../.env' });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/storeflow';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

interface StripeProduct {
  id: string;
  name: string;
}

interface StripePrice {
  id: string;
  interval: string;
}

async function main(): Promise<void> {
  if (!STRIPE_SECRET_KEY) {
    console.error('STRIPE_SECRET_KEY environment variable is required');
    process.exit(1);
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY);
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const plans = await Plan.find({ isActive: true }).sort({ displayOrder: 1 });
  console.log(`Found ${plans.length} active plans\n`);

  const results: Array<{ code: string; name: string; prices: StripePrice[] }> = [];

  for (const plan of plans) {
    // Free and enterprise plans don't need Stripe prices
    if (plan.billing.monthlyPriceMinor === 0 && plan.billing.yearlyPriceMinor === 0) {
      console.log(`Skipping "${plan.name}" — zero-price plan (no Stripe product needed)`);
      continue;
    }

    const existingProductId = plan.providerPriceIds?.stripe?.monthly
      ? await getProductIdForPrice(stripe, plan.providerPriceIds.stripe.monthly)
      : null;

    let product: StripeProduct;
    if (existingProductId) {
      product = { id: existingProductId, name: plan.name };
      console.log(`Product for "${plan.name}" already exists: ${product.id}`);
    } else {
      const created = await stripe.products.create({
        name: plan.name,
        description: plan.description,
        metadata: { planCode: plan.code, planPublicId: plan.publicId },
      });
      product = { id: created.id, name: created.name };
      console.log(`Created Stripe product: "${plan.name}" → ${product.id}`);
    }

    const prices: StripePrice[] = [];

    // Create monthly price
    if (plan.supportedIntervals.includes('monthly')) {
      const price = await createOrReusePrice(stripe, product.id, plan, 'month');
      prices.push(price);
    }

    // Create yearly price
    if (plan.supportedIntervals.includes('yearly')) {
      const price = await createOrReusePrice(stripe, product.id, plan, 'year');
      prices.push(price);
    }

    if (prices.length > 0) {
      const updateData: Record<string, string> = {};
      for (const p of prices) {
        if (p.interval === 'month') updateData['providerPriceIds.stripe.monthly'] = p.id;
        if (p.interval === 'year') updateData['providerPriceIds.stripe.yearly'] = p.id;
      }
      await Plan.updateOne({ _id: plan._id }, { $set: updateData });
      console.log(`  Updated plan "${plan.code}" with price IDs`);
    }

    results.push({ code: plan.code, name: plan.name, prices });
    console.log('');
  }

  console.log('=== Summary ===');
  for (const r of results) {
    if (r.prices.length > 0) {
      console.log(`${r.name} (${r.code}):`);
      for (const p of r.prices) {
        console.log(`  ${p.interval === 'month' ? 'Monthly' : 'Yearly'}: ${p.id}`);
      }
    }
  }

  await mongoose.disconnect();
  console.log('\nDone');
}

async function getProductIdForPrice(stripe: Stripe, priceId: string): Promise<string | null> {
  try {
    const price = await stripe.prices.retrieve(priceId);
    return typeof price.product === 'string' ? price.product : price.product?.id ?? null;
  } catch {
    return null;
  }
}

async function createOrReusePrice(
  stripe: Stripe, productId: string,
  plan: { billing: { currency: string; monthlyPriceMinor: number; yearlyPriceMinor: number }; code: string; name: string },
  interval: 'month' | 'year',
): Promise<StripePrice> {
  const amountMinor = interval === 'month' ? plan.billing.monthlyPriceMinor : plan.billing.yearlyPriceMinor;
  const existingPriceId = interval === 'month'
    ? (plan as any).providerPriceIds?.stripe?.monthly
    : (plan as any).providerPriceIds?.stripe?.yearly;

  if (existingPriceId) {
    try {
      const existing = await stripe.prices.retrieve(existingPriceId);
      if (
        existing.unit_amount === amountMinor &&
        existing.currency === plan.billing.currency.toLowerCase() &&
        existing.recurring?.interval === interval &&
        (typeof existing.product === 'string' ? existing.product : (existing.product as any)?.id) === productId
      ) {
        return { id: existing.id, interval };
      }
      console.log(`  Price mismatch for ${interval}, creating new one...`);
    } catch {
      // Price gone, create new
    }
  }

  const price = await stripe.prices.create({
    unit_amount: amountMinor,
    currency: plan.billing.currency.toLowerCase(),
    recurring: { interval },
    product: productId,
    metadata: { planCode: plan.code, interval },
  });
  console.log(`  Created ${interval}ly price: ${price.id} (${amountMinor} ${plan.billing.currency})`);
  return { id: price.id, interval };
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
