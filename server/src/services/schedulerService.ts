import cron from 'node-cron';
import { PostingService } from './postingService';
import { ClaudeRequestModel } from '../models/ClaudeRequest';
import logger from '../utils/logger';

export class SchedulerService {
  private static jobs: Map<string, cron.ScheduledTask> = new Map();

  static init() {
    // Process scheduled posts every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      logger.info('Running scheduled posts processor');
      await PostingService.processScheduledPosts();
    });

    // Process pending Claude requests every 2 minutes
    cron.schedule('*/2 * * * *', async () => {
      logger.info('Processing pending Claude requests');
      await this.processPendingClaudeRequests();
    });

    // Clean up old failed requests every hour
    cron.schedule('0 * * * *', async () => {
      logger.info('Cleaning up old requests');
      await this.cleanupOldRequests();
    });

    logger.info('Scheduler service initialized');
  }

  static addCustomJob(
    id: string,
    cronExpression: string,
    callback: () => Promise<void>
  ): boolean {
    try {
      if (this.jobs.has(id)) {
        this.jobs.get(id)?.destroy();
      }

      const task = cron.schedule(cronExpression, callback, {
        scheduled: false,
      });

      this.jobs.set(id, task);
      task.start();

      logger.info('Custom cron job added', { id, cronExpression });
      return true;
    } catch (error: any) {
      logger.error('Failed to add custom cron job', {
        id,
        cronExpression,
        error: error.message,
      });
      return false;
    }
  }

  static removeCustomJob(id: string): boolean {
    const job = this.jobs.get(id);
    if (job) {
      job.destroy();
      this.jobs.delete(id);
      logger.info('Custom cron job removed', { id });
      return true;
    }
    return false;
  }

  static getActiveJobs(): string[] {
    return Array.from(this.jobs.keys());
  }

  private static async processPendingClaudeRequests(): Promise<void> {
    try {
      const pendingRequests = await ClaudeRequestModel.getPendingRequests(5);
      
      if (pendingRequests.length === 0) {
        return;
      }

      logger.info(`Processing ${pendingRequests.length} pending Claude requests`);

      for (const request of pendingRequests) {
        try {
          // Update status to processing
          await ClaudeRequestModel.update(request.id, { status: 'processing' });

          // This would be handled by a separate worker service in production
          // For now, we'll just log it
          logger.info('Claude request marked for processing', {
            requestId: request.id,
            siteId: request.site_id,
          });

          // In a real implementation, you would:
          // 1. Add to a job queue (Redis/Bull)
          // 2. Process by worker services
          // 3. Handle retries and failures
          
        } catch (error: any) {
          logger.error('Error processing Claude request', {
            requestId: request.id,
            error: error.message,
          });

          await ClaudeRequestModel.update(request.id, {
            status: 'failed',
            error_message: error.message,
          });
        }
      }
    } catch (error: any) {
      logger.error('Error in processPendingClaudeRequests', {
        error: error.message,
      });
    }
  }

  private static async cleanupOldRequests(): Promise<void> {
    try {
      // This would clean up old completed/failed requests
      // Implementation depends on retention policy
      logger.info('Cleanup process would run here');
      
      // Example: Delete failed requests older than 7 days
      // const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      // await ClaudeRequestModel.deleteOldRequests(cutoffDate);
      
    } catch (error: any) {
      logger.error('Error in cleanupOldRequests', {
        error: error.message,
      });
    }
  }

  static generateCronExpression(frequency: string, timeSlot: string, specificTime?: string): string {
    const getTimeFromSlot = (slot: string): { hour: number; minute: number } => {
      switch (slot) {
        case 'morning':
          return { hour: 9, minute: 0 };
        case 'afternoon':
          return { hour: 14, minute: 0 };
        case 'evening':
          return { hour: 18, minute: 0 };
        case 'night':
          return { hour: 22, minute: 0 };
        case 'specific':
          if (specificTime) {
            const [hour, minute] = specificTime.split(':').map(Number);
            return { hour, minute };
          }
          return { hour: 9, minute: 0 };
        default:
          return { hour: 9, minute: 0 };
      }
    };

    const time = getTimeFromSlot(timeSlot);

    switch (frequency) {
      case 'daily':
        return `${time.minute} ${time.hour} * * *`;
      
      case 'weekly_3':
        // Monday, Wednesday, Friday
        return `${time.minute} ${time.hour} * * 1,3,5`;
      
      case 'weekly_2':
        // Tuesday, Friday
        return `${time.minute} ${time.hour} * * 2,5`;
      
      case 'weekly_1':
        // Monday
        return `${time.minute} ${time.hour} * * 1`;
      
      case 'monthly_2':
        // 1st and 15th of each month
        return `${time.minute} ${time.hour} 1,15 * *`;
      
      default:
        return `${time.minute} ${time.hour} * * *`;
    }
  }

  static validateCronExpression(expression: string): boolean {
    try {
      return cron.validate(expression);
    } catch {
      return false;
    }
  }

  static getNextExecutionDates(expression: string, count: number = 5): Date[] {
    try {
      if (!this.validateCronExpression(expression)) {
        return [];
      }

      // Simple implementation - in production you'd use a proper cron parser
      const dates: Date[] = [];
      const now = new Date();
      
      // This is a simplified version - you'd use a library like 'cron-parser' for accuracy
      for (let i = 1; i <= count; i++) {
        const nextDate = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
        dates.push(nextDate);
      }
      
      return dates;
    } catch {
      return [];
    }
  }

  static stop() {
    // Stop all custom jobs
    for (const [id, job] of this.jobs) {
      job.destroy();
      logger.info('Stopped custom job', { id });
    }
    this.jobs.clear();

    logger.info('Scheduler service stopped');
  }
}