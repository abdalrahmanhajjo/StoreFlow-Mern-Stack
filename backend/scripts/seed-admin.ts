/**
 * Seeds (or resets) the platform admin account. Idempotent — safe to run
 * again; it updates the password/role if the account already exists.
 *
 *   npm run seed:admin                          # against MONGO_URI from .env
 *   MONGO_URI=... npm run seed:admin            # against any other database
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run seed:admin
 *
 * dev:memory also calls seedAdmin() on boot, so the in-memory database
 * always has a working admin.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '../src/models/user.model';
import { hashPassword } from '../src/utils/auth.utils';

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@storeflow.app';
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin!Flow2026';

export async function seedAdmin(): Promise<void> {
  const passwordHash = await hashPassword(ADMIN_PASSWORD);
  const existing = await User.findOne({ email: ADMIN_EMAIL }).select('+passwordHash');

  if (existing) {
    existing.passwordHash = passwordHash;
    existing.role = 'platform_admin';
    existing.isEmailVerified = true;
    existing.lockUntil = null;
    existing.failedLoginAttempts = 0;
    await existing.save();
  } else {
    await User.create({
      name: 'Platform Admin',
      email: ADMIN_EMAIL,
      passwordHash,
      role: 'platform_admin',
      storeId: null,
      isEmailVerified: true,
      // Model requires these; placeholders for the internal account.
      phone: { countryCode: '+1', number: '0000000' },
      idVerification: { type: 'national_id', number: 'ADMIN-SEED' },
    });
  }

  console.log(`[seed] platform admin ready: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
}

if (require.main === module) {
  mongoose
    .connect(process.env.MONGO_URI as string)
    .then(async () => {
      await seedAdmin();
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
