import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { apiService } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import ClaudeGenerateModal from '../../components/claude/ClaudeGenerateModal';
import { 
  Plus, 
  Brain, 
  RefreshCw, 
  Eye, 
  Trash2,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import toast from 'react-hot-toast';

const ClaudeRequestsPage = () => {
  const { siteId } = useParams<{ siteId: string }>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const queryClient = useQueryClient();

  const { data: requests, isLoading } = useQuery({
    queryKey: ['claude-requests', siteId, currentPage],
    queryFn: () => apiService.getClaudeRequests(siteId!, {
      page: currentPage,
      limit: 20,
    }),
    enabled: !!siteId,
  });

  const { data: site } = useQuery({
    queryKey: ['site', siteId],
    queryFn: () => apiService.getSite(siteId!),
    enabled: !!siteId,
  });

  const { data: stats } = useQuery({
    queryKey: ['claude-stats', siteId],
    queryFn: () => apiService.getClaudeStats(siteId!),
    enabled: !!siteId,
  });

  const retryMutation = useMutation({
    mutationFn: (requestId: string) => apiService.retryClaudeRequest(siteId!, requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claude-requests', siteId] });
      toast.success('記事生成を再試行しました');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || '再試行に失敗しました');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (requestId: string) => apiService.deleteClaudeRequest(siteId!, requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claude-requests', siteId] });
      toast.success('リクエストを削除しました');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || '削除に失敗しました');
    },
  });

  const requestsList = requests?.data?.requests || [];
  const pagination = requests?.data || {};
  const statsData = stats?.data || {};

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { variant: 'secondary' as const, label: '待機中' },
      processing: { variant: 'warning' as const, label: '処理中' },
      completed: { variant: 'success' as const, label: '完了' },
      failed: { variant: 'error' as const, label: '失敗' },
    };

    const config = statusMap[status as keyof typeof statusMap] || 
      { variant: 'secondary' as const, label: status };

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleRetry = (requestId: string) => {
    retryMutation.mutate(requestId);
  };

  const handleDelete = (requestId: string) => {
    if (confirm('このリクエストを削除してもよろしいですか？')) {
      deleteMutation.mutate(requestId);
    }
  };

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
            Claude記事生成
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {site?.data?.name} のAI記事生成履歴
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            記事を生成
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <div className="card-body p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-md bg-blue-100 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    総リクエスト数
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {statsData.total || 0}
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
                  <FileText className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    生成完了
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {statsData.completed || 0}
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
                  <RefreshCw className="w-5 h-5 text-yellow-600" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    処理中
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {statsData.processing || 0}
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
                <div className="w-8 h-8 rounded-md bg-red-100 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    失敗
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {statsData.failed || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Requests List */}
      {requestsList.length === 0 ? (
        <div className="text-center py-12">
          <Brain className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            記事生成履歴がありません
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Claudeを使って薬局向けの記事を自動生成してみましょう
          </p>
          <div className="mt-6">
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              最初の記事を生成
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  トピック
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ステータス
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  生成日時
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  処理時間
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  アクション
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {requestsList.map((request: any) => (
                <tr key={request.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {request.request_data?.article_config?.topic || '不明'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {request.request_data?.article_config?.tone || ''} - 
                          {request.request_data?.article_config?.target_length || 0}文字
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(request.status)}
                    {request.error_message && (
                      <div className="text-xs text-red-600 mt-1">
                        {request.error_message}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(request.created_at), 'yyyy/MM/dd HH:mm', { locale: ja })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {request.processed_at ? (
                      <>
                        {Math.round(
                          (new Date(request.processed_at).getTime() - 
                           new Date(request.created_at).getTime()) / 1000
                        )}秒
                      </>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {request.response_data && (
                        <Button size="sm" variant="outline">
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                      {request.status === 'failed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRetry(request.id)}
                          loading={retryMutation.isPending}
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(request.id)}
                        loading={deleteMutation.isPending}
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

      {/* Claude Generate Modal */}
      <ClaudeGenerateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        siteId={siteId!}
      />
    </div>
  );
};

export default ClaudeRequestsPage;