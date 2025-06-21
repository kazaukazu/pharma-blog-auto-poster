import { Request, Response, NextFunction } from 'express';
import { PostingScheduleModel } from '../models/PostingSchedule';
import { WordPressSiteModel } from '../models/WordPressSite';
import { SchedulerService } from '../services/schedulerService';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import logger from '../utils/logger';

export const createSchedule = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { site_id } = req.params;
  const {
    frequency,
    time_slot,
    specific_time,
    timezone,
    skip_holidays,
    max_monthly_posts,
    cron_expression,
  } = req.body;
  const userId = req.user!.id;

  // Verify site ownership
  const site = await WordPressSiteModel.findById(site_id, userId);
  if (!site) {
    throw createError('Site not found', 404);
  }

  // Check if site already has an active schedule
  const existingSchedules = await PostingScheduleModel.findBySiteId(site_id);
  const activeSchedule = existingSchedules.find(s => s.is_active);
  
  if (activeSchedule) {
    throw createError('Site already has an active schedule. Please disable it first.', 409);
  }

  // Generate cron expression if not provided
  let finalCronExpression = cron_expression;
  if (!finalCronExpression && frequency !== 'custom') {
    finalCronExpression = SchedulerService.generateCronExpression(frequency, time_slot, specific_time);
  }

  // Validate cron expression
  if (finalCronExpression && !SchedulerService.validateCronExpression(finalCronExpression)) {
    throw createError('Invalid cron expression', 400);
  }

  // Create schedule
  const schedule = await PostingScheduleModel.create({
    site_id,
    frequency,
    time_slot,
    specific_time,
    timezone: timezone || 'Asia/Tokyo',
    skip_holidays,
    max_monthly_posts,
    cron_expression: finalCronExpression,
  });

  logger.info('Posting schedule created', {
    userId,
    siteId: site_id,
    scheduleId: schedule.id,
    frequency,
    cronExpression: finalCronExpression,
  });

  res.status(201).json({
    success: true,
    data: {
      ...schedule,
      next_executions: SchedulerService.getNextExecutionDates(finalCronExpression || '', 5),
    },
  });
});

export const getSchedules = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { site_id } = req.params;
  const userId = req.user!.id;

  // Verify site ownership
  const site = await WordPressSiteModel.findById(site_id, userId);
  if (!site) {
    throw createError('Site not found', 404);
  }

  const schedules = await PostingScheduleModel.findBySiteId(site_id);

  // Add next execution dates for active schedules
  const schedulesWithNext = schedules.map(schedule => ({
    ...schedule,
    next_executions: schedule.is_active && schedule.cron_expression 
      ? SchedulerService.getNextExecutionDates(schedule.cron_expression, 5)
      : [],
  }));

  res.json({
    success: true,
    data: schedulesWithNext,
  });
});

export const getSchedule = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { site_id, id } = req.params;
  const userId = req.user!.id;

  // Verify site ownership
  const site = await WordPressSiteModel.findById(site_id, userId);
  if (!site) {
    throw createError('Site not found', 404);
  }

  const schedule = await PostingScheduleModel.findById(id, site_id);
  if (!schedule) {
    throw createError('Schedule not found', 404);
  }

  const response = {
    ...schedule,
    next_executions: schedule.is_active && schedule.cron_expression 
      ? SchedulerService.getNextExecutionDates(schedule.cron_expression, 5)
      : [],
  };

  res.json({
    success: true,
    data: response,
  });
});

export const updateSchedule = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { site_id, id } = req.params;
  const updates = req.body;
  const userId = req.user!.id;

  // Verify site ownership
  const site = await WordPressSiteModel.findById(site_id, userId);
  if (!site) {
    throw createError('Site not found', 404);
  }

  const existingSchedule = await PostingScheduleModel.findById(id, site_id);
  if (!existingSchedule) {
    throw createError('Schedule not found', 404);
  }

  // Generate new cron expression if frequency or time settings changed
  if ((updates.frequency || updates.time_slot || updates.specific_time) && 
      updates.frequency !== 'custom' && !updates.cron_expression) {
    const frequency = updates.frequency || existingSchedule.frequency;
    const timeSlot = updates.time_slot || existingSchedule.time_slot;
    const specificTime = updates.specific_time || existingSchedule.specific_time;
    
    updates.cron_expression = SchedulerService.generateCronExpression(frequency, timeSlot, specificTime);
  }

  // Validate cron expression if provided
  if (updates.cron_expression && !SchedulerService.validateCronExpression(updates.cron_expression)) {
    throw createError('Invalid cron expression', 400);
  }

  const updatedSchedule = await PostingScheduleModel.update(id, site_id, updates);
  if (!updatedSchedule) {
    throw createError('Failed to update schedule', 500);
  }

  logger.info('Posting schedule updated', {
    userId,
    siteId: site_id,
    scheduleId: id,
    updates: Object.keys(updates),
  });

  const response = {
    ...updatedSchedule,
    next_executions: updatedSchedule.is_active && updatedSchedule.cron_expression 
      ? SchedulerService.getNextExecutionDates(updatedSchedule.cron_expression, 5)
      : [],
  };

  res.json({
    success: true,
    data: response,
  });
});

export const deleteSchedule = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { site_id, id } = req.params;
  const userId = req.user!.id;

  // Verify site ownership
  const site = await WordPressSiteModel.findById(site_id, userId);
  if (!site) {
    throw createError('Site not found', 404);
  }

  const success = await PostingScheduleModel.delete(id, site_id);
  if (!success) {
    throw createError('Schedule not found', 404);
  }

  logger.info('Posting schedule deleted', { userId, siteId: site_id, scheduleId: id });

  res.json({
    success: true,
    message: 'Schedule deleted successfully',
  });
});

export const testSchedule = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { cron_expression } = req.body;

  if (!SchedulerService.validateCronExpression(cron_expression)) {
    throw createError('Invalid cron expression', 400);
  }

  const nextExecutions = SchedulerService.getNextExecutionDates(cron_expression, 10);

  res.json({
    success: true,
    data: {
      valid: true,
      next_executions: nextExecutions,
    },
  });
});

export const getMonthlyLimit = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { site_id } = req.params;
  const userId = req.user!.id;

  // Verify site ownership
  const site = await WordPressSiteModel.findById(site_id, userId);
  if (!site) {
    throw createError('Site not found', 404);
  }

  const limitInfo = await PostingScheduleModel.checkMonthlyPostLimit(site_id);

  res.json({
    success: true,
    data: limitInfo,
  });
});

export const getUpcomingSchedules = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = req.user!.id;

  // Get user's sites
  const sites = await WordPressSiteModel.findByUserId(userId);
  const siteIds = sites.map(site => site.id);

  if (siteIds.length === 0) {
    return res.json({
      success: true,
      data: [],
    });
  }

  // Get upcoming schedules for user's sites
  const allUpcoming = await PostingScheduleModel.getUpcomingSchedules(50);
  const userUpcoming = allUpcoming.filter(schedule => siteIds.includes(schedule.site_id));

  res.json({
    success: true,
    data: userUpcoming.slice(0, 10),
  });
});

export const toggleSchedule = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { site_id, id } = req.params;
  const { is_active } = req.body;
  const userId = req.user!.id;

  // Verify site ownership
  const site = await WordPressSiteModel.findById(site_id, userId);
  if (!site) {
    throw createError('Site not found', 404);
  }

  const updatedSchedule = await PostingScheduleModel.update(id, site_id, { is_active });
  if (!updatedSchedule) {
    throw createError('Schedule not found', 404);
  }

  logger.info(`Posting schedule ${is_active ? 'enabled' : 'disabled'}`, {
    userId,
    siteId: site_id,
    scheduleId: id,
  });

  res.json({
    success: true,
    data: updatedSchedule,
  });
});