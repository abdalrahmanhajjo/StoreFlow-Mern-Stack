import express from 'express';
import { getMySubscription, getPlanLimits, changePlan } from '../controllers/subscription.controller';
import { authenticate } from '../middleware/auth.middleware';
import { tenantScope } from '../middleware/tenant.middleware';
import { validate } from '../middleware/validate.middleware';
import { z } from 'zod';

const router = express.Router();

const changePlanSchema = z.object({
  body: z.object({
    planCode: z.string().min(1, 'Plan code is required'),
    billingInterval: z.enum(['monthly', 'yearly']),
  }),
});

router.get('/me', authenticate, getMySubscription);
router.get('/limits', authenticate, tenantScope, getPlanLimits);
router.post('/change', authenticate, validate(changePlanSchema), changePlan);

export default router;
