import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiService } from '../services/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { 
  Globe, 
  FileText, 
  Calendar, 
  Brain, 
  Plus,
  TrendingUp,
  Activity,
  Clock,
  BarChart3
} from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

const DashboardPage = () => {
  const { data: sites, isLoading: sitesLoading } = useQuery({
    queryKey: ['sites'],
    queryFn: () => apiService.getSites(),
  });

  const { data: upcomingSchedules, isLoading: schedulesLoading } = useQuery({
    queryKey: ['upcoming-schedules'],
    queryFn: () => apiService.getUpcomingSchedules(),
  });

  const { data: dashboardAnalytics } = useQuery({
    queryKey: ['dashboard-analytics'],
    queryFn: () => apiService.getDashboardAnalytics(),
  });

  const sitesList = sites?.data || [];
  const schedulesList = upcomingSchedules?.data || [];
  const analyticsData = dashboardAnalytics?.data || {};

  if (sitesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const overview = analyticsData.overview || {};
  
  const stats = [
    {
      name: '登録サイト数',
      value: overview.site_count || sitesList.length,
      icon: Globe,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      change: '+0',
      changeType: 'neutral' as const,
    },
    {
      name: '総投稿数',
      value: overview.total_posts || 0,
      icon: FileText,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      change: `+${overview.posts_7d || 0}`,
      changeType: 'positive' as const,
    },
    {
      name: '公開済み',
      value: overview.published_posts || 0,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      change: 'この1週間',
      changeType: 'neutral' as const,
    },
    {
      name: 'Claude生成',
      value: overview.claude_requests || 0,
      icon: Brain,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      change: `+${overview.claude_requests_7d || 0}`,
      changeType: 'positive' as const,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            ダッシュボード
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            調剤薬局ブログ自動投稿システムの管理画面
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <Link to="/sites">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              新しいサイトを追加
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
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
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {stat.value}
                      </div>
                      {stat.change && (
                        <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                          stat.changeType === 'positive' ? 'text-green-600' :
                          stat.changeType === 'negative' ? 'text-red-600' : 'text-gray-500'
                        }`}>
                          {stat.changeType === 'positive' && <TrendingUp className="w-3 h-3 flex-shrink-0 self-center mr-1" />}
                          <span>{stat.change}</span>
                        </div>
                      )}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Monthly Activity Chart */}
      {analyticsData.monthlyActivity && analyticsData.monthlyActivity.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                月別投稿活動
              </h3>
              <BarChart3 className="w-5 h-5 text-gray-400" />
            </div>
          </div>
          <div className="card-body">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analyticsData.monthlyActivity.map((item: any) => ({
                  month: format(new Date(item.month), 'yyyy年MM月', { locale: ja }),
                  posts: item.posts_count,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="posts"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Sites Performance */}
        {analyticsData.topSites && analyticsData.topSites.length > 0 ? (
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                サイト別パフォーマンス（今月）
              </h3>
            </div>
            <div className="card-body p-0">
              <ul className="divide-y divide-gray-200">
                {analyticsData.topSites.map((site: any, index: number) => (
                  <li key={index} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 rounded-md bg-blue-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">
                              {index + 1}
                            </span>
                          </div>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">
                            {site.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {site.url}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="text-center">
                          <div className="font-medium text-gray-900">{site.posts_count}</div>
                          <div className="text-gray-500">投稿</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-green-600">{site.published_count}</div>
                          <div className="text-gray-500">公開</div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                最近追加されたサイト
            </h3>
          </div>
          <div className="card-body p-0">
            {sitesList.length === 0 ? (
              <div className="p-6 text-center">
                <Globe className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  サイトが登録されていません
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  WordPressサイトを登録して記事の自動投稿を開始しましょう
                </p>
                <div className="mt-6">
                  <Link to="/sites">
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      サイトを追加
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {sitesList.slice(0, 5).map((site: any) => (
                  <li key={site.id}>
                    <Link
                      to={`/sites/${site.id}`}
                      className="block hover:bg-gray-50 px-6 py-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <Globe className="h-5 w-5 text-gray-400" />
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">
                              {site.name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {site.region} - {site.pharmacy_name}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant={
                              site.connection_status === 'connected'
                                ? 'success'
                                : site.connection_status === 'error'
                                ? 'error'
                                : 'secondary'
                            }
                          >
                            {site.connection_status === 'connected'
                              ? '接続済み'
                              : site.connection_status === 'error'
                              ? 'エラー'
                              : '未確認'}
                          </Badge>
                          {!site.is_active && (
                            <Badge variant="secondary">無効</Badge>
                          )}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {sitesList.length > 5 && (
            <div className="card-footer">
              <Link to="/sites" className="text-sm text-primary-600 hover:text-primary-500">
                すべてのサイトを表示 →
              </Link>
            </div>
          )}
        </div>
        )}

        {/* Upcoming Schedules */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              今後の投稿予定
            </h3>
          </div>
          <div className="card-body p-0">
            {schedulesLoading ? (
              <div className="p-6">
                <LoadingSpinner />
              </div>
            ) : schedulesList.length === 0 ? (
              <div className="p-6 text-center">
                <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  スケジュールが設定されていません
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  投稿スケジュールを設定して自動投稿を開始しましょう
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {schedulesList.slice(0, 5).map((schedule: any, index: number) => (
                  <li key={index} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <Clock className="h-5 w-5 text-gray-400" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">
                            {schedule.site_name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {schedule.frequency} - {schedule.time_slot}
                          </p>
                        </div>
                      </div>
                      <div>
                        <Badge variant="info">アクティブ</Badge>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            クイックアクション
          </h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              to="/sites"
              className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary-500 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
            >
              <div>
                <span className="rounded-lg inline-flex p-3 bg-blue-50 text-blue-700 ring-4 ring-white">
                  <Globe className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-8">
                <h3 className="text-lg font-medium">
                  <span className="absolute inset-0" aria-hidden="true" />
                  サイト管理
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  WordPressサイトの追加・編集・削除
                </p>
              </div>
            </Link>

            <div className="relative group bg-white p-6 rounded-lg border border-gray-200 opacity-50">
              <div>
                <span className="rounded-lg inline-flex p-3 bg-green-50 text-green-700 ring-4 ring-white">
                  <FileText className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-8">
                <h3 className="text-lg font-medium">記事管理</h3>
                <p className="mt-2 text-sm text-gray-500">
                  記事の作成・編集・投稿管理
                </p>
              </div>
            </div>

            <div className="relative group bg-white p-6 rounded-lg border border-gray-200 opacity-50">
              <div>
                <span className="rounded-lg inline-flex p-3 bg-purple-50 text-purple-700 ring-4 ring-white">
                  <Calendar className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-8">
                <h3 className="text-lg font-medium">スケジュール</h3>
                <p className="mt-2 text-sm text-gray-500">
                  自動投稿スケジュールの設定
                </p>
              </div>
            </div>

            <div className="relative group bg-white p-6 rounded-lg border border-gray-200 opacity-50">
              <div>
                <span className="rounded-lg inline-flex p-3 bg-orange-50 text-orange-700 ring-4 ring-white">
                  <Brain className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-8">
                <h3 className="text-lg font-medium">AI記事生成</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Claudeによる自動記事作成
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;