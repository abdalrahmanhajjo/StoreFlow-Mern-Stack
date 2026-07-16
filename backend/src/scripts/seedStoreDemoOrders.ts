/**
 * Seeds historical orders (completed sales) for a store's existing customers,
 * using the store's real products. Each customer gets 2–6 orders spread over
 * the past 60 days; their totalSpent / loyalty points / tier / purchase
 * history are then recomputed FROM those orders so every number agrees.
 *
 * Additive + idempotent: customers who already have any sales are skipped,
 * so re-running never duplicates. Product stock is not touched (the orders
 * are history, not new transactions).
 *
 * Run:  npx tsx src/scripts/seedStoreDemoOrders.ts owner@email.com
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '../models/user.model';
import Product from '../models/product.model';
import Customer from '../models/customer.model';
import Sale from '../models/sale.model';
import StoreSetting from '../models/store_setting.model';
import { roundMoney, lineAmount } from '../utils/money.utils';

const DAYS_BACK = 60;

const rand = (n: number) => Math.floor(Math.random() * n);
const pick = <T>(arr: T[]): T => arr[rand(arr.length)];

const invoiceNumberFor = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `INV-${y}${m}${d}-${date.getTime()}-${1000 + rand(9000)}`;
};

const tierFor = (lifetime: number) =>
    lifetime >= 900 ? 'Platinum' : lifetime >= 600 ? 'Gold' : lifetime >= 300 ? 'Silver' : 'Bronze';

async function main(): Promise<void> {
    const email = process.argv[2];
    if (!email) {
        console.error('Usage: npx tsx src/scripts/seedStoreDemoOrders.ts <owner-email>');
        process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI as string);

    const owner = await User.findOne({ email: email.toLowerCase() });
    if (!owner?.storeId) {
        console.error(`No store found for ${email}`);
        process.exit(1);
    }
    const storeId = owner.storeId;
    const cashierName = owner.name || 'Cashier';

    const products = await Product.find({ storeId, isActive: true });
    const customers = await Customer.find({ storeId, isActive: true });
    if (products.length === 0 || customers.length === 0) {
        console.error('Store needs products and customers first (run seedStoreDemoData.ts).');
        process.exit(1);
    }

    const setting = await StoreSetting.findOne({ storeId, isActive: true });
    const taxRate = setting ? Number(setting.taxRate) : 0;

    let salesAdded = 0;
    for (const customer of customers) {
        // Idempotency: a customer with any order history is left alone.
        if (await Sale.exists({ storeId, customerId: customer._id })) {
            console.log(`  = ${customer.name}: already has orders, skipped`);
            continue;
        }

        const orderCount = 2 + rand(5); // 2–6 orders
        let totalSpent = 0;
        let lifetimePoints = 0;
        const history: { productName: string; amount: number; purchaseDate: Date }[] = [];

        for (let o = 0; o < orderCount; o++) {
            // Spread over the past DAYS_BACK days, during opening hours.
            const when = new Date();
            when.setDate(when.getDate() - rand(DAYS_BACK));
            when.setHours(9 + rand(11), rand(60), rand(60), 0);

            // 1–5 distinct products per order.
            const lineCount = 1 + rand(5);
            const chosen = [...products].sort(() => Math.random() - 0.5).slice(0, lineCount);
            const items = chosen.map((p) => {
                const quantity = 1 + rand(3);
                return {
                    productId: p._id,
                    productName: p.name,
                    sku: p.sku,
                    quantity,
                    unitPrice: p.price,
                    subtotal: lineAmount(p.price, quantity),
                };
            });

            const subtotal = roundMoney(items.reduce((s, i) => s + i.subtotal, 0));
            // Occasional small register discount.
            const discount = rand(5) === 0 ? roundMoney(subtotal * 0.05) : 0;
            const afterDiscount = roundMoney(subtotal - discount);
            const taxAmount = roundMoney(afterDiscount * (taxRate / 100));
            const total = roundMoney(afterDiscount + taxAmount);
            const paymentMethod = rand(2) === 0 ? 'cash' : 'card';
            // Cash gets rounded up to the next 5 with change; card pays exact.
            const paidAmount = paymentMethod === 'cash' ? Math.ceil(total / 5) * 5 : total;
            const loyaltyPointsEarned = Math.floor(total);

            const sale = await Sale.create({
                storeId,
                invoiceNumber: invoiceNumberFor(when),
                customerId: customer._id,
                cashierName,
                items,
                subtotal,
                discount,
                taxRate,
                taxAmount,
                total,
                paymentMethod,
                paidAmount,
                changeAmount: roundMoney(paidAmount - total),
                loyaltyPointsEarned,
                status: 'completed',
                isActive: true,
            });

            // Backdate — bypass mongoose timestamp management on purpose.
            await Sale.collection.updateOne(
                { _id: sale._id },
                { $set: { createdAt: when, updatedAt: when } },
            );

            totalSpent = roundMoney(totalSpent + total);
            lifetimePoints += loyaltyPointsEarned;
            const label = items.length > 1
                ? `${items[0].productName} +${items.length - 1} more`
                : items[0].productName;
            history.push({ productName: label, amount: total, purchaseDate: when });
            salesAdded++;
        }

        // Recompute the customer's aggregates from their actual orders.
        // Long-standing customers have redeemed some full 100-pt blocks.
        const redeemed = Math.floor((lifetimePoints * 0.3) / 100) * 100;
        history.sort((a, b) => a.purchaseDate.getTime() - b.purchaseDate.getTime());
        await Customer.updateOne(
            { _id: customer._id },
            {
                $set: {
                    totalSpent,
                    lifetimePointsEarned: lifetimePoints,
                    loyaltyPoints: lifetimePoints - redeemed,
                    loyaltyTier: tierFor(lifetimePoints),
                    purchaseHistory: history,
                },
            },
        );

        console.log(`  + ${customer.name}: ${orderCount} orders, €${totalSpent.toFixed(2)} total, ${lifetimePoints} pts earned`);
    }

    console.log(`\nDone: ${salesAdded} orders added.`);
    await mongoose.disconnect();
}

if (require.main === module) {
    main().catch((err) => {
        console.error('Seed failed:', err);
        process.exit(1);
    });
}
