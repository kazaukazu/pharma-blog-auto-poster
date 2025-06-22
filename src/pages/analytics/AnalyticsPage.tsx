import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { apiService } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Button from '../../components/ui/Button';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  FileText,
  Brain,
  Clock,
  Target,
  Activity,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';

const AnalyticsPage = () => {
  const { siteId } = useParams<{ siteId: string }>();
  const [period, setPeriod] = useState('30d');

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics', siteId, period],
    queryFn: () => apiService.getAnalytics(siteId!, { period }),
    enabled: !!siteId,
  });

  const { data: stats } = useQuery({
    queryKey: ['site-stats', siteId],
    queryFn: () => apiService.getSiteStats(siteId!),
    enabled: !!siteId,
  });

  const { data: site } = useQuery({
    queryKey: ['site', siteId],
    queryFn: () => apiService.getSite(siteId!),
    enabled: !!siteId,
  });

  const periodOptions = [
    { value: '7d', label: '過去7日' },
    { value: '30d', label: '過去30日' },
    { value: '90d', label: '過去90日' },
    { value: '1y', label: '過去1年' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const analyticsData = analytics?.data || {};
  const statsData = stats?.data || {};
  const postsData = analyticsData.posts || [];
  const claudeData = analyticsData.claude || [];
  const topTopics = analyticsData.topTopics || [];
  const schedulePerformance = analyticsData.schedulePerformance || [];

  // Prepare chart data
  const chartData = postsData.map((post: any) => {
    const claudeEntry = claudeData.find((c: any) => 
      format(parseISO(c.date), 'yyyy-MM-dd') === format(parseISO(post.date), 'yyyy-MM-dd')
    );
    return {
      date: format(parseISO(post.date), 'MM/dd', { locale: ja }),
      posts: parseInt(post.posts_count, 10),
      published: parseInt(post.published_count, 10),
      claude_requests: claudeEntry ? parseInt(claudeEntry.requests_count, 10) : 0,
      claude_completed: claudeEntry ? parseInt(claudeEntry.completed_count, 10) : 0,
    };
  });

  // Pie chart data for post status
  const postStatusData = [
    { name: '公開済み', value: statsData.published_posts || 0, color: '#10B981' },
    { name: '下書き', value: statsData.draft_posts || 0, color: '#F59E0B' },
    { name: '失敗', value: statsData.failed_posts || 0, color: '#EF4444' },
  ];

  // Calculate success rate
  const claudeSuccessRate = statsData.total_claude_requests > 0 
    ? ((statsData.completed_claude_requests / statsData.total_claude_requests) * 100).toFixed(1)
    : '0';

  const postSuccessRate = statsData.total_posts > 0 
    ? ((statsData.published_posts / statsData.total_posts) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            分析・レポート
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {site?.data?.name} の詳細分析
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="form-input"
          >
            {periodOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <div className="card-body p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-md bg-blue-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    総投稿数
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {statsData.total_posts || 0}
                    </div>
                    <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                      <TrendingUp className="w-4 h-4 flex-shrink-0 self-center" />
                      <span className="sr-only">Increased by</span>
                      {statsData.posts_7d || 0} (7日間)
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-md bg-green-100 flex items-center justify-center">
                  <Target className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    投稿成功率
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {postSuccessRate}%
                    </div>
                    <div className="ml-2 text-sm text-gray-500">
                      {statsData.published_posts || 0}/{statsData.total_posts || 0}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-md bg-purple-100 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Claude成功率
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {claudeSuccessRate}%
                    </div>
                    <div className="ml-2 text-sm text-gray-500">
                      {statsData.completed_claude_requests || 0}/{statsData.total_claude_requests || 0}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-md bg-yellow-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    平均処理時間
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {Math.round(statsData.avg_processing_time || 0)}s
                    </div>
                    <div className="ml-2 text-sm text-gray-500">
                      Claude生成
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Posts Timeline Chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">
              投稿活動の推移
            </h3>
          </div>
          <div className="card-body">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="posts"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    name="総投稿数"
                  />
                  <Line
                    type="monotone"
                    dataKey="published"
                    stroke="#10B981"
                    strokeWidth={2}
                    name="公開済み"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Post Status Distribution */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">
              投稿ステータス分布
            </h3>
          </div>
          <div className="card-body">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={postStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {postStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Claude Requests Chart */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">
            Claude記事生成の推移
          </h3>
        </div>
        <div className="card-body">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="claude_requests" fill="#8B5CF6" name="生成リクエスト" />
                <Bar dataKey="claude_completed" fill="#10B981" name="生成完了" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Topics */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">
              人気のトピック
            </h3>
          </div>
          <div className="card-body">
            {topTopics.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  データがありません
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  記事生成を開始するとデータが表示されます
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {topTopics.map((topic: any, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {topic.topic}
                      </p>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {topic.usage_count}回
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Schedule Performance */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">
              スケジュール実行状況
            </h3>
          </div>
          <div className="card-body">
            {schedulePerformance.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  スケジュールなし
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  自動投稿スケジュールを設定してください
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {schedulePerformance.map((schedule: any, index: number) => {
                  const totalPosts = parseInt(schedule.posts_created, 10);
                  const publishedPosts = parseInt(schedule.published_count, 10);
                  const failedPosts = parseInt(schedule.failed_count, 10);
                  const successRate = totalPosts > 0 ? ((publishedPosts / totalPosts) * 100).toFixed(1) : '0';

                  return (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-900">
                          {schedule.frequency} - {schedule.time_slot}
                        </h4>
                        <span className="text-sm text-gray-500">
                          成功率: {successRate}%
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">作成:</span>
                          <span className="ml-1 font-medium">{totalPosts}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">公開:</span>
                          <span className="ml-1 font-medium text-green-600">{publishedPosts}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">失敗:</span>
                          <span className="ml-1 font-medium text-red-600">{failedPosts}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;