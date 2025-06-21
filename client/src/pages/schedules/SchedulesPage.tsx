import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { apiService } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import ScheduleModal from '../../components/schedules/ScheduleModal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { 
  Plus, 
  Calendar, 
  Edit, 
  Trash2, 
  Play, 
  Pause,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

const SchedulesPage = () => {
  const { siteId } = useParams<{ siteId: string }>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingSchedule, setDeletingSchedule] = useState<any>(null);

  const queryClient = useQueryClient();

  const { data: schedules, isLoading } = useQuery({
    queryKey: ['schedules', siteId],
    queryFn: () => apiService.getSchedules(siteId!),
    enabled: !!siteId,
  });

  const { data: site } = useQuery({
    queryKey: ['site', siteId],
    queryFn: () => apiService.getSite(siteId!),
    enabled: !!siteId,
  });

  const { data: monthlyLimit } = useQuery({
    queryKey: ['monthly-limit', siteId],
    queryFn: () => apiService.getMonthlyLimit(siteId!),
    enabled: !!siteId,
  });

  const deleteMutation = useMutation({
    mutationFn: (scheduleId: string) => apiService.deleteSchedule(siteId!, scheduleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules', siteId] });
      toast.success('スケジュールを削除しました');
      setDeleteDialogOpen(false);
      setDeletingSchedule(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'スケジュールの削除に失敗しました');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ scheduleId, isActive }: { scheduleId: string; isActive: boolean }) => 
      apiService.toggleSchedule(siteId!, scheduleId, isActive),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['schedules', siteId] });
      toast.success(variables.isActive ? 'スケジュールを有効化しました' : 'スケジュールを無効化しました');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'スケジュールの切り替えに失敗しました');
    },
  });

  const schedulesList = schedules?.data || [];
  const limitData = monthlyLimit?.data || {};

  const handleEdit = (schedule: any) => {
    setEditingSchedule(schedule);
    setIsModalOpen(true);
  };

  const handleDelete = (schedule: any) => {
    setDeletingSchedule(schedule);
    setDeleteDialogOpen(true);
  };

  const handleToggle = (scheduleId: string, currentActive: boolean) => {
    toggleMutation.mutate({ scheduleId, isActive: !currentActive });
  };

  const confirmDelete = () => {
    if (deletingSchedule) {
      deleteMutation.mutate(deletingSchedule.id);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSchedule(null);
  };

  const getFrequencyLabel = (frequency: string) => {
    const frequencyMap = {
      daily: '毎日',
      weekly_3: '週3回',
      weekly_2: '週2回',
      weekly_1: '週1回',
      monthly_2: '月2回',
      custom: 'カスタム',
    };
    return frequencyMap[frequency as keyof typeof frequencyMap] || frequency;
  };

  const getTimeSlotLabel = (timeSlot: string, specificTime?: string) => {
    if (timeSlot === 'specific' && specificTime) {
      return specificTime;
    }
    
    const timeSlotMap = {
      morning: '午前 (9:00)',
      afternoon: '午後 (14:00)',
      evening: '夕方 (18:00)',
      night: '夜 (22:00)',
    };
    return timeSlotMap[timeSlot as keyof typeof timeSlotMap] || timeSlot;
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
            投稿スケジュール
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {site?.data?.name} の自動投稿設定
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            スケジュールを追加
          </Button>
        </div>
      </div>

      {/* Monthly Limit Info */}
      {limitData.limit && (
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">月間投稿制限</h3>
                <p className="text-sm text-gray-500">
                  今月の投稿数: {limitData.currentCount} / {limitData.limit}
                </p>
              </div>
              <div className="flex items-center">
                <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      limitData.currentCount / limitData.limit > 0.8
                        ? 'bg-red-500'
                        : limitData.currentCount / limitData.limit > 0.6
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{
                      width: `${Math.min((limitData.currentCount / limitData.limit) * 100, 100)}%`,
                    }}
                  />
                </div>
                <Badge
                  variant={limitData.canPost ? 'success' : 'error'}
                >
                  {limitData.canPost ? '投稿可能' : '制限到達'}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedules List */}
      {schedulesList.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            スケジュールが設定されていません
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            自動投稿スケジュールを設定して記事の定期投稿を開始しましょう
          </p>
          <div className="mt-6">
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              最初のスケジュールを作成
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {schedulesList.map((schedule: any) => (
            <div key={schedule.id} className="card">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <Calendar className="h-6 w-6 text-gray-400" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {getFrequencyLabel(schedule.frequency)}
                        </h3>
                        <Badge
                          variant={schedule.is_active ? 'success' : 'secondary'}
                        >
                          {schedule.is_active ? 'アクティブ' : '無効'}
                        </Badge>
                      </div>
                      <div className="mt-1 text-sm text-gray-500 space-y-1">
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {getTimeSlotLabel(schedule.time_slot, schedule.specific_time)}
                        </div>
                        <div>
                          月間最大投稿数: {schedule.max_monthly_posts}件
                        </div>
                        {schedule.skip_holidays && (
                          <div>祝日スキップ: 有効</div>
                        )}
                        {schedule.cron_expression && (
                          <div className="font-mono text-xs">
                            Cron: {schedule.cron_expression}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggle(schedule.id, schedule.is_active)}
                      loading={toggleMutation.isPending}
                    >
                      {schedule.is_active ? (
                        <>
                          <Pause className="w-4 h-4 mr-1" />
                          無効化
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-1" />
                          有効化
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(schedule)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      編集
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDelete(schedule)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Next Executions */}
                {schedule.next_executions && schedule.next_executions.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      次回の投稿予定:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {schedule.next_executions.slice(0, 3).map((execution: string, index: number) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {new Date(execution).toLocaleDateString('ja-JP', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Schedule Modal */}
      <ScheduleModal
        isOpen={isModalOpen}
        onClose={closeModal}
        schedule={editingSchedule}
        siteId={siteId!}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="スケジュールを削除"
        message="このスケジュールを削除してもよろしいですか？自動投稿が停止されます。"
        confirmText="削除"
        type="danger"
      />
    </div>
  );
};

export default SchedulesPage;