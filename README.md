# PharmaBlog Auto Poster

薬局向けWordPress自動投稿システム - Claude AIを活用した高品質な記事生成と自動投稿機能

## 概要

PharmaBlog Auto Posterは、調剤薬局のWebサイト運営を支援するための包括的なブログ自動投稿システムです。Claude AIを活用して薬学的に正確で地域密着型のコンテンツを自動生成し、WordPress サイトに自動投稿することで、薬局の信頼性向上とWeb集客を支援します。

## 主な機能

### ✨ 核心機能
- **Claude AI記事生成**: 薬学的知識に基づく高品質な記事を自動生成
- **WordPress自動投稿**: 生成された記事を指定したWordPressサイトに自動投稿
- **スケジュール投稿**: 柔軟な投稿スケジュールで定期的なコンテンツ更新
- **マルチサイト対応**: 複数の薬局サイトを一元管理

### 📊 管理・分析機能
- **包括的ダッシュボード**: 投稿状況、分析データの可視化
- **詳細分析・レポート**: 投稿パフォーマンス、Claude利用統計
- **投稿履歴管理**: 全投稿の詳細履歴と状態管理
- **リアルタイム監視**: システム状態とエラーの即時把握

### 🔒 セキュリティ・品質
- **高度なセキュリティ**: 多層防御、不正アクセス検知、暗号化
- **品質保証**: 投稿前レビュー、コンテンツ品質チェック
- **エラー処理**: 包括的なエラーハンドリングと復旧機能
- **監査ログ**: 全操作の詳細ログと追跡

## 技術構成

### フロントエンド
- **React 18** + **TypeScript** - モダンで型安全なUI
- **Vite** - 高速な開発環境
- **Tailwind CSS** - 効率的なスタイリング
- **React Query** - サーバー状態管理
- **React Router** - ルーティング
- **Recharts** - データ可視化
- **React Hook Form** - フォーム管理

### バックエンド
- **Node.js** + **Express** - 高性能APIサーバー
- **TypeScript** - 型安全なバックエンド開発
- **PostgreSQL** - 堅牢なデータベース
- **JWT** - セキュアな認証
- **Winston** - 包括的ログ管理
- **Node-cron** - スケジュール実行
- **Helmet** + **カスタムセキュリティミドルウェア** - 多層セキュリティ

### 外部連携
- **Claude AI API** - 高品質記事生成
- **WordPress REST API** - 自動投稿機能

## インストール・セットアップ

### 前提条件
- Node.js 18+ 
- PostgreSQL 13+
- Claude API キー
- WordPress サイト（REST API有効）

### 1. リポジトリクローン
```bash
git clone https://github.com/your-org/pharma-blog-auto-poster.git
cd pharma-blog-auto-poster
```

### 2. 依存関係インストール
```bash
# ルートディレクトリで全体インストール
npm install

# または個別インストール
cd server && npm install
cd ../client && npm install
```

### 3. データベースセットアップ
```bash
# PostgreSQLデータベース作成
createdb pharma_blog_db

# スキーマ適用
psql -d pharma_blog_db -f server/src/config/database.sql
```

### 4. 環境変数設定

#### サーバー側 (.env)
```env
# サーバー設定
NODE_ENV=development
PORT=3001
HOST=localhost

# データベース
DATABASE_URL=postgresql://username:password@localhost:5432/pharma_blog_db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pharma_blog_db
DB_USER=username
DB_PASSWORD=password

# JWT認証
JWT_SECRET=your-super-secure-jwt-secret-key
JWT_EXPIRES_IN=7d

# Claude AI
CLAUDE_API_KEY=your-claude-api-key
CLAUDE_MODEL=claude-3-sonnet-20240229

# セキュリティ
ENCRYPTION_KEY=your-32-character-encryption-key
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ログ
LOG_LEVEL=info
LOG_FILE_PATH=./logs/app.log
```

#### クライアント側 (.env)
```env
VITE_API_BASE_URL=http://localhost:3001/api
VITE_APP_NAME=PharmaBlog Auto Poster
```

### 5. アプリケーション起動

#### 開発環境
```bash
# 全体起動（推奨）
npm run dev

# または個別起動
npm run dev:server    # バックエンドのみ
npm run dev:client    # フロントエンドのみ
```

#### 本番環境
```bash
# ビルド
npm run build

# 起動
npm start
```

## 使用方法

### 1. アカウント作成・ログイン
1. `http://localhost:5173` にアクセス
2. 新規アカウント登録またはログイン

### 2. WordPressサイト登録
1. サイド メニューから「サイト管理」を選択
2. 「新しいサイトを追加」をクリック
3. WordPress サイト情報を入力：
   - サイト名・URL
   - WordPress ユーザー名・パスワード
   - 地域情報・薬局名・特徴

### 3. 記事生成・投稿
1. サイト詳細画面から「Claude記事生成」を選択
2. 記事設定を入力：
   - トピック（例：「風邪薬の選び方と注意点」）
   - 記事のトーン（専門的/親しみやすい/中立的）
   - 目標文字数（500-5000文字）
   - 必須キーワード
   - 除外キーワード
3. 「記事を生成」をクリック
4. 生成完了後、記事を確認・編集
5. WordPress に投稿

### 4. 自動投稿スケジュール設定
1. 「スケジュール」メニューを選択
2. 投稿頻度を設定：
   - 毎日
   - 週3回（月・水・金）
   - 週2回（火・金）
   - 週1回（月曜）
   - 月2回（1日・15日）
   - カスタム（Cron式）
3. 投稿時間帯を指定
4. 月間最大投稿数を設定
5. スケジュールを有効化

### 5. 分析・レポート確認
1. ダッシュボードで全体概要を確認
2. 「分析・レポート」で詳細データを確認：
   - 投稿パフォーマンス推移
   - Claude AI 利用統計
   - 人気トピック分析
   - スケジュール実行状況

## API ドキュメント

### 認証エンドポイント
```
POST /api/auth/register    # ユーザー登録
POST /api/auth/login       # ログイン
GET  /api/auth/profile     # プロフィール取得
PUT  /api/auth/profile     # プロフィール更新
```

### サイト管理
```
GET    /api/sites           # サイト一覧
POST   /api/sites           # サイト作成
GET    /api/sites/:id       # サイト詳細
PUT    /api/sites/:id       # サイト更新
DELETE /api/sites/:id       # サイト削除
POST   /api/sites/:id/test-connection  # 接続テスト
```

### 記事管理
```
GET    /api/:siteId/posts           # 記事一覧
POST   /api/:siteId/posts           # 記事作成
GET    /api/:siteId/posts/:id       # 記事詳細
PUT    /api/:siteId/posts/:id       # 記事更新
DELETE /api/:siteId/posts/:id       # 記事削除
POST   /api/:siteId/posts/:id/publish    # 記事投稿
POST   /api/:siteId/posts/:id/schedule   # 記事スケジュール
```

### Claude AI 記事生成
```
POST   /api/claude/:siteId/generate          # 記事生成リクエスト
GET    /api/claude/:siteId/requests          # 生成履歴一覧
GET    /api/claude/:siteId/requests/:id      # 生成詳細
POST   /api/claude/:siteId/requests/:id/retry  # 再生成
DELETE /api/claude/:siteId/requests/:id      # 履歴削除
```

### スケジュール管理
```
GET    /api/:siteId/schedules       # スケジュール一覧
POST   /api/:siteId/schedules       # スケジュール作成
PUT    /api/:siteId/schedules/:id   # スケジュール更新
DELETE /api/:siteId/schedules/:id   # スケジュール削除
POST   /api/:siteId/schedules/:id/toggle  # 有効/無効切り替え
```

### 分析・レポート
```
GET /api/sites/:siteId/analytics    # サイト分析データ
GET /api/sites/:siteId/stats        # サイト統計
GET /api/analytics/dashboard        # ダッシュボード分析
```

## テスト

### 全テスト実行
```bash
npm test
```

### 個別テスト実行
```bash
# バックエンドテスト
cd server && npm test

# フロントエンドテスト  
cd client && npm test
```

### カバレッジ確認
```bash
npm run test:coverage
```

### テスト監視モード
```bash
npm run test:watch
```

## 開発・デバッグ

### ログ確認
```bash
# リアルタイムログ監視
tail -f server/logs/app.log

# エラーログのみ
tail -f server/logs/error.log
```

### データベース直接操作
```bash
# データベース接続
psql -d pharma_blog_db

# テーブル確認
\dt

# サンプルクエリ
SELECT * FROM users;
SELECT * FROM wordpress_sites;
SELECT * FROM posts WHERE status = 'published';
```

### API デバッグ
```bash
# ヘルスチェック
curl http://localhost:3001/health

# 認証テスト
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## セキュリティ考慮事項

### 実装されているセキュリティ機能
- **入力サニタイゼーション**: XSS攻撃防止
- **SQLインジェクション対策**: パラメータ化クエリ使用
- **レート制限**: DDoS攻撃防止
- **セキュリティヘッダー**: 各種攻撃防止
- **JWT認証**: セキュアなセッション管理
- **データ暗号化**: WordPress認証情報の暗号化保存
- **監査ログ**: 全操作の追跡可能性

### セキュリティ設定推奨事項
1. **強力なパスワード設定**
2. **HTTPS証明書の設定**（本番環境）
3. **ファイアウォール設定**
4. **定期的なバックアップ**
5. **セキュリティアップデート適用**

## トラブルシューティング

### よくある問題

#### 1. データベース接続エラー
```bash
# PostgreSQL起動確認
sudo systemctl status postgresql

# 接続テスト
psql -d pharma_blog_db -c "SELECT 1;"
```

#### 2. Claude API エラー
- API キーの有効性確認
- レート制限の確認
- ネットワーク接続確認

#### 3. WordPress接続エラー
- WordPress REST API の有効性確認
- 認証情報の正確性確認
- WordPress サイトのアクセス可能性確認

#### 4. フロントエンド接続エラー
- バックエンドサーバーの起動確認
- CORS設定確認
- 環境変数設定確認

### ログファイル位置
- アプリケーションログ: `server/logs/app.log`
- エラーログ: `server/logs/error.log`
- セキュリティログ: データベース内`security_events`テーブル

## 貢献

### 開発への参加
1. フォークリポジトリ作成
2. フィーチャーブランチ作成 (`git checkout -b feature/amazing-feature`)
3. 変更コミット (`git commit -m 'Add amazing feature'`)
4. ブランチプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエスト作成

### コード規約
- TypeScript 厳密モード使用
- ESLint ルール準拠
- 関数・変数に明確な命名
- 適切なコメント記述
- テストカバレッジ80%以上維持

## ライセンス

このプロジェクトは MIT License の下で公開されています。詳細は [LICENSE](LICENSE) ファイルを参照してください。

## サポート

### ドキュメント
- [API リファレンス](docs/api.md)
- [デプロイメントガイド](docs/deployment.md)
- [設定ガイド](docs/configuration.md)

### お問い合わせ
- Issues: GitHub Issues でバグ報告・機能要求
- Email: support@pharma-blog-autoposter.com
- Discord: [開発者コミュニティ](https://discord.gg/pharma-blog)

---

**PharmaBlog Auto Poster** - 薬局のデジタル変革を支援する包括的なコンテンツ管理ソリューション