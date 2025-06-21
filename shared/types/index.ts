export interface User {
  id: string;
  email: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export interface WordPressSite {
  id: string;
  user_id: string;
  name: string;
  url: string;
  region: string;
  pharmacy_name: string;
  pharmacy_features?: string;
  category_id?: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  connection_status: 'connected' | 'error' | 'unknown';
  last_connection_check?: Date;
}

export interface ArticleTemplate {
  id: string;
  site_id: string;
  name: string;
  tone: 'professional' | 'friendly' | 'neutral';
  target_length: number;
  keywords: string[];
  exclude_keywords: string[];
  structure: string;
  seo_focus: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Topic {
  id: string;
  site_id: string;
  category: string;
  title: string;
  description?: string;
  priority: 'high' | 'medium' | 'low';
  seasonal: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface PostingSchedule {
  id: string;
  site_id: string;
  frequency: 'daily' | 'weekly_3' | 'weekly_2' | 'weekly_1' | 'monthly_2' | 'custom';
  time_slot: 'morning' | 'afternoon' | 'evening' | 'night' | 'specific';
  specific_time?: string;
  timezone: string;
  skip_holidays: boolean;
  max_monthly_posts: number;
  cron_expression?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Post {
  id: string;
  site_id: string;
  wordpress_post_id?: number;
  title: string;
  content?: string;
  topic_id?: string;
  template_id?: string;
  status: 'draft' | 'scheduled' | 'published' | 'failed' | 'processing';
  scheduled_at?: Date;
  published_at?: Date;
  error_message?: string;
  claude_request_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ClaudeRequest {
  id: string;
  site_id: string;
  post_id?: string;
  request_data: ClaudeRequestData;
  response_data?: ClaudeResponseData;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  created_at: Date;
  processed_at?: Date;
}

export interface ClaudeRequestData {
  site_info: {
    region: string;
    pharmacy_name: string;
    pharmacy_features?: string;
  };
  article_config: {
    topic: string;
    tone: string;
    target_length: number;
    keywords: string[];
    exclude_keywords: string[];
  };
  template: {
    structure: string;
    seo_focus: boolean;
  };
}

export interface ClaudeResponseData {
  title: string;
  content: string;
  meta_description?: string;
  tags?: string[];
  estimated_reading_time?: number;
}

export interface PostingStats {
  site_id: string;
  period: 'daily' | 'weekly' | 'monthly';
  date: Date;
  posts_count: number;
  success_count: number;
  failed_count: number;
  average_engagement?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  expires_in: number;
}

export interface WordPressSiteCreateRequest {
  name: string;
  url: string;
  username: string;
  password: string;
  region: string;
  pharmacy_name: string;
  pharmacy_features?: string;
  category_id?: number;
}

export interface WordPressSiteUpdateRequest {
  name?: string;
  url?: string;
  username?: string;
  password?: string;
  region?: string;
  pharmacy_name?: string;
  pharmacy_features?: string;
  category_id?: number;
  is_active?: boolean;
}

export interface WordPressConnectionTest {
  success: boolean;
  version?: string;
  user_can_publish?: boolean;
  categories?: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  error?: string;
}