import { Router } from 'express';
import {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
} from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { authRateLimit } from '../middleware/rateLimiter';
import { validateBody } from '../middleware/validation';
import { userValidation } from '../utils/validation';
import Joi from 'joi';

const router = Router();

// Public routes with rate limiting
router.post('/register', authRateLimit, validateBody(userValidation.register), register);
router.post('/login', authRateLimit, validateBody(userValidation.login), login);

// Protected routes
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', 
  authenticateToken, 
  validateBody(Joi.object({
    name: Joi.string().min(2).max(255).optional(),
    email: Joi.string().email().optional(),
  })), 
  updateProfile
);

router.put('/change-password', 
  authenticateToken,
  validateBody(Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).required(),
  })),
  changePassword
);

router.delete('/account', authenticateToken, deleteAccount);

export default router;