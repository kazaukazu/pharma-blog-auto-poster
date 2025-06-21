import { Router } from 'express';
import {
  createSite,
  getSites,
  getSite,
  updateSite,
  deleteSite,
  testConnection,
  getCategories,
} from '../controllers/siteController';
import { authenticateToken } from '../middleware/auth';
import { validateBody, validateParams } from '../middleware/validation';
import { siteValidation } from '../utils/validation';
import Joi from 'joi';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Site CRUD operations
router.post('/', validateBody(siteValidation.create), createSite);
router.get('/', getSites);
router.get('/:id', 
  validateParams(Joi.object({
    id: Joi.string().uuid().required(),
  })),
  getSite
);
router.put('/:id', 
  validateParams(Joi.object({
    id: Joi.string().uuid().required(),
  })),
  validateBody(siteValidation.update), 
  updateSite
);
router.delete('/:id', 
  validateParams(Joi.object({
    id: Joi.string().uuid().required(),
  })),
  deleteSite
);

// WordPress-specific operations
router.post('/:id/test-connection', 
  validateParams(Joi.object({
    id: Joi.string().uuid().required(),
  })),
  testConnection
);
router.get('/:id/categories', 
  validateParams(Joi.object({
    id: Joi.string().uuid().required(),
  })),
  getCategories
);

export default router;