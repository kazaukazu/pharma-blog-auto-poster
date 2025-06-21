-- PharmaBlog Auto Poster Database Schema

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- WordPress sites table
CREATE TABLE wordpress_sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    encrypted_credentials TEXT NOT NULL,
    region VARCHAR(100) NOT NULL,
    pharmacy_name VARCHAR(255) NOT NULL,
    pharmacy_features TEXT,
    category_id INTEGER,
    is_active BOOLEAN DEFAULT true,
    connection_status VARCHAR(20) DEFAULT 'unknown',
    last_connection_check TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Article templates table
CREATE TABLE article_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES wordpress_sites(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    tone VARCHAR(20) NOT NULL CHECK (tone IN ('professional', 'friendly', 'neutral')),
    target_length INTEGER NOT NULL DEFAULT 2000,
    keywords TEXT[] DEFAULT '{}',
    exclude_keywords TEXT[] DEFAULT '{}',
    structure TEXT NOT NULL,
    seo_focus BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Topics table
CREATE TABLE topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES wordpress_sites(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(10) NOT NULL CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
    seasonal BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Posting schedules table
CREATE TABLE posting_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES wordpress_sites(id) ON DELETE CASCADE,
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly_3', 'weekly_2', 'weekly_1', 'monthly_2', 'custom')),
    time_slot VARCHAR(20) NOT NULL CHECK (time_slot IN ('morning', 'afternoon', 'evening', 'night', 'specific')),
    specific_time TIME,
    timezone VARCHAR(50) DEFAULT 'Asia/Tokyo',
    skip_holidays BOOLEAN DEFAULT true,
    max_monthly_posts INTEGER DEFAULT 100,
    cron_expression VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Posts table
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES wordpress_sites(id) ON DELETE CASCADE,
    wordpress_post_id INTEGER,
    title VARCHAR(500) NOT NULL,
    content TEXT,
    topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
    template_id UUID REFERENCES article_templates(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('draft', 'scheduled', 'published', 'failed', 'processing')) DEFAULT 'draft',
    scheduled_at TIMESTAMP WITH TIME ZONE,
    published_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    claude_request_id UUID,
    meta_description TEXT,
    tags TEXT[] DEFAULT '{}',
    estimated_reading_time INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Claude requests table
CREATE TABLE claude_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES wordpress_sites(id) ON DELETE CASCADE,
    post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
    request_data JSONB NOT NULL,
    response_data JSONB,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Posting statistics table
CREATE TABLE posting_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES wordpress_sites(id) ON DELETE CASCADE,
    period VARCHAR(10) NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly')),
    date DATE NOT NULL,
    posts_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    average_engagement DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(site_id, period, date)
);

-- Create indexes for better performance
CREATE INDEX idx_wordpress_sites_user_id ON wordpress_sites(user_id);
CREATE INDEX idx_wordpress_sites_is_active ON wordpress_sites(is_active);
CREATE INDEX idx_article_templates_site_id ON article_templates(site_id);
CREATE INDEX idx_topics_site_id ON topics(site_id);
CREATE INDEX idx_topics_is_active ON topics(is_active);
CREATE INDEX idx_posting_schedules_site_id ON posting_schedules(site_id);
CREATE INDEX idx_posting_schedules_is_active ON posting_schedules(is_active);
CREATE INDEX idx_posts_site_id ON posts(site_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_scheduled_at ON posts(scheduled_at);
CREATE INDEX idx_posts_created_at ON posts(created_at);
CREATE INDEX idx_claude_requests_site_id ON claude_requests(site_id);
CREATE INDEX idx_claude_requests_status ON claude_requests(status);
CREATE INDEX idx_claude_requests_created_at ON claude_requests(created_at);
CREATE INDEX idx_posting_stats_site_id ON posting_stats(site_id);
CREATE INDEX idx_posting_stats_date ON posting_stats(date);

-- API logs table for security monitoring
CREATE TABLE api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_address INET NOT NULL,
  method VARCHAR(10) NOT NULL,
  url TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Security events table
CREATE TABLE security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'medium',
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_address INET NOT NULL,
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Additional security indexes
CREATE INDEX idx_api_logs_user_id_created_at ON api_logs(user_id, created_at);
CREATE INDEX idx_api_logs_ip_created_at ON api_logs(ip_address, created_at);
CREATE INDEX idx_security_events_type_created_at ON security_events(event_type, created_at);
CREATE INDEX idx_security_events_user_id ON security_events(user_id);

-- Create update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wordpress_sites_updated_at BEFORE UPDATE ON wordpress_sites FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_article_templates_updated_at BEFORE UPDATE ON article_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_topics_updated_at BEFORE UPDATE ON topics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_posting_schedules_updated_at BEFORE UPDATE ON posting_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_posting_stats_updated_at BEFORE UPDATE ON posting_stats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add foreign key for claude_request_id in posts table
ALTER TABLE posts ADD CONSTRAINT fk_posts_claude_request_id FOREIGN KEY (claude_request_id) REFERENCES claude_requests(id) ON DELETE SET NULL;

-- Insert default topics
INSERT INTO topics (id, site_id, category, title, description, priority, seasonal, is_active) VALUES
-- These will be added when a site is created, using a default site_id placeholder
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', '風邪・インフルエンザ', '風邪薬の選び方と使い分け', '一般的な風邪薬の種類と効果的な使用方法について', 'high', false, true),
('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', '風邪・インフルエンザ', 'インフルエンザ予防と対策', 'インフルエンザの予防接種や日常的な対策方法', 'high', true, true),
('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', '風邪・インフルエンザ', '解熱剤の正しい使い方', '解熱剤の種類と適切な服用方法について', 'medium', false, true),
('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', '胃腸関連', '胃腸薬の種類と効果', '胃腸薬の分類と症状に応じた選び方', 'high', false, true),
('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', '胃腸関連', '下痢・便秘の対処法', '消化器系の不調に対する薬物療法と生活指導', 'medium', false, true),
('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'アレルギー関連', '花粉症薬の選び方', '抗アレルギー薬の種類と特徴について', 'high', true, true),
('00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000', 'アレルギー関連', 'アトピー性皮膚炎のケア', '皮膚炎の薬物治療とスキンケア方法', 'medium', false, true),
('00000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000000', '生活習慣病', '高血圧の薬物療法', '降圧薬の種類と服薬管理について', 'high', false, true),
('00000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000000', '生活習慣病', '糖尿病患者の薬管理', '血糖降下薬の適切な管理方法', 'high', false, true),
('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000000', '季節・時期特有', '春の花粉症対策', '春の花粉症に効果的な薬と対策', 'high', true, true),
('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000000', '季節・時期特有', '夏の熱中症予防', '熱中症の予防と応急処置について', 'high', true, true),
('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000000', '季節・時期特有', '冬の乾燥肌ケア', '冬場の皮膚トラブルと保湿ケア', 'medium', true, true);