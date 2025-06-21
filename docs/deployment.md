# デプロイメントガイド

## 本番環境デプロイメント

### 1. サーバー環境要件

#### 最小システム要件
- **CPU**: 2コア以上
- **メモリ**: 4GB以上
- **ストレージ**: 20GB以上（SSD推奨）
- **OS**: Ubuntu 20.04 LTS以上、CentOS 8以上、またはDebian 11以上

#### 推奨システム要件
- **CPU**: 4コア以上
- **メモリ**: 8GB以上
- **ストレージ**: 50GB以上（SSD）
- **ネットワーク**: 1Gbps以上

### 2. 必要なソフトウェア

```bash
# Node.js 18.x インストール
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PostgreSQL 13+ インストール
sudo apt update
sudo apt install postgresql postgresql-contrib

# Nginx インストール（リバースプロキシ用）
sudo apt install nginx

# PM2 インストール（プロセス管理）
sudo npm install -g pm2

# SSL証明書用 Certbot
sudo apt install certbot python3-certbot-nginx
```

### 3. データベースセットアップ

```bash
# PostgreSQL ユーザー作成
sudo -u postgres createuser --interactive
# ユーザー名: pharma_blog_user
# スーパーユーザー: No
# データベース作成権限: Yes
# 新しいロール作成権限: No

# データベース作成
sudo -u postgres createdb -O pharma_blog_user pharma_blog_production

# パスワード設定
sudo -u postgres psql
ALTER USER pharma_blog_user PASSWORD 'secure_password_here';
\q

# スキーマ適用
psql -U pharma_blog_user -d pharma_blog_production -f server/src/config/database.sql
```

### 4. アプリケーションデプロイ

#### Git デプロイ
```bash
# アプリケーション用ディレクトリ作成
sudo mkdir -p /var/www/pharma-blog
sudo chown $USER:$USER /var/www/pharma-blog

# リポジトリクローン
cd /var/www/pharma-blog
git clone https://github.com/your-org/pharma-blog-auto-poster.git .

# 依存関係インストール
npm ci --production

# ビルド
npm run build
```

#### 環境変数設定
```bash
# 本番環境変数ファイル作成
sudo nano /var/www/pharma-blog/.env
```

```env
# 本番環境設定
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# データベース
DATABASE_URL=postgresql://pharma_blog_user:secure_password_here@localhost:5432/pharma_blog_production
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pharma_blog_production
DB_USER=pharma_blog_user
DB_PASSWORD=secure_password_here

# JWT認証
JWT_SECRET=your-ultra-secure-jwt-secret-for-production
JWT_EXPIRES_IN=7d

# Claude AI
CLAUDE_API_KEY=your-production-claude-api-key
CLAUDE_MODEL=claude-3-sonnet-20240229

# セキュリティ
ENCRYPTION_KEY=your-32-character-production-encryption-key
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# ログ
LOG_LEVEL=warn
LOG_FILE_PATH=/var/log/pharma-blog/app.log

# SSL
FORCE_HTTPS=true
TRUST_PROXY=1
```

### 5. PM2 プロセス管理設定

```bash
# PM2 設定ファイル作成
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'pharma-blog-api',
    script: './server/dist/index.js',
    cwd: '/var/www/pharma-blog',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: '/var/log/pharma-blog/pm2-error.log',
    out_file: '/var/log/pharma-blog/pm2-out.log',
    log_file: '/var/log/pharma-blog/pm2-combined.log',
    time: true,
    watch: false,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
```

```bash
# ログディレクトリ作成
sudo mkdir -p /var/log/pharma-blog
sudo chown $USER:$USER /var/log/pharma-blog

# PM2 起動
pm2 start ecosystem.config.js

# システム起動時の自動開始設定
pm2 startup
pm2 save
```

### 6. Nginx リバースプロキシ設定

```bash
# Nginx 設定ファイル作成
sudo nano /etc/nginx/sites-available/pharma-blog
```

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # セキュリティヘッダー
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;" always;

    # 静的ファイル配信
    location / {
        root /var/www/pharma-blog/client/dist;
        try_files $uri $uri/ /index.html;
        
        # キャッシュ設定
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API プロキシ
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # タイムアウト設定
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # ヘルスチェック
    location /health {
        proxy_pass http://localhost:3001;
        access_log off;
    }

    # ログ設定
    access_log /var/log/nginx/pharma-blog.access.log;
    error_log /var/log/nginx/pharma-blog.error.log;
}
```

```bash
# 設定有効化
sudo ln -s /etc/nginx/sites-available/pharma-blog /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 7. SSL証明書設定

```bash
# Let's Encrypt SSL証明書取得
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 自動更新設定確認
sudo systemctl status certbot.timer
```

### 8. ファイアウォール設定

```bash
# UFW ファイアウォール設定
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# ポート確認
sudo ufw status
```

### 9. モニタリング設定

#### PM2 Monit
```bash
# PM2 監視ダッシュボード
pm2 monit
```

#### システム監視
```bash
# htop インストール
sudo apt install htop

# システムリソース監視
htop
```

#### ログ監視
```bash
# アプリケーションログ監視
tail -f /var/log/pharma-blog/app.log

# Nginx ログ監視
tail -f /var/log/nginx/pharma-blog.access.log
tail -f /var/log/nginx/pharma-blog.error.log

# PM2 ログ監視
pm2 logs
```

### 10. バックアップ設定

#### データベースバックアップ
```bash
# バックアップスクリプト作成
sudo nano /usr/local/bin/backup-pharma-blog-db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/pharma-blog"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="pharma_blog_production"
DB_USER="pharma_blog_user"

# バックアップディレクトリ作成
mkdir -p $BACKUP_DIR

# データベースバックアップ
pg_dump -U $DB_USER -h localhost $DB_NAME > $BACKUP_DIR/db_backup_$DATE.sql

# 7日以上古いバックアップを削除
find $BACKUP_DIR -name "db_backup_*.sql" -mtime +7 -delete

echo "Database backup completed: $BACKUP_DIR/db_backup_$DATE.sql"
```

```bash
# 実行権限付与
sudo chmod +x /usr/local/bin/backup-pharma-blog-db.sh

# 日次バックアップ設定
sudo crontab -e
# 以下を追加
0 2 * * * /usr/local/bin/backup-pharma-blog-db.sh
```

#### アプリケーションファイルバックアップ
```bash
# アプリケーションバックアップスクリプト
sudo nano /usr/local/bin/backup-pharma-blog-files.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/pharma-blog"
DATE=$(date +%Y%m%d_%H%M%S)
APP_DIR="/var/www/pharma-blog"

# バックアップディレクトリ作成
mkdir -p $BACKUP_DIR

# ファイルバックアップ（node_modulesは除外）
tar -czf $BACKUP_DIR/files_backup_$DATE.tar.gz \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='.git' \
    -C $APP_DIR .

# 30日以上古いバックアップを削除
find $BACKUP_DIR -name "files_backup_*.tar.gz" -mtime +30 -delete

echo "Files backup completed: $BACKUP_DIR/files_backup_$DATE.tar.gz"
```

### 11. パフォーマンス最適化

#### Node.js 最適化
```bash
# .bashrc に追加
echo 'export NODE_OPTIONS="--max-old-space-size=1024"' >> ~/.bashrc
source ~/.bashrc
```

#### Nginx 最適化
```bash
# /etc/nginx/nginx.conf に追加
sudo nano /etc/nginx/nginx.conf
```

```nginx
# worker_processes を CPU コア数に設定
worker_processes auto;

# worker_connections を増加
events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    # Gzip 圧縮有効化
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # キープアライブ設定
    keepalive_timeout 65;
    keepalive_requests 100;

    # バッファサイズ最適化
    client_body_buffer_size 128k;
    client_max_body_size 10m;
    client_header_buffer_size 1k;
    large_client_header_buffers 4 4k;
    output_buffers 1 32k;
    postpone_output 1460;
}
```

### 12. セキュリティ強化

#### Fail2Ban 設定
```bash
# Fail2Ban インストール
sudo apt install fail2ban

# 設定ファイル作成
sudo nano /etc/fail2ban/jail.local
```

```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /var/log/nginx/pharma-blog.error.log
maxretry = 10
```

#### 自動更新設定
```bash
# unattended-upgrades インストール
sudo apt install unattended-upgrades

# 設定
sudo dpkg-reconfigure -plow unattended-upgrades
```

### 13. 運用・保守

#### 定期メンテナンススクリプト
```bash
# メンテナンススクリプト作成
sudo nano /usr/local/bin/maintenance-pharma-blog.sh
```

```bash
#!/bin/bash
echo "Starting maintenance tasks..."

# PM2 プロセス確認
echo "Checking PM2 processes..."
pm2 status

# ディスク使用量確認
echo "Checking disk usage..."
df -h

# メモリ使用量確認
echo "Checking memory usage..."
free -h

# ログローテーション
echo "Rotating logs..."
sudo logrotate -f /etc/logrotate.d/pharma-blog

# 古いログファイル削除
find /var/log/pharma-blog -name "*.log.*" -mtime +30 -delete

# データベース統計更新
echo "Updating database statistics..."
sudo -u postgres psql -d pharma_blog_production -c "ANALYZE;"

echo "Maintenance completed!"
```

#### ヘルスチェックスクリプト
```bash
# ヘルスチェックスクリプト
sudo nano /usr/local/bin/health-check-pharma-blog.sh
```

```bash
#!/bin/bash
API_URL="http://localhost:3001/health"
EMAIL="admin@your-domain.com"

# API ヘルスチェック
if ! curl -f -s $API_URL > /dev/null; then
    echo "API health check failed" | mail -s "PharmaBlog API Down" $EMAIL
    pm2 restart pharma-blog-api
fi

# データベース接続確認
if ! sudo -u postgres psql -d pharma_blog_production -c "SELECT 1;" > /dev/null; then
    echo "Database connection failed" | mail -s "PharmaBlog DB Down" $EMAIL
fi

# ディスク容量確認（90%以上で警告）
DISK_USAGE=$(df / | awk 'NR==2{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 90 ]; then
    echo "Disk usage is ${DISK_USAGE}%" | mail -s "PharmaBlog Disk Space Alert" $EMAIL
fi
```

### 14. 本番環境アップデート

#### アプリケーションアップデート
```bash
# アップデートスクリプト
sudo nano /usr/local/bin/update-pharma-blog.sh
```

```bash
#!/bin/bash
APP_DIR="/var/www/pharma-blog"
BACKUP_DIR="/var/backups/pharma-blog"
DATE=$(date +%Y%m%d_%H%M%S)

echo "Starting application update..."

# 現在のバージョンをバックアップ
echo "Creating backup..."
cp -r $APP_DIR $BACKUP_DIR/app_backup_$DATE

# 新しいコードを取得
echo "Pulling latest code..."
cd $APP_DIR
git pull origin main

# 依存関係更新
echo "Updating dependencies..."
npm ci --production

# ビルド
echo "Building application..."
npm run build

# PM2 再起動
echo "Restarting application..."
pm2 restart pharma-blog-api

echo "Application update completed!"
```

これで PharmaBlog Auto Poster の本番環境デプロイメントが完了です。定期的なメンテナンスとモニタリングを実施して、安定した運用を維持してください。