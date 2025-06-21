import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { apiService } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { 
  Globe, 
  FileText, 
  Calendar, 
  Brain, 
  Settings,
  ExternalLink,
  Activity,
  Clock,
  TrendingUp
} from 'lucide-react';

const SiteDetailPage = () => {
  const { id } = useParams<{ id: string }>();

  const { data: site, isLoading } = useQuery({
    queryKey: ['site', id],
    queryFn: () => apiService.getSite(id!),
    enabled: !!id,
  });

  const { data: postStats } = useQuery({
    queryKey: ['post-stats', id],
    queryFn: () => apiService.getPostStats(id!),
    enabled: !!id,
  });

  const { data: claudeStats } = useQuery({
    queryKey: ['claude-stats', id],
    queryFn: () => apiService.getClaudeStats(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!site?.data) {
    return (
      <div className="text-center py-12">
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          サイトが見つかりません
        </h3>
      </div>
    );
  }

  const siteData = site.data;
  const stats = postStats?.data || {};
  const claudeStatsData = claudeStats?.data || {};

  const overviewStats = [
    {
      name: '総記事数',
      value: stats.total || 0,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      name: '公開済み',
      value: stats.published || 0,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      name: '予定投稿',
      value: stats.scheduled || 0,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      name: 'Claude生成',
      value: claudeStatsData.completed || 0,
      icon: Brain,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Site Header */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Globe className="h-8 w-8 text-gray-400" />
              </div>
              <div className="ml-4">
                <h1 className="text-2xl font-bold text-gray-900">
                  {siteData.name}
                </h1>
                <p className="text-sm text-gray-500">
                  {siteData.pharmacy_name} - {siteData.region}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge
                variant={
                  siteData.connection_status === 'connected'
                    ? 'success'
                    : siteData.connection_status === 'error'
                    ? 'error'
                    : 'secondary'
                }
              >
                {siteData.connection_status === 'connected'
                  ? '接続済み'
                  : siteData.connection_status === 'error'
                  ? 'エラー'
                  : '未確認'}
              </Badge>
              {!siteData.is_active && (
                <Badge variant="secondary">無効</Badge>
              )}
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-center text-sm text-gray-500">
              <span className="font-medium">URL:</span>
              <a
                href={siteData.url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-primary-600 hover:text-primary-500 flex items-center"
              >
                {new URL(siteData.url).hostname}
                <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </div>
            {siteData.pharmacy_features && (
              <div className="flex items-start text-sm text-gray-500">
                <span className="font-medium">特徴:</span>
                <span className="ml-2">{siteData.pharmacy_features}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {overviewStats.map((stat) => (
          <div key={stat.name} className="card">
            <div className="card-body p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`w-8 h-8 rounded-md ${stat.bgColor} flex items-center justify-center`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.name}
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {stat.value}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          to={`/sites/${id}/posts`}
          className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary-500 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
        >
          <div>
            <span className="rounded-lg inline-flex p-3 bg-blue-50 text-blue-700 ring-4 ring-white">
              <FileText className="h-6 w-6" />
            </span>
          </div>
          <div className="mt-8">
            <h3 className="text-lg font-medium">
              <span className="absolute inset-0" aria-hidden="true" />
              記事管理
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              記事の作成・編集・投稿管理
            </p>
          </div>
          <span className="pointer-events-none absolute top-6 right-6 text-gray-300 group-hover:text-gray-400">
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 4h1a1 1 0 00-1-1v1zm-1 12a1 1 0 102 0h-2zM8 3a1 1 0 000 2V3zM3.293 19.293a1 1 0 101.414 1.414l-1.414-1.414zM19 4v12h2V4h-2zm1-1H8v2h12V3zm-.707.293l-16 16 1.414 1.414 16-16-1.414-1.414z" />
            </svg>
          </span>
        </Link>

        <Link
          to={`/sites/${id}/schedules`}
          className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary-500 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
        >
          <div>
            <span className="rounded-lg inline-flex p-3 bg-green-50 text-green-700 ring-4 ring-white">
              <Calendar className="h-6 w-6" />
            </span>
          </div>
          <div className="mt-8">
            <h3 className="text-lg font-medium">
              <span className="absolute inset-0" aria-hidden="true" />
              スケジュール
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              自動投稿スケジュールの設定
            </p>
          </div>
          <span className="pointer-events-none absolute top-6 right-6 text-gray-300 group-hover:text-gray-400">
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 4h1a1 1 0 00-1-1v1zm-1 12a1 1 0 102 0h-2zM8 3a1 1 0 000 2V3zM3.293 19.293a1 1 0 101.414 1.414l-1.414-1.414zM19 4v12h2V4h-2zm1-1H8v2h12V3zm-.707.293l-16 16 1.414 1.414 16-16-1.414-1.414z" />
            </svg>
          </span>
        </Link>

        <Link
          to={`/sites/${id}/claude`}
          className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary-500 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
        >
          <div>
            <span className="rounded-lg inline-flex p-3 bg-purple-50 text-purple-700 ring-4 ring-white">
              <Brain className="h-6 w-6" />
            </span>
          </div>
          <div className="mt-8">
            <h3 className="text-lg font-medium">
              <span className="absolute inset-0" aria-hidden="true" />
              AI記事生成
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Claudeによる自動記事作成
            </p>
          </div>
          <span className="pointer-events-none absolute top-6 right-6 text-gray-300 group-hover:text-gray-400">
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 4h1a1 1 0 00-1-1v1zm-1 12a1 1 0 102 0h-2zM8 3a1 1 0 000 2V3zM3.293 19.293a1 1 0 101.414 1.414l-1.414-1.414zM19 4v12h2V4h-2zm1-1H8v2h12V3zm-.707.293l-16 16 1.414 1.414 16-16-1.414-1.414z" />
            </svg>
          </span>
        </Link>

        <div className="relative group bg-white p-6 rounded-lg border border-gray-200">
          <div>
            <span className="rounded-lg inline-flex p-3 bg-gray-50 text-gray-700 ring-4 ring-white">
              <Settings className="h-6 w-6" />
            </span>
          </div>
          <div className="mt-8">
            <h3 className="text-lg font-medium">設定</h3>
            <p className="mt-2 text-sm text-gray-500">
              サイトの詳細設定
            </p>
          </div>
          <div className="mt-6">
            <Button size="sm" variant="outline" className="w-full">
              設定を開く
            </Button>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              投稿状況
            </h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">公開済み</span>
                <span className="text-sm font-medium">{stats.published || 0}件</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">下書き</span>
                <span className="text-sm font-medium">{stats.draft || 0}件</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">予定投稿</span>
                <span className="text-sm font-medium">{stats.scheduled || 0}件</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">失敗</span>
                <span className="text-sm font-medium text-red-600">{stats.failed || 0}件</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Claude生成状況
            </h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">完了</span>
                <span className="text-sm font-medium">{claudeStatsData.completed || 0}件</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">処理中</span>
                <span className="text-sm font-medium">{claudeStatsData.processing || 0}件</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">待機中</span>
                <span className="text-sm font-medium">{claudeStatsData.pending || 0}件</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">失敗</span>
                <span className="text-sm font-medium text-red-600">{claudeStatsData.failed || 0}件</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SiteDetailPage;