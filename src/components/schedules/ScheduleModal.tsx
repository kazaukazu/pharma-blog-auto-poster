import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { apiService } from '../../services/api';
import Button from '../ui/Button';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule?: any;
  siteId: string;
}

const ScheduleModal: React.FC<ScheduleModalProps> = ({ isOpen, onClose, schedule, siteId }) => {
  const [formData, setFormData] = useState({
    frequency: 'weekly_2',
    time_slot: 'morning',
    specific_time: '',
    timezone: 'Asia/Tokyo',
    skip_holidays: true,
    max_monthly_posts: 100,
    cron_expression: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isTestingCron, setIsTestingCron] = useState(false);

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: any) => apiService.createSchedule(siteId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules', siteId] });
      toast.success('スケジュールを作成しました');
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'スケジュールの作成に失敗しました');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiService.updateSchedule(siteId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules', siteId] });
      toast.success('スケジュールを更新しました');
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'スケジュールの更新に失敗しました');
    },
  });

  useEffect(() => {
    if (schedule) {
      setFormData({
        frequency: schedule.frequency || 'weekly_2',
        time_slot: schedule.time_slot || 'morning',
        specific_time: schedule.specific_time || '',
        timezone: schedule.timezone || 'Asia/Tokyo',
        skip_holidays: schedule.skip_holidays !== undefined ? schedule.skip_holidays : true,
        max_monthly_posts: schedule.max_monthly_posts || 100,
        cron_expression: schedule.cron_expression || '',
      });
    } else {
      resetForm();
    }
  }, [schedule]);

  const resetForm = () => {
    setFormData({
      frequency: 'weekly_2',
      time_slot: 'morning',
      specific_time: '',
      timezone: 'Asia/Tokyo',
      skip_holidays: true,
      max_monthly_posts: 100,
      cron_expression: '',
    });
    setErrors({});
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (formData.time_slot === 'specific' && !formData.specific_time) {
      newErrors.specific_time = '時刻を指定してください';
    }

    if (formData.frequency === 'custom' && !formData.cron_expression) {
      newErrors.cron_expression = 'Cron式を入力してください';
    }

    if (formData.max_monthly_posts < 1 || formData.max_monthly_posts > 500) {
      newErrors.max_monthly_posts = '月間投稿数は1〜500の範囲で設定してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const submitData = {
      ...formData,
      specific_time: formData.time_slot === 'specific' ? formData.specific_time : undefined,
      cron_expression: formData.frequency === 'custom' ? formData.cron_expression : undefined,
    };

    if (schedule) {
      updateMutation.mutate({ id: schedule.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData((prev) => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
    
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const testCronExpression = async () => {
    if (!formData.cron_expression) {
      toast.error('Cron式を入力してください');
      return;
    }

    setIsTestingCron(true);
    try {
      const response = await apiService.testSchedule(formData.cron_expression);
      if (response.data.valid) {
        toast.success('Cron式は有効です');
      } else {
        toast.error('Cron式が無効です');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Cron式のテストに失敗しました');
    } finally {
      setIsTestingCron(false);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const frequencyOptions = [
    { value: 'daily', label: '毎日' },
    { value: 'weekly_3', label: '週3回（月・水・金）' },
    { value: 'weekly_2', label: '週2回（火・金）' },
    { value: 'weekly_1', label: '週1回（月曜日）' },
    { value: 'monthly_2', label: '月2回（1日・15日）' },
    { value: 'custom', label: 'カスタム（Cron式）' },
  ];

  const timeSlotOptions = [
    { value: 'morning', label: '午前（9:00）' },
    { value: 'afternoon', label: '午後（14:00）' },
    { value: 'evening', label: '夕方（18:00）' },
    { value: 'night', label: '夜（22:00）' },
    { value: 'specific', label: '時刻指定' },
  ];

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900"
                  >
                    {schedule ? 'スケジュール編集' : '新しいスケジュールを作成'}
                  </Dialog.Title>
                  <button
                    type="button"
                    className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                    onClick={onClose}
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="frequency" className="form-label">
                        投稿頻度 *
                      </label>
                      <select
                        name="frequency"
                        id="frequency"
                        value={formData.frequency}
                        onChange={handleChange}
                        className="form-input"
                      >
                        {frequencyOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="time_slot" className="form-label">
                        投稿時間 *
                      </label>
                      <select
                        name="time_slot"
                        id="time_slot"
                        value={formData.time_slot}
                        onChange={handleChange}
                        className="form-input"
                      >
                        {timeSlotOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {formData.time_slot === 'specific' && (
                    <div>
                      <label htmlFor="specific_time" className="form-label">
                        投稿時刻 *
                      </label>
                      <input
                        type="time"
                        name="specific_time"
                        id="specific_time"
                        value={formData.specific_time}
                        onChange={handleChange}
                        className={clsx(
                          'form-input',
                          errors.specific_time && 'border-red-300 focus:border-red-500 focus:ring-red-500'
                        )}
                      />
                      {errors.specific_time && (
                        <p className="form-error">{errors.specific_time}</p>
                      )}
                    </div>
                  )}

                  {formData.frequency === 'custom' && (
                    <div>
                      <label htmlFor="cron_expression" className="form-label">
                        Cron式 *
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          name="cron_expression"
                          id="cron_expression"
                          value={formData.cron_expression}
                          onChange={handleChange}
                          className={clsx(
                            'form-input flex-1',
                            errors.cron_expression && 'border-red-300 focus:border-red-500 focus:ring-red-500'
                          )}
                          placeholder="0 9 * * 1,3,5"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={testCronExpression}
                          loading={isTestingCron}
                        >
                          テスト
                        </Button>
                      </div>
                      {errors.cron_expression && (
                        <p className="form-error">{errors.cron_expression}</p>
                      )}
                      <p className="mt-1 text-sm text-gray-500">
                        例: "0 9 * * 1,3,5" = 月・水・金の9:00
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="max_monthly_posts" className="form-label">
                        月間最大投稿数 *
                      </label>
                      <input
                        type="number"
                        name="max_monthly_posts"
                        id="max_monthly_posts"
                        min="1"
                        max="500"
                        value={formData.max_monthly_posts}
                        onChange={handleChange}
                        className={clsx(
                          'form-input',
                          errors.max_monthly_posts && 'border-red-300 focus:border-red-500 focus:ring-red-500'
                        )}
                      />
                      {errors.max_monthly_posts && (
                        <p className="form-error">{errors.max_monthly_posts}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="timezone" className="form-label">
                        タイムゾーン
                      </label>
                      <select
                        name="timezone"
                        id="timezone"
                        value={formData.timezone}
                        onChange={handleChange}
                        className="form-input"
                      >
                        <option value="Asia/Tokyo">日本時間 (JST)</option>
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">東部時間 (EST/EDT)</option>
                        <option value="America/Los_Angeles">太平洋時間 (PST/PDT)</option>
                        <option value="Europe/London">ロンドン時間 (GMT/BST)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="skip_holidays"
                      id="skip_holidays"
                      checked={formData.skip_holidays}
                      onChange={handleChange}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="skip_holidays" className="ml-2 block text-sm text-gray-900">
                      祝日の投稿をスキップする
                    </label>
                  </div>

                  <div className="flex items-center justify-end pt-6 border-t border-gray-200 space-x-3">
                    <Button type="button" variant="outline" onClick={onClose}>
                      キャンセル
                    </Button>
                    <Button type="submit" loading={isLoading}>
                      {schedule ? '更新' : '作成'}
                    </Button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ScheduleModal;