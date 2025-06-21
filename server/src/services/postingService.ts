import { PostModel } from '../models/Post';
import { WordPressSiteModel } from '../models/WordPressSite';
import { WordPressService } from './wordpressService';
import logger from '../utils/logger';

export interface PostingResult {
  success: boolean;
  post?: any;
  error?: string;
}

export class PostingService {
  static async publishPost(siteId: string, postId: string): Promise<PostingResult> {
    try {
      // Get post details
      const post = await PostModel.findById(postId, siteId);
      if (!post) {
        return { success: false, error: 'Post not found' };
      }

      if (!post.content) {
        return { success: false, error: 'Post content is required' };
      }

      // Get site details with credentials
      const site = await WordPressSiteModel.findByIdWithCredentials(siteId, '');
      if (!site) {
        return { success: false, error: 'Site not found' };
      }

      // Prepare WordPress post data
      const wordpressPost = {
        title: { raw: post.title },
        content: { raw: post.content },
        status: 'publish' as const,
        categories: site.category_id ? [site.category_id] : [],
        excerpt: post.meta_description ? { raw: post.meta_description } : undefined,
      };

      // Publish to WordPress
      const publishedPost = await WordPressService.createPost(
        site.url,
        site.credentials.username,
        site.credentials.password,
        wordpressPost
      );

      // Update local post with WordPress post ID and published status
      const updatedPost = await PostModel.update(postId, siteId, {
        wordpress_post_id: publishedPost.id,
        status: 'published',
        published_at: new Date(),
        error_message: null,
      });

      logger.info('Post published successfully', {
        siteId,
        postId,
        wordpressPostId: publishedPost.id,
        title: post.title,
      });

      return {
        success: true,
        post: updatedPost,
      };
    } catch (error: any) {
      logger.error('Failed to publish post', {
        siteId,
        postId,
        error: error.message,
        stack: error.stack,
      });

      // Update post with error status
      await PostModel.update(postId, siteId, {
        status: 'failed',
        error_message: error.message,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async processScheduledPosts(): Promise<void> {
    try {
      const scheduledPosts = await PostModel.getScheduledPosts(50);
      
      logger.info(`Processing ${scheduledPosts.length} scheduled posts`);

      for (const post of scheduledPosts) {
        try {
          // Update status to processing
          await PostModel.update(post.id, post.site_id, { status: 'processing' });

          // Publish the post
          const result = await this.publishPost(post.site_id, post.id);

          if (result.success) {
            logger.info('Scheduled post published successfully', {
              postId: post.id,
              siteId: post.site_id,
              title: post.title,
            });
          } else {
            logger.error('Failed to publish scheduled post', {
              postId: post.id,
              siteId: post.site_id,
              error: result.error,
            });
          }
        } catch (error: any) {
          logger.error('Error processing scheduled post', {
            postId: post.id,
            siteId: post.site_id,
            error: error.message,
          });

          // Mark as failed
          await PostModel.update(post.id, post.site_id, {
            status: 'failed',
            error_message: error.message,
          });
        }
      }
    } catch (error: any) {
      logger.error('Error in processScheduledPosts', {
        error: error.message,
        stack: error.stack,
      });
    }
  }

  static async updatePostFromWordPress(siteId: string, postId: string): Promise<PostingResult> {
    try {
      const post = await PostModel.findById(postId, siteId);
      if (!post) {
        return { success: false, error: 'Post not found' };
      }

      if (!post.wordpress_post_id) {
        return { success: false, error: 'Post not published to WordPress' };
      }

      const site = await WordPressSiteModel.findByIdWithCredentials(siteId, '');
      if (!site) {
        return { success: false, error: 'Site not found' };
      }

      // Get post from WordPress
      const wordpressPost = await WordPressService.getPost(
        site.url,
        site.credentials.username,
        site.credentials.password,
        post.wordpress_post_id
      );

      if (!wordpressPost) {
        // Post was deleted from WordPress
        await PostModel.update(postId, siteId, {
          wordpress_post_id: null,
          status: 'draft',
        });
        
        return { success: true, post: await PostModel.findById(postId, siteId) };
      }

      // Update local post with WordPress data
      const updatedPost = await PostModel.update(postId, siteId, {
        title: wordpressPost.title.rendered || wordpressPost.title.raw,
        content: wordpressPost.content.rendered || wordpressPost.content.raw,
        status: wordpressPost.status === 'publish' ? 'published' : 'draft',
      });

      return {
        success: true,
        post: updatedPost,
      };
    } catch (error: any) {
      logger.error('Failed to update post from WordPress', {
        siteId,
        postId,
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async syncPostWithWordPress(siteId: string, postId: string, wordpressData: any): Promise<PostingResult> {
    try {
      const post = await PostModel.findById(postId, siteId);
      if (!post) {
        return { success: false, error: 'Post not found' };
      }

      if (!post.wordpress_post_id) {
        return { success: false, error: 'Post not published to WordPress' };
      }

      const site = await WordPressSiteModel.findByIdWithCredentials(siteId, '');
      if (!site) {
        return { success: false, error: 'Site not found' };
      }

      // Update WordPress post
      const updatedWordPressPost = await WordPressService.updatePost(
        site.url,
        site.credentials.username,
        site.credentials.password,
        post.wordpress_post_id,
        wordpressData
      );

      // Update local post
      const updatedPost = await PostModel.update(postId, siteId, {
        title: updatedWordPressPost.title.rendered || updatedWordPressPost.title.raw,
        content: updatedWordPressPost.content.rendered || updatedWordPressPost.content.raw,
        status: updatedWordPressPost.status === 'publish' ? 'published' : 'draft',
      });

      logger.info('Post synced with WordPress successfully', {
        siteId,
        postId,
        wordpressPostId: post.wordpress_post_id,
      });

      return {
        success: true,
        post: updatedPost,
      };
    } catch (error: any) {
      logger.error('Failed to sync post with WordPress', {
        siteId,
        postId,
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }
}