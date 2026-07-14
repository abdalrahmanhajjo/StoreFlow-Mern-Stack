import express from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/role.middleware';
import {
  listSubscriptions,
  getSubscriptionDetail,
  suspendSubscription,
  reactivateSubscription,
  createManualSubscription,
  listBillingAccounts,
} from '../../controllers/admin/billingAdmin.controller';

const router = express.Router();

// All admin billing routes require platform_admin role
router.use(authenticate);
router.use(authorize('platform_admin'));

router.get('/subscriptions', listSubscriptions);
router.get('/subscriptions/:id', getSubscriptionDetail);
router.post('/subscriptions/:id/suspend', suspendSubscription);
router.post('/subscriptions/:id/reactivate', reactivateSubscription);
router.post('/manual-subscription', createManualSubscription);
router.get('/accounts', listBillingAccounts);

export default router;
