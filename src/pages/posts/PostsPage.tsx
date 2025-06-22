import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { apiService } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import PostModal from '../../components/posts/PostModal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { 
  Plus, 
  FileText, 
  Edit, 
  Trash2, 
  Play, 
  Clock, 
  RefreshCw,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import toast from 'react-hot-toast';

const PostsPage = () => {
  const { siteId } = useParams<{ siteId: string }>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingPost, setDeletingPost] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const queryClient = useQueryClient();

  const { data: posts, isLoading } = useQuery({
    queryKey: ['posts', siteId, statusFilter, currentPage],
    queryFn: () => apiService.getPosts(siteId!, {
      page: currentPage,
      limit: 20,
      ...(statusFilter !== 'all' && { status: statusFilter }),
    }),
    enabled: !!siteId,
  });

  const { data: site } = useQuery({
    queryKey: ['site', siteId],
    queryFn: () => apiService.getSite(siteId!),
    enabled: !!siteId,
  });

  const deleteMutation = useMutation({
    mutationFn: (postId: string) => apiService.deletePost(siteId!, postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts', siteId] });
      toast.success('記事を削除しました');
      setDeleteDialogOpen(false);
      setDeletingPost(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || '記事の削除に失敗しました');
    },
  });

  const publishMutation = useMutation({
    mutationFn: (postId: string) => apiService.publishPost(siteId!, postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts', siteId] });
      toast.success('記事を投稿しました');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || '記事の投稿に失敗しました');
    },
  });

  const retryMutation = useMutation({
    mutationFn: (postId: string) => apiService.retryPost(siteId!, postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts', siteId] });
      toast.success('記事を再試行に設定しました');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || '再試行の設定に失敗しました');
    },
  });

  const postsList = posts?.data?.posts || [];
  const pagination = posts?.data || {};

  const handleEdit = (post: any) => {
    setEditingPost(post);
    setIsModalOpen(true);
  };

  const handleDelete = (post: any) => {
    setDeletingPost(post);
    setDeleteDialogOpen(true);
  };

  const handlePublish = (postId: string) => {
    publishMutation.mutate(postId);
  };

  const handleRetry = (postId: string) => {
    retryMutation.mutate(postId);
  };

  const confirmDelete = () => {
    if (deletingPost) {
      deleteMutation.mutate(deletingPost.id);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPost(null);
  };

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

  const statusOptions = [
    { value: 'all', label: 'すべて' },
    { value: 'draft', label: '下書き' },
    { value: 'scheduled', label: '予定投稿' },
    { value: 'published', label: '公開済み' },
    { value: 'failed', label: '失敗' },
    { value: 'processing', label: '処理中' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            記事管理
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {site?.data?.name} の記事一覧
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            新しい記事を作成
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">フィルター</h3>
            <div className="flex items-center space-x-4">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="form-input"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Posts List */}
      {postsList.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            記事がありません
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            新しい記事を作成してブログを始めましょう
          </p>
          <div className="mt-6">
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              最初の記事を作成
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  タイトル
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ステータス
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  予定日時
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  作成日
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  アクション
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {postsList.map((post: any) => (
                <tr key={post.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {post.title}
                        </div>
                        {post.topic_title && (
                          <div className="text-sm text-gray-500">
                            トピック: {post.topic_title}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(post.status)}
                    {post.error_message && (
                      <div className="text-xs text-red-600 mt-1">
                        {post.error_message}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {post.scheduled_at ? (
                      format(new Date(post.scheduled_at), 'yyyy/MM/dd HH:mm', { locale: ja })
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(post.created_at), 'yyyy/MM/dd HH:mm', { locale: ja })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <Link to={`/sites/${siteId}/posts/${post.id}`}>
                        <Button size="sm" variant="outline">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(post)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      {post.status === 'draft' && post.content && (
                        <Button
                          size="sm"
                          onClick={() => handlePublish(post.id)}
                          loading={publishMutation.isPending}
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      )}
                      {post.status === 'failed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRetry(post.id)}
                          loading={retryMutation.isPending}
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(post)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  前へ
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === pagination.totalPages}
                >
                  次へ
                </Button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">{pagination.total}</span> 件中{' '}
                    <span className="font-medium">
                      {(currentPage - 1) * pagination.limit + 1}
                    </span>{' '}
                    -{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * pagination.limit, pagination.total)}
                    </span>{' '}
                    件を表示
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    前へ
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === pagination.totalPages}
                  >
                    次へ
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Post Modal */}
      <PostModal
        isOpen={isModalOpen}
        onClose={closeModal}
        post={editingPost}
        siteId={siteId!}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="記事を削除"
        message={`「${deletingPost?.title}」を削除してもよろしいですか？この操作は取り消せません。`}
        confirmText="削除"
        type="danger"
      />
    </div>
  );
};

export default PostsPage;