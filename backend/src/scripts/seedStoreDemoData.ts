/**
 * Seeds a store with realistic demo data: categories, products (with real
 * photos + emoji), and loyalty customers. Strictly ADDITIVE — existing
 * documents are never modified or deleted, and re-running skips anything
 * that already exists (matched by SKU / name), so it's safe on live data.
 *
 * Run:  npx tsx src/scripts/seedStoreDemoData.ts owner@email.com
 * (uses MONGO_URI from backend/.env)
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '../models/user.model';
import { Store } from '../models/store.model';
import Product from '../models/product.model';
import Category from '../models/category.model';
import Customer from '../models/customer.model';

const img = (id: string) => `https://images.unsplash.com/${id}?w=400&q=80`;

// [category, name, sku, emoji, unsplash id, price, cost, qty, reorder]
const PRODUCTS: [string, string, string, string, string, number, number, number, number][] = [
  ['Fruits & Vegetables', 'Bananas (1 kg)', 'FRT-001', '🍌', 'photo-1571771894821-ce9b6c11b08e', 1.79, 0.95, 120, 20],
  ['Fruits & Vegetables', 'Red Apples (1 kg)', 'FRT-002', '🍎', 'photo-1560806887-1e4cd0b6cbd6', 2.49, 1.40, 90, 15],
  ['Fruits & Vegetables', 'Oranges (1 kg)', 'FRT-003', '🍊', 'photo-1547514701-42782101795e', 2.29, 1.25, 80, 15],
  ['Fruits & Vegetables', 'Tomatoes (1 kg)', 'FRT-004', '🍅', 'photo-1546094096-0df4bcaaa337', 2.99, 1.70, 60, 12],
  ['Fruits & Vegetables', 'Avocado (each)', 'FRT-005', '🥑', 'photo-1523049673857-eb18f1d7b578', 1.49, 0.85, 45, 10],
  ['Fruits & Vegetables', 'Strawberries (500 g)', 'FRT-006', '🍓', 'photo-1464965911861-746a04b4bca6', 3.99, 2.40, 35, 8],
  ['Dairy & Eggs', 'Whole Milk (1 L)', 'DRY-001', '🥛', 'photo-1550583724-b2692b85b150', 1.29, 0.80, 140, 24],
  ['Dairy & Eggs', 'Free-Range Eggs (12)', 'DRY-002', '🥚', 'photo-1506976785307-8732e854ad03', 3.49, 2.20, 75, 15],
  ['Dairy & Eggs', 'Aged Cheddar (250 g)', 'DRY-003', '🧀', 'photo-1486297678162-eb2a19b0a32d', 4.79, 2.90, 40, 8],
  ['Dairy & Eggs', 'Greek Yogurt (500 g)', 'DRY-004', '🍦', 'photo-1488477181946-6428a0291777', 2.59, 1.50, 55, 10],
  ['Bakery', 'Sourdough Loaf', 'BKR-001', '🍞', 'photo-1509440159596-0249088772ff', 3.29, 1.60, 30, 6],
  ['Bakery', 'Butter Croissant', 'BKR-002', '🥐', 'photo-1555507036-ab1f4038808a', 1.59, 0.70, 48, 10],
  ['Beverages', 'Orange Juice (1 L)', 'BEV-001', '🧃', 'photo-1600271886742-f049cd451bba', 2.99, 1.75, 65, 12],
  ['Beverages', 'Arabica Coffee Beans (500 g)', 'BEV-002', '☕', 'photo-1447933601403-0c6688de566e', 8.99, 5.50, 25, 5],
  ['Beverages', 'Mineral Water (6×1.5 L)', 'BEV-003', '💧', 'photo-1548839140-29a749e1cf4d', 3.49, 2.00, 110, 20],
  ['Beverages', 'Green Tea (20 bags)', 'BEV-004', '🍵', 'photo-1564890369478-c89ca6d9cde9', 2.79, 1.55, 42, 8],
  ['Snacks & Sweets', 'Dark Chocolate 70% (100 g)', 'SNK-001', '🍫', 'photo-1549007994-cb92caebd54b', 2.49, 1.35, 70, 14],
  ['Snacks & Sweets', 'Sea-Salt Potato Chips (150 g)', 'SNK-002', '🥔', 'photo-1566478989037-eec170784d0b', 1.99, 1.05, 85, 16],
  ['Snacks & Sweets', 'Wildflower Honey (350 g)', 'SNK-003', '🍯', 'photo-1587049352846-4a222e784d38', 5.49, 3.30, 28, 6],
  ['Snacks & Sweets', 'Corn Flakes (500 g)', 'SNK-004', '🥣', 'photo-1521483451569-e33803c0330c', 3.19, 1.90, 50, 10],
  ['Pantry', 'Basmati Rice (1 kg)', 'PNT-001', '🍚', 'photo-1586201375761-83865001e31c', 2.89, 1.70, 95, 18],
  ['Pantry', 'Spaghetti (500 g)', 'PNT-002', '🍝', 'photo-1551462147-ff29053bfc14', 1.49, 0.80, 105, 20],
  ['Meat & Seafood', 'Salmon Fillet (300 g)', 'MST-001', '🐟', 'photo-1519708227418-c8fd9a32b7a2', 7.99, 5.20, 18, 4],
  ['Meat & Seafood', 'Chicken Breast (500 g)', 'MST-002', '🍗', 'photo-1587593810167-a84920ea0781', 5.49, 3.40, 32, 6],
  ['Household', 'Laundry Detergent (2 L)', 'HSH-001', '🧴', 'photo-1585421514738-01798e348b17', 6.99, 4.10, 36, 8],
  ['Household', 'Toilet Paper (12 rolls)', 'HSH-002', '🧻', 'photo-1584556812952-905ffd0c611a', 5.99, 3.60, 58, 12],
];

// [name, phone, email, points, lifetime, spent]
const CUSTOMERS: [string, string, string, number, number, number][] = [
  ['Layla Haddad', '+961 3 214 657', 'layla.haddad@example.com', 320, 540, 486.20],
  ['Omar Fakhoury', '+961 70 882 341', 'omar.fakhoury@example.com', 145, 145, 132.75],
  ['Nour El-Khatib', '+961 76 445 210', 'nour.khatib@example.com', 610, 980, 874.90],
  ['Karim Safadi', '+961 71 993 084', 'karim.safadi@example.com', 55, 55, 48.30],
  ['Rania Doumit', '+961 3 776 502', 'rania.doumit@example.com', 230, 410, 365.45],
  ['Hassan Mokdad', '+961 78 120 936', 'hassan.mokdad@example.com', 90, 190, 171.60],
  ['Maya Chidiac', '+961 81 347 265', 'maya.chidiac@example.com', 480, 720, 655.10],
  ['Ziad Nassar', '+961 70 558 493', 'ziad.nassar@example.com', 15, 15, 12.99],
];

const tierFor = (lifetime: number) =>
  lifetime >= 900 ? 'Platinum' : lifetime >= 600 ? 'Gold' : lifetime >= 300 ? 'Silver' : 'Bronze';

async function main(): Promise<void> {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: npx tsx src/scripts/seedStoreDemoData.ts <owner-email>');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI as string);

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user?.storeId) {
    console.error(`No store found for ${email}`);
    process.exit(1);
  }
  const store = await Store.findById(user.storeId);
  console.log(`Seeding "${store?.name}" (${store?.businessType}, ${store?.currency}) — additive only\n`);
  const storeId = user.storeId;

  // Categories: find-or-create by name.
  const categoryIds = new Map<string, mongoose.Types.ObjectId>();
  for (const name of [...new Set(PRODUCTS.map(([c]) => c))]) {
    const existing = await Category.findOne({ storeId, name });
    if (existing) {
      categoryIds.set(name, existing._id as mongoose.Types.ObjectId);
    } else {
      const created = await Category.create({ storeId, name, isActive: true });
      categoryIds.set(name, created._id as mongoose.Types.ObjectId);
      console.log(`  + category: ${name}`);
    }
  }

  // Products: skip any SKU that already exists in this store.
  let added = 0;
  for (const [cat, name, sku, emoji, photo, price, cost, quantity, reorderThreshold] of PRODUCTS) {
    if (await Product.exists({ storeId, sku })) continue;
    await Product.create({
      storeId, name, sku, emoji, price, cost, quantity, reorderThreshold,
      imageUrl: img(photo),
      categoryId: categoryIds.get(cat),
      isActive: true,
    });
    added++;
    console.log(`  + product: ${name} (${sku})`);
  }

  // Customers: skip if a customer with the same name already exists.
  let addedCustomers = 0;
  for (const [name, phone, custEmail, loyaltyPoints, lifetimePointsEarned, totalSpent] of CUSTOMERS) {
    if (await Customer.exists({ storeId, name })) continue;
    await Customer.create({
      storeId, name, phone, email: custEmail,
      loyaltyPoints, lifetimePointsEarned, totalSpent,
      loyaltyTier: tierFor(lifetimePointsEarned),
      isActive: true,
    });
    addedCustomers++;
    console.log(`  + customer: ${name}`);
  }

  console.log(`\nDone: ${added} products, ${addedCustomers} customers added.`);
  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}
