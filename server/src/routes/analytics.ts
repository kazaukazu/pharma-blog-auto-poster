import express from 'express';
import { auth } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { asyncHandler } from '../middleware/asyncHandler';
import { authRateLimit } from '../middleware/rateLimiter';
import { db } from '../config/database';
import logger from '../utils/logger';
import { z } from 'zod';

const router = express.Router();

// Validation schemas
const getAnalyticsSchema = z.object({
  params: z.object({
    siteId: z.string().uuid(),
  }),
  query: z.object({
    period: z.enum(['7d', '30d', '90d', '1y']).optional().default('30d'),
    timezone: z.string().optional().default('Asia/Tokyo'),
  }),
});

const getStatsSchema = z.object({
  params: z.object({
    siteId: z.string().uuid(),
  }),
});

// Get site analytics overview
router.get(
  '/sites/:siteId/analytics',
  authRateLimit,
  auth,
  validateRequest(getAnalyticsSchema),
  asyncHandler(async (req, res) => {
    const { siteId } = req.params;
    const { period, timezone } = req.query;
    const userId = req.user.id;

    // Verify site ownership
    const site = await db.query(
      'SELECT id FROM wordpress_sites WHERE id = $1 AND user_id = $2',
      [siteId, userId]
    );

    if (site.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'サイトが見つかりません',
      });
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
    }

    // Get posts analytics
    const postsAnalytics = await db.query(`
      SELECT 
        DATE_TRUNC('day', p.created_at AT TIME ZONE $3) as date,
        COUNT(*) as posts_count,
        COUNT(CASE WHEN p.status = 'published' THEN 1 END) as published_count,
        COUNT(CASE WHEN p.status = 'draft' THEN 1 END) as draft_count,
        COUNT(CASE WHEN p.status = 'failed' THEN 1 END) as failed_count,
        AVG(LENGTH(p.content)) as avg_content_length
      FROM posts p
      WHERE p.site_id = $1 
        AND p.created_at >= $2 
        AND p.created_at <= $4
      GROUP BY DATE_TRUNC('day', p.created_at AT TIME ZONE $3)
      ORDER BY date ASC
    `, [siteId, startDate, timezone, endDate]);

    // Get Claude requests analytics
    const claudeAnalytics = await db.query(`
      SELECT 
        DATE_TRUNC('day', cr.created_at AT TIME ZONE $3) as date,
        COUNT(*) as requests_count,
        COUNT(CASE WHEN cr.status = 'completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN cr.status = 'failed' THEN 1 END) as failed_count,
        AVG(EXTRACT(EPOCH FROM (cr.processed_at - cr.created_at))) as avg_processing_time
      FROM claude_requests cr
      WHERE cr.site_id = $1 
        AND cr.created_at >= $2 
        AND cr.created_at <= $4
      GROUP BY DATE_TRUNC('day', cr.created_at AT TIME ZONE $3)
      ORDER BY date ASC
    `, [siteId, startDate, timezone, endDate]);

    // Get top topics/keywords
    const topTopics = await db.query(`
      SELECT 
        (cr.request_data->'article_config'->>'topic') as topic,
        COUNT(*) as usage_count
      FROM claude_requests cr
      WHERE cr.site_id = $1 
        AND cr.created_at >= $2 
        AND cr.created_at <= $3
        AND cr.status = 'completed'
      GROUP BY (cr.request_data->'article_config'->>'topic')
      ORDER BY usage_count DESC
      LIMIT 10
    `, [siteId, startDate, endDate]);

    // Get schedule performance
    const schedulePerformance = await db.query(`
      SELECT 
        s.frequency,
        s.time_slot,
        COUNT(p.id) as posts_created,
        COUNT(CASE WHEN p.status = 'published' THEN 1 END) as published_count,
        COUNT(CASE WHEN p.status = 'failed' THEN 1 END) as failed_count
      FROM schedules s
      LEFT JOIN posts p ON p.site_id = s.site_id 
        AND p.created_at >= $2 
        AND p.created_at <= $3
      WHERE s.site_id = $1
      GROUP BY s.id, s.frequency, s.time_slot
    `, [siteId, startDate, endDate]);

    res.json({
      success: true,
      data: {
        period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        posts: postsAnalytics.rows,
        claude: claudeAnalytics.rows,
        topTopics: topTopics.rows,
        schedulePerformance: schedulePerformance.rows,
      },
    });
  })
);

// Get site stats summary
router.get(
  '/sites/:siteId/stats',
  authRateLimit,
  auth,
  validateRequest(getStatsSchema),
  asyncHandler(async (req, res) => {
    const { siteId } = req.params;
    const userId = req.user.id;

    // Verify site ownership
    const site = await db.query(
      'SELECT id FROM wordpress_sites WHERE id = $1 AND user_id = $2',
      [siteId, userId]
    );

    if (site.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'サイトが見つかりません',
      });
    }

    // Get overall stats
    const stats = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM posts WHERE site_id = $1) as total_posts,
        (SELECT COUNT(*) FROM posts WHERE site_id = $1 AND status = 'published') as published_posts,
        (SELECT COUNT(*) FROM posts WHERE site_id = $1 AND status = 'draft') as draft_posts,
        (SELECT COUNT(*) FROM posts WHERE site_id = $1 AND status = 'failed') as failed_posts,
        (SELECT COUNT(*) FROM claude_requests WHERE site_id = $1) as total_claude_requests,
        (SELECT COUNT(*) FROM claude_requests WHERE site_id = $1 AND status = 'completed') as completed_claude_requests,
        (SELECT COUNT(*) FROM claude_requests WHERE site_id = $1 AND status = 'failed') as failed_claude_requests,
        (SELECT COUNT(*) FROM schedules WHERE site_id = $1) as total_schedules,
        (SELECT COUNT(*) FROM schedules WHERE site_id = $1 AND is_active = true) as active_schedules
    `, [siteId]);

    // Get recent activity (last 7 days)
    const recentActivity = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM posts WHERE site_id = $1 AND created_at >= NOW() - INTERVAL '7 days') as posts_7d,
        (SELECT COUNT(*) FROM claude_requests WHERE site_id = $1 AND created_at >= NOW() - INTERVAL '7 days') as claude_requests_7d
    `, [siteId]);

    // Get monthly stats for current month
    const monthlyStats = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM posts WHERE site_id = $1 AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)) as posts_this_month,
        (SELECT COUNT(*) FROM claude_requests WHERE site_id = $1 AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)) as claude_requests_this_month
    `, [siteId]);

    // Get average processing time
    const avgProcessingTime = await db.query(`
      SELECT 
        AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_processing_time
      FROM claude_requests 
      WHERE site_id = $1 
        AND status = 'completed' 
        AND processed_at IS NOT NULL
        AND created_at >= NOW() - INTERVAL '30 days'
    `, [siteId]);

    const result = {
      ...stats.rows[0],
      ...recentActivity.rows[0],
      ...monthlyStats.rows[0],
      avg_processing_time: avgProcessingTime.rows[0]?.avg_processing_time || 0,
    };

    // Convert string numbers to integers
    Object.keys(result).forEach(key => {
      if (key !== 'avg_processing_time' && result[key] !== null) {
        result[key] = parseInt(result[key], 10);
      }
    });

    res.json({
      success: true,
      data: result,
    });
  })
);

// Get global analytics for dashboard
router.get(
  '/analytics/dashboard',
  authRateLimit,
  auth,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;

    // Get user's site count
    const siteCount = await db.query(
      'SELECT COUNT(*) as count FROM wordpress_sites WHERE user_id = $1',
      [userId]
    );

    // Get total posts across all user's sites
    const totalPosts = await db.query(`
      SELECT COUNT(*) as count 
      FROM posts p
      INNER JOIN wordpress_sites ws ON p.site_id = ws.id
      WHERE ws.user_id = $1
    `, [userId]);

    // Get published posts across all user's sites
    const publishedPosts = await db.query(`
      SELECT COUNT(*) as count 
      FROM posts p
      INNER JOIN wordpress_sites ws ON p.site_id = ws.id
      WHERE ws.user_id = $1 AND p.status = 'published'
    `, [userId]);

    // Get Claude requests across all user's sites
    const claudeRequests = await db.query(`
      SELECT COUNT(*) as count 
      FROM claude_requests cr
      INNER JOIN wordpress_sites ws ON cr.site_id = ws.id
      WHERE ws.user_id = $1
    `, [userId]);

    // Get recent activity (last 7 days)
    const recentActivity = await db.query(`
      SELECT 
        (SELECT COUNT(*) 
         FROM posts p
         INNER JOIN wordpress_sites ws ON p.site_id = ws.id
         WHERE ws.user_id = $1 AND p.created_at >= NOW() - INTERVAL '7 days') as posts_7d,
        (SELECT COUNT(*) 
         FROM claude_requests cr
         INNER JOIN wordpress_sites ws ON cr.site_id = ws.id
         WHERE ws.user_id = $1 AND cr.created_at >= NOW() - INTERVAL '7 days') as claude_requests_7d
    `, [userId]);

    // Get monthly activity chart data (last 12 months)
    const monthlyActivity = await db.query(`
      SELECT 
        DATE_TRUNC('month', p.created_at) as month,
        COUNT(*) as posts_count
      FROM posts p
      INNER JOIN wordpress_sites ws ON p.site_id = ws.id
      WHERE ws.user_id = $1 
        AND p.created_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', p.created_at)
      ORDER BY month ASC
    `, [userId]);

    // Get top performing sites
    const topSites = await db.query(`
      SELECT 
        ws.name,
        ws.url,
        COUNT(p.id) as posts_count,
        COUNT(CASE WHEN p.status = 'published' THEN 1 END) as published_count
      FROM wordpress_sites ws
      LEFT JOIN posts p ON p.site_id = ws.id AND p.created_at >= NOW() - INTERVAL '30 days'
      WHERE ws.user_id = $1
      GROUP BY ws.id, ws.name, ws.url
      ORDER BY posts_count DESC
      LIMIT 5
    `, [userId]);

    res.json({
      success: true,
      data: {
        overview: {
          site_count: parseInt(siteCount.rows[0].count, 10),
          total_posts: parseInt(totalPosts.rows[0].count, 10),
          published_posts: parseInt(publishedPosts.rows[0].count, 10),
          claude_requests: parseInt(claudeRequests.rows[0].count, 10),
          posts_7d: parseInt(recentActivity.rows[0].posts_7d, 10),
          claude_requests_7d: parseInt(recentActivity.rows[0].claude_requests_7d, 10),
        },
        monthlyActivity: monthlyActivity.rows.map(row => ({
          month: row.month,
          posts_count: parseInt(row.posts_count, 10),
        })),
        topSites: topSites.rows.map(row => ({
          name: row.name,
          url: row.url,
          posts_count: parseInt(row.posts_count, 10),
          published_count: parseInt(row.published_count, 10),
        })),
      },
    });
  })
);

export default router;