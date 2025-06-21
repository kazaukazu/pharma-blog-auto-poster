import { Router } from 'express';
import {
  createSchedule,
  getSchedules,
  getSchedule,
  updateSchedule,
  deleteSchedule,
  testSchedule,
  getMonthlyLimit,
  getUpcomingSchedules,
  toggleSchedule,
} from '../controllers/scheduleController';
import { authenticateToken } from '../middleware/auth';
import { validateBody, validateParams } from '../middleware/validation';
import { scheduleValidation } from '../utils/validation';
import Joi from 'joi';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Schedule CRUD operations
router.post('/:site_id/schedules', 
  validateParams(Joi.object({
    site_id: Joi.string().uuid().required(),
  })),
  validateBody(scheduleValidation.create), 
  createSchedule
);

router.get('/:site_id/schedules', 
  validateParams(Joi.object({
    site_id: Joi.string().uuid().required(),
  })),
  getSchedules
);

router.get('/:site_id/schedules/:id', 
  validateParams(Joi.object({
    site_id: Joi.string().uuid().required(),
    id: Joi.string().uuid().required(),
  })),
  getSchedule
);

router.put('/:site_id/schedules/:id', 
  validateParams(Joi.object({
    site_id: Joi.string().uuid().required(),
    id: Joi.string().uuid().required(),
  })),
  validateBody(scheduleValidation.update), 
  updateSchedule
);

router.delete('/:site_id/schedules/:id', 
  validateParams(Joi.object({
    site_id: Joi.string().uuid().required(),
    id: Joi.string().uuid().required(),
  })),
  deleteSchedule
);

// Schedule actions
router.post('/:site_id/schedules/:id/toggle', 
  validateParams(Joi.object({
    site_id: Joi.string().uuid().required(),
    id: Joi.string().uuid().required(),
  })),
  validateBody(Joi.object({
    is_active: Joi.boolean().required(),
  })),
  toggleSchedule
);

// Utility endpoints
router.post('/test-schedule', 
  validateBody(Joi.object({
    cron_expression: Joi.string().required(),
  })),
  testSchedule
);

router.get('/:site_id/monthly-limit', 
  validateParams(Joi.object({
    site_id: Joi.string().uuid().required(),
  })),
  getMonthlyLimit
);

router.get('/upcoming', getUpcomingSchedules);

export default router;