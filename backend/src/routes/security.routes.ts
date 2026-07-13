import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/role.middleware';
import {
    getLoginAttempts,
    getActiveSessions,
    revokeSession,
    revokeAllSessions,
} from '../controllers/security.controller';

const router = Router();

router.use(authenticate);
router.use(authorize('platform_admin'));

router.get('/login-attempts', getLoginAttempts);
router.get('/sessions', getActiveSessions);

// Put revoke-all before /:id so Express does not treat "revoke-all" as an id.
router.patch('/sessions/revoke-all', revokeAllSessions);
router.patch('/sessions/:id/revoke', revokeSession);

export default router;