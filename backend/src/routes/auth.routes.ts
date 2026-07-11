import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', authController.register);

router.post('/verify-email-code', authController.verifyEmailCode);

router.post('/resend-verification-code', authController.resendVerificationCode);

router.post('/login', authController.login);

router.post('/refresh', authController.refresh);

router.post('/logout', authController.logout);

router.get('/me', authenticate, authController.me);

router.get('/approval-status', authController.approvalStatus);

router.post('/forgot-password', authController.forgotPassword);

router.post('/reset-password', authController.resetPassword);

export default router;