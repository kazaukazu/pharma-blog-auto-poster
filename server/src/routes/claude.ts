import { Router } from 'express';
import {
  generateArticle,
  getClaudeRequests,
  getClaudeRequest,
  retryClaudeRequest,
  getClaudeStats,
  testClaudeConnection,
  deleteClaudeRequest,
} from '../controllers/claudeController';
import { authenticateToken } from '../middleware/auth';
import { validateBody, validateParams, validateQuery } from '../middleware/validation';
import Joi from 'joi';

const router = Router();

// Public endpoint for testing Claude connection
router.get('/test-connection', testClaudeConnection);

// All other routes require authentication
router.use(authenticateToken);

// Article generation
router.post('/:site_id/generate', 
  validateParams(Joi.object({
    site_id: Joi.string().uuid().required(),
  })),
  validateBody(Joi.object({
    request_data: Joi.object({
      site_info: Joi.object({
        region: Joi.string().required(),
        pharmacy_name: Joi.string().required(),
        pharmacy_features: Joi.string().optional(),
      }).required(),
      article_config: Joi.object({
        topic: Joi.string().required(),
        tone: Joi.string().valid('professional', 'friendly', 'neutral').required(),
        target_length: Joi.number().integer().min(500).max(5000).required(),
        keywords: Joi.array().items(Joi.string()).min(1).max(20).required(),
        exclude_keywords: Joi.array().items(Joi.string()).max(20).optional(),
      }).required(),
      template: Joi.object({
        structure: Joi.string().required(),
        seo_focus: Joi.boolean().optional(),
      }).required(),
    }).required(),
    create_post: Joi.boolean().optional().default(true),
  })),
  generateArticle
);

// Claude request management
router.get('/:site_id/requests', 
  validateParams(Joi.object({
    site_id: Joi.string().uuid().required(),
  })),
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
  })),
  getClaudeRequests
);

router.get('/:site_id/requests/:id', 
  validateParams(Joi.object({
    site_id: Joi.string().uuid().required(),
    id: Joi.string().uuid().required(),
  })),
  getClaudeRequest
);

router.post('/:site_id/requests/:id/retry', 
  validateParams(Joi.object({
    site_id: Joi.string().uuid().required(),
    id: Joi.string().uuid().required(),
  })),
  retryClaudeRequest
);

router.delete('/:site_id/requests/:id', 
  validateParams(Joi.object({
    site_id: Joi.string().uuid().required(),
    id: Joi.string().uuid().required(),
  })),
  deleteClaudeRequest
);

// Claude statistics
router.get('/:site_id/stats', 
  validateParams(Joi.object({
    site_id: Joi.string().uuid().required(),
  })),
  getClaudeStats
);

export default router;