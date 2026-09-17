import { Router } from 'express';
import { authController } from '../controllers/authController';
import { requireAuth } from '../middleware/authMiddleware';
import { authLimiter, forgotPasswordLimiter } from '../middleware/rateLimiter';
import { uploadMemoryStorage } from '../controllers/fileController';

const router = Router();

router.post('/login', authLimiter, authController.login);
router.get('/me', requireAuth, authController.getMe);
router.post('/forgot-password', forgotPasswordLimiter, authController.forgotPassword);
router.post('/change-password', requireAuth, authController.changePassword);
router.put('/profile', requireAuth, authController.updateProfile);

export default router;
