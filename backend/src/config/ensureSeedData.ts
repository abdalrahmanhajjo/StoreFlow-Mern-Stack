import { Plan } from '../models/plan.model';
import { EmailTemplate } from '../models/email_templates.model';
import { seedOfficialPlans } from '../scripts/seedPlans';
import { TEMPLATES } from '../scripts/seedEmailTemplates';

/**
 * Boot-time safety net for a fresh database: registration is impossible
 * without the official plans, and templated emails silently no-op without
 * their templates. Runs after the DB connects.
 *
 * Deliberately conservative so restarts never clobber admin edits:
 * - plans are seeded only when the collection is EMPTY;
 * - email templates are inserted only for slugs that don't exist yet
 *   ($setOnInsert — an edited template is never overwritten).
 *
 * A failure here is logged loudly but doesn't kill the server — the manual
 * seed scripts remain the recovery path.
 */
export async function ensureSeedData(): Promise<void> {
    try {
        const planCount = await Plan.estimatedDocumentCount();
        if (planCount === 0) {
            console.log('[seed] no plans in database — seeding official plans');
            await seedOfficialPlans();
        }

        let inserted = 0;
        for (const t of TEMPLATES) {
            const res = await EmailTemplate.updateOne(
                { slug: t.slug },
                { $setOnInsert: t },
                { upsert: true },
            );
            if (res.upsertedCount > 0) inserted++;
        }
        if (inserted > 0) {
            console.log(`[seed] inserted ${inserted} missing email template(s)`);
        }
    } catch (err) {
        console.error('[seed] startup seeding failed — registration/emails may be degraded:', err);
    }
}
