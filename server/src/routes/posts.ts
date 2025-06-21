import { Router } from 'express';
import {
  createPost,
  getPosts,
  getPost,
  updatePost,
  deletePost,
  publishPost,
  schedulePost,
  getPostStats,
  retryFailedPost,
} from '../controllers/postController';
import { authenticateToken } from '../middleware/auth';
import { validateBody, validateParams, validateQuery } from '../middleware/validation';
import { postValidation } from '../utils/validation';
import Joi from 'joi';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Post CRUD operations
router.post('/:site_id/posts', 
  validateParams(Joi.object({
    site_id: Joi.string().uuid().required(),
  })),
  validateBody(postValidation.create), 
  createPost
);

router.get('/:site_id/posts', 
  validateParams(Joi.object({
    site_id: Joi.string().uuid().required(),
  })),
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    status: Joi.string().valid('draft', 'scheduled', 'published', 'failed', 'processing').optional(),
  })),
  getPosts
);

router.get('/:site_id/posts/:id', 
  validateParams(Joi.object({
    site_id: Joi.string().uuid().required(),
    id: Joi.string().uuid().required(),
  })),
  getPost
);

router.put('/:site_id/posts/:id', 
  validateParams(Joi.object({
    site_id: Joi.string().uuid().required(),
    id: Joi.string().uuid().required(),
  })),
  validateBody(postValidation.update), 
  updatePost
);

router.delete('/:site_id/posts/:id', 
  validateParams(Joi.object({
    site_id: Joi.string().uuid().required(),
    id: Joi.string().uuid().required(),
  })),
  deletePost
);

// Post actions
router.post('/:site_id/posts/:id/publish', 
  validateParams(Joi.object({
    site_id: Joi.string().uuid().required(),
    id: Joi.string().uuid().required(),
  })),
  publishPost
);

router.post('/:site_id/posts/:id/schedule', 
  validateParams(Joi.object({
    site_id: Joi.string().uuid().required(),
    id: Joi.string().uuid().required(),
  })),
  validateBody(Joi.object({
    scheduled_at: Joi.date().greater('now').required(),
  })),
  schedulePost
);

router.post('/:site_id/posts/:id/retry', 
  validateParams(Joi.object({
    site_id: Joi.string().uuid().required(),
    id: Joi.string().uuid().required(),
  })),
  retryFailedPost
);

// Post statistics
router.get('/:site_id/posts/stats', 
  validateParams(Joi.object({
    site_id: Joi.string().uuid().required(),
  })),
  getPostStats
);

export default router;