import Joi from 'joi';

export const userValidation = {
  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    name: Joi.string().min(2).max(255).required(),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),
};

export const siteValidation = {
  create: Joi.object({
    name: Joi.string().min(2).max(255).required(),
    url: Joi.string().uri().required(),
    username: Joi.string().min(2).max(255).required(),
    password: Joi.string().min(1).required(),
    region: Joi.string().min(2).max(100).required(),
    pharmacy_name: Joi.string().min(2).max(255).required(),
    pharmacy_features: Joi.string().max(1000).optional(),
    category_id: Joi.number().integer().positive().optional(),
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(255).optional(),
    url: Joi.string().uri().optional(),
    username: Joi.string().min(2).max(255).optional(),
    password: Joi.string().min(1).optional(),
    region: Joi.string().min(2).max(100).optional(),
    pharmacy_name: Joi.string().min(2).max(255).optional(),
    pharmacy_features: Joi.string().max(1000).optional(),
    category_id: Joi.number().integer().positive().optional(),
    is_active: Joi.boolean().optional(),
  }),
};

export const templateValidation = {
  create: Joi.object({
    name: Joi.string().min(2).max(255).required(),
    tone: Joi.string().valid('professional', 'friendly', 'neutral').required(),
    target_length: Joi.number().integer().min(500).max(5000).required(),
    keywords: Joi.array().items(Joi.string().min(1).max(100)).max(20).required(),
    exclude_keywords: Joi.array().items(Joi.string().min(1).max(100)).max(20).optional(),
    structure: Joi.string().min(10).max(1000).required(),
    seo_focus: Joi.boolean().optional().default(true),
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(255).optional(),
    tone: Joi.string().valid('professional', 'friendly', 'neutral').optional(),
    target_length: Joi.number().integer().min(500).max(5000).optional(),
    keywords: Joi.array().items(Joi.string().min(1).max(100)).max(20).optional(),
    exclude_keywords: Joi.array().items(Joi.string().min(1).max(100)).max(20).optional(),
    structure: Joi.string().min(10).max(1000).optional(),
    seo_focus: Joi.boolean().optional(),
  }),
};

export const topicValidation = {
  create: Joi.object({
    category: Joi.string().min(2).max(100).required(),
    title: Joi.string().min(2).max(255).required(),
    description: Joi.string().max(1000).optional(),
    priority: Joi.string().valid('high', 'medium', 'low').optional().default('medium'),
    seasonal: Joi.boolean().optional().default(false),
  }),

  update: Joi.object({
    category: Joi.string().min(2).max(100).optional(),
    title: Joi.string().min(2).max(255).optional(),
    description: Joi.string().max(1000).optional(),
    priority: Joi.string().valid('high', 'medium', 'low').optional(),
    seasonal: Joi.boolean().optional(),
    is_active: Joi.boolean().optional(),
  }),
};

export const scheduleValidation = {
  create: Joi.object({
    frequency: Joi.string().valid('daily', 'weekly_3', 'weekly_2', 'weekly_1', 'monthly_2', 'custom').required(),
    time_slot: Joi.string().valid('morning', 'afternoon', 'evening', 'night', 'specific').required(),
    specific_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).when('time_slot', {
      is: 'specific',
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
    timezone: Joi.string().optional().default('Asia/Tokyo'),
    skip_holidays: Joi.boolean().optional().default(true),
    max_monthly_posts: Joi.number().integer().min(1).max(500).optional().default(100),
    cron_expression: Joi.string().when('frequency', {
      is: 'custom',
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
  }),

  update: Joi.object({
    frequency: Joi.string().valid('daily', 'weekly_3', 'weekly_2', 'weekly_1', 'monthly_2', 'custom').optional(),
    time_slot: Joi.string().valid('morning', 'afternoon', 'evening', 'night', 'specific').optional(),
    specific_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    timezone: Joi.string().optional(),
    skip_holidays: Joi.boolean().optional(),
    max_monthly_posts: Joi.number().integer().min(1).max(500).optional(),
    cron_expression: Joi.string().optional(),
    is_active: Joi.boolean().optional(),
  }),
};

export const postValidation = {
  create: Joi.object({
    title: Joi.string().min(5).max(500).required(),
    content: Joi.string().min(100).optional(),
    topic_id: Joi.string().uuid().optional(),
    template_id: Joi.string().uuid().optional(),
    scheduled_at: Joi.date().greater('now').optional(),
  }),

  update: Joi.object({
    title: Joi.string().min(5).max(500).optional(),
    content: Joi.string().min(100).optional(),
    topic_id: Joi.string().uuid().optional(),
    template_id: Joi.string().uuid().optional(),
    status: Joi.string().valid('draft', 'scheduled', 'published', 'failed', 'processing').optional(),
    scheduled_at: Joi.date().optional(),
  }),
};