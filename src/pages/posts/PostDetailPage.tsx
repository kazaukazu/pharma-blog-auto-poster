import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { apiService } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { ArrowLeft, Edit, Calendar, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

const PostDetailPage = () => {
  const { siteId, id } = useParams<{ siteId: string; id: string }>();

  const { data: post, isLoading } = useQuery({
    queryKey: ['post', siteId, id],
    queryFn: () => apiService.getPost(siteId!, id!),
    enabled: !!siteId && !!id,
  });

  const { data: site } = useQuery({
    queryKey: ['site', siteId],
    queryFn: () => apiService.getSite(siteId!),
    enabled: !!siteId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!post?.data) {
    return (
      <div className="text-center py-12">
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          記事が見つかりません
        </h3>
        <Link to={`/sites/${siteId}/posts`}>
          <Button className="mt-4">記事一覧に戻る</Button>
        </Link>
      </div>
    );
  }

  const postData = post.data;

  const getStatusBadge = (status: string) => {
    const statusMap = {
      draft: { variant: 'secondary' as const, label: '下書き' },
      scheduled: { variant: 'info' as const, label: '予定投稿' },
      published: { variant: 'success' as const, label: '公開済み' },
      failed: { variant: 'error' as const, label: '失敗' },
      processing: { variant: 'warning' as const, label: '処理中' },
    };

    const config = statusMap[status as keyof typeof statusMap] || 
      { variant: 'secondary' as const, label: status };

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to={`/sites/${siteId}/posts`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              記事一覧に戻る
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">記事詳細</h1>
            <p className="text-sm text-gray-500">{site?.data?.name}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {getStatusBadge(postData.status)}
          <Button size="sm">
            <Edit className="w-4 h-4 mr-2" />
            編集
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Post Content */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900">
                {postData.title}
              </h2>
            </div>
            <div className="card-body">
              {postData.content ? (
                <div 
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: postData.content }}
                />
              ) : (
                <p className="text-gray-500 italic">記事内容がありません</p>
              )}
            </div>
          </div>

          {/* Meta Description */}
          {postData.meta_description && (
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">
                  メタディスクリプション
                </h3>
              </div>
              <div className="card-body">
                <p className="text-sm text-gray-600">
                  {postData.meta_description}
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {postData.error_message && (
            <div className="card border-red-200">
              <div className="card-header bg-red-50">
                <h3 className="text-lg font-medium text-red-900">
                  エラー詳細
                </h3>
              </div>
              <div className="card-body">
                <p className="text-sm text-red-600">
                  {postData.error_message}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Post Info */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">記事情報</h3>
            </div>
            <div className="card-body space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">ステータス</dt>
                <dd className="mt-1">{getStatusBadge(postData.status)}</dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">作成日時</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {format(new Date(postData.created_at), 'yyyy年MM月dd日 HH:mm', { locale: ja })}
                </dd>
              </div>

              {postData.updated_at !== postData.created_at && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">更新日時</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {format(new Date(postData.updated_at), 'yyyy年MM月dd日 HH:mm', { locale: ja })}
                  </dd>
                </div>
              )}

              {postData.scheduled_at && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    予定投稿日時
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {format(new Date(postData.scheduled_at), 'yyyy年MM月dd日 HH:mm', { locale: ja })}
                  </dd>
                </div>
              )}

              {postData.published_at && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">公開日時</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {format(new Date(postData.published_at), 'yyyy年MM月dd日 HH:mm', { locale: ja })}
                  </dd>
                </div>
              )}

              {postData.wordpress_post_id && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">WordPress記事ID</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {postData.wordpress_post_id}
                  </dd>
                </div>
              )}

              {postData.estimated_reading_time && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">推定読了時間</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    約{postData.estimated_reading_time}分
                  </dd>
                </div>
              )}
            </div>
          </div>

          {/* Topic Info */}
          {postData.topic_title && (
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">トピック</h3>
              </div>
              <div className="card-body">
                <div className="flex items-center text-sm">
                  <span className="font-medium text-gray-900">
                    {postData.topic_title}
                  </span>
                  {postData.topic_category && (
                    <span className="ml-2 text-gray-500">
                      ({postData.topic_category})
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tags */}
          {postData.tags && postData.tags.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <Tag className="w-4 h-4 mr-2" />
                  タグ
                </h3>
              </div>
              <div className="card-body">
                <div className="flex flex-wrap gap-2">
                  {postData.tags.map((tag: string, index: number) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">アクション</h3>
            </div>
            <div className="card-body space-y-2">
              <Button size="sm" className="w-full">
                <Edit className="w-4 h-4 mr-2" />
                編集
              </Button>
              
              {postData.status === 'draft' && postData.content && (
                <Button size="sm" className="w-full">
                  公開
                </Button>
              )}
              
              {postData.status === 'failed' && (
                <Button size="sm" variant="outline" className="w-full">
                  再試行
                </Button>
              )}
              
              <Button size="sm" variant="danger" className="w-full">
                削除
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostDetailPage;