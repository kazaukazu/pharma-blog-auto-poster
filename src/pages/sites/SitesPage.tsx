import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiService } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import SiteModal from '../../components/sites/SiteModal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Plus, Globe, Settings, Trash2, RefreshCw, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

const SitesPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingSite, setDeletingSite] = useState<any>(null);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { data: sites, isLoading } = useQuery({
    queryKey: ['sites'],
    queryFn: () => apiService.getSites(),
  });

  const deleteMutation = useMutation({
    mutationFn: (siteId: string) => apiService.deleteSite(siteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      toast.success('サイトを削除しました');
      setDeleteDialogOpen(false);
      setDeletingSite(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'サイトの削除に失敗しました');
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: (siteId: string) => apiService.testSiteConnection(siteId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      if (data.data.success) {
        toast.success('接続テストに成功しました');
      } else {
        toast.error(`接続テストに失敗しました: ${data.data.error}`);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || '接続テストに失敗しました');
    },
    onSettled: () => {
      setTestingConnection(null);
    },
  });

  const sitesList = sites?.data || [];

  const handleEdit = (site: any) => {
    setEditingSite(site);
    setIsModalOpen(true);
  };

  const handleDelete = (site: any) => {
    setDeletingSite(site);
    setDeleteDialogOpen(true);
  };

  const handleTestConnection = (siteId: string) => {
    setTestingConnection(siteId);
    testConnectionMutation.mutate(siteId);
  };

  const confirmDelete = () => {
    if (deletingSite) {
      deleteMutation.mutate(deletingSite.id);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSite(null);
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
            サイト管理
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            WordPressサイトの登録と管理
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            新しいサイトを追加
          </Button>
        </div>
      </div>

      {/* Sites List */}
      {sitesList.length === 0 ? (
        <div className="text-center py-12">
          <Globe className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            サイトが登録されていません
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            WordPressサイトを登録して記事の自動投稿を開始しましょう
          </p>
          <div className="mt-6">
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              最初のサイトを追加
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {sitesList.map((site: any) => (
            <div key={site.id} className="card">
              <div className="card-body">
                <div className="flex items-start justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Globe className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-medium text-gray-900">
                        {site.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {site.pharmacy_name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
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

                <div className="mt-4 space-y-2">
                  <div className="flex items-center text-sm text-gray-500">
                    <span className="font-medium">地域:</span>
                    <span className="ml-1">{site.region}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <span className="font-medium">URL:</span>
                    <a
                      href={site.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-1 text-primary-600 hover:text-primary-500 flex items-center"
                    >
                      {new URL(site.url).hostname}
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </div>
                  {site.pharmacy_features && (
                    <div className="flex items-start text-sm text-gray-500">
                      <span className="font-medium">特徴:</span>
                      <span className="ml-1">{site.pharmacy_features}</span>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(site)}
                    >
                      <Settings className="w-4 h-4 mr-1" />
                      設定
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTestConnection(site.id)}
                      loading={testingConnection === site.id}
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      接続テスト
                    </Button>
                  </div>
                  <div className="flex space-x-2">
                    <Link to={`/sites/${site.id}`}>
                      <Button size="sm">詳細</Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDelete(site)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Site Modal */}
      <SiteModal
        isOpen={isModalOpen}
        onClose={closeModal}
        site={editingSite}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="サイトを削除"
        message={`「${deletingSite?.name}」を削除してもよろしいですか？この操作は取り消せません。`}
        confirmText="削除"
        type="danger"
      />
    </div>
  );
};

export default SitesPage;