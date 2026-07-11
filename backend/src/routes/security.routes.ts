import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/role.middleware';
import { getLoginAttempts, getActiveSessions } from '../controllers/security.controller';

const router = Router();

router.use(authenticate);
router.use(authorize('platform_admin'));

router.get('/login-attempts', getLoginAttempts);
router.get('/sessions', getActiveSessions);

export default router;
