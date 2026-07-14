import express from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { tenantScopeOptional } from '../../middleware/tenant.middleware';
import { validate } from '../../middleware/validate.middleware';
import { z } from 'zod';
import {
  getPublicPlans,
  getPlanBySlug,
  getSubscription,
  getEntitlements,
  getUsage,
  getInvoices,
  getInvoiceByPublicId,
  createQuote,
  createCheckoutSession,
  getCheckoutStatus,
  changePlan,
  previewChange,
  scheduleDowngrade,
  cancelSubscription,
  reactivateSubscription,
  createPortalSession,
  getPlanLimits,
  registerWithPlan,
  getCheckoutSessionStatusBySession,
  getDemoCheckoutSession,
  payDemoCheckoutSession,
} from '../../controllers/billing.controller';

const router = express.Router();

// The validate middleware parses { body, query, params }, so every schema
// must wrap its fields under `body`.
const planCodeIntervalSchema = z.object({
  body: z.object({
    planCode: z.string().min(1, 'Plan code is required'),
    billingInterval: z.enum(['monthly', 'yearly']),
  }),
});

const planCodeSchema = z.object({
  body: z.object({
    planCode: z.string().min(1, 'Plan code is required'),
  }),
});

const cancelSchema = z.object({
  body: z.object({
    reason: z.string().max(500).optional(),
  }),
});

const portalSchema = z.object({
  body: z.object({
    returnUrl: z.string().optional(),
  }),
});

const quoteSchema = z.object({
  body: z.object({
    planCode: z.string().min(1),
    billingInterval: z.enum(['monthly', 'yearly']),
    promotionCode: z.string().optional(),
  }),
});

// Public plans (no auth required)
router.get('/plans', getPublicPlans);
router.get('/plans/:slug', getPlanBySlug);

// Registration plan validation
router.post('/register-plan', validate(planCodeIntervalSchema), registerWithPlan);

// Authenticated billing endpoints
router.get('/subscription', authenticate, getSubscription);
router.get('/entitlements', authenticate, getEntitlements);
router.get('/usage', authenticate, getUsage);
// Billing is account-level: it must work even before the owner's store
// exists, so the tenant scope is optional (usage counts degrade gracefully).
router.get('/limits', authenticate, tenantScopeOptional, getPlanLimits);

router.get('/invoices', authenticate, getInvoices);
router.get('/invoices/:publicId', authenticate, getInvoiceByPublicId);

router.post('/quotes', validate(quoteSchema), createQuote);
router.post('/checkout-sessions', authenticate, validate(planCodeIntervalSchema), createCheckoutSession);
router.get('/checkout-sessions/status', authenticate, getCheckoutStatus);
// Public: opaque session ID, leaks only lifecycle status (post-payment polling
// happens before the user has verified their email / logged in).
router.get('/checkout-sessions/:sessionId/status', getCheckoutSessionStatusBySession);

// Demo checkout — active only with the mock provider outside production.
router.get('/demo/checkout-sessions/:sessionId', getDemoCheckoutSession);
router.post('/demo/checkout-sessions/:sessionId/pay', payDemoCheckoutSession);

router.post('/change-preview', authenticate, validate(planCodeIntervalSchema), previewChange);
router.post('/change-plan', authenticate, validate(planCodeIntervalSchema), changePlan);
router.post('/downgrade', authenticate, validate(planCodeSchema), scheduleDowngrade);
router.post('/cancel', authenticate, validate(cancelSchema), cancelSubscription);
router.post('/reactivate', authenticate, reactivateSubscription);

router.post('/portal-sessions', authenticate, validate(portalSchema), createPortalSession);

export default router;
