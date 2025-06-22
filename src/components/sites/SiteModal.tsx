import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { apiService } from '../../services/api';
import Button from '../ui/Button';
import { X, Eye, EyeOff } from 'lucide-react';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

interface SiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  site?: any;
}

const SiteModal: React.FC<SiteModalProps> = ({ isOpen, onClose, site }) => {
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    username: '',
    password: '',
    region: '',
    pharmacy_name: '',
    pharmacy_features: '',
    category_id: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: any) => apiService.createSite(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      toast.success('サイトを追加しました');
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'サイトの追加に失敗しました');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiService.updateSite(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      toast.success('サイトを更新しました');
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'サイトの更新に失敗しました');
    },
  });

  useEffect(() => {
    if (site) {
      setFormData({
        name: site.name || '',
        url: site.url || '',
        username: '', // Don't populate for security
        password: '', // Don't populate for security
        region: site.region || '',
        pharmacy_name: site.pharmacy_name || '',
        pharmacy_features: site.pharmacy_features || '',
        category_id: site.category_id?.toString() || '',
      });
    } else {
      resetForm();
    }
  }, [site]);

  const resetForm = () => {
    setFormData({
      name: '',
      url: '',
      username: '',
      password: '',
      region: '',
      pharmacy_name: '',
      pharmacy_features: '',
      category_id: '',
    });
    setErrors({});
    setShowPassword(false);
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = 'サイト名を入力してください';
    }

    if (!formData.url.trim()) {
      newErrors.url = 'サイトURLを入力してください';
    } else if (!/^https?:\/\/.+/.test(formData.url)) {
      newErrors.url = '有効なURLを入力してください（http://またはhttps://）';
    }

    if (!formData.username.trim()) {
      newErrors.username = 'ユーザー名を入力してください';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'パスワードを入力してください';
    }

    if (!formData.region.trim()) {
      newErrors.region = '地域名を入力してください';
    }

    if (!formData.pharmacy_name.trim()) {
      newErrors.pharmacy_name = '薬局名を入力してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const submitData = {
      ...formData,
      category_id: formData.category_id ? parseInt(formData.category_id) : undefined,
    };

    if (site) {
      updateMutation.mutate({ id: site.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const testConnection = async () => {
    if (!formData.url || !formData.username || !formData.password) {
      toast.error('URL、ユーザー名、パスワードを入力してください');
      return;
    }

    setIsTestingConnection(true);
    try {
      // This is a simplified test - in reality you'd call a test endpoint
      toast.success('接続テストは実装準備中です');
    } catch (error) {
      toast.error('接続テストに失敗しました');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

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
                    {site ? 'サイト編集' : '新しいサイトを追加'}
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
                      <label htmlFor="name" className="form-label">
                        サイト名 *
                      </label>
                      <input
                        type="text"
                        name="name"
                        id="name"
                        value={formData.name}
                        onChange={handleChange}
                        className={clsx(
                          'form-input',
                          errors.name && 'border-red-300 focus:border-red-500 focus:ring-red-500'
                        )}
                        placeholder="例: 新宿中央薬局ブログ"
                      />
                      {errors.name && <p className="form-error">{errors.name}</p>}
                    </div>

                    <div>
                      <label htmlFor="url" className="form-label">
                        サイトURL *
                      </label>
                      <input
                        type="url"
                        name="url"
                        id="url"
                        value={formData.url}
                        onChange={handleChange}
                        className={clsx(
                          'form-input',
                          errors.url && 'border-red-300 focus:border-red-500 focus:ring-red-500'
                        )}
                        placeholder="https://example.com"
                      />
                      {errors.url && <p className="form-error">{errors.url}</p>}
                    </div>

                    <div>
                      <label htmlFor="username" className="form-label">
                        WordPressユーザー名 *
                      </label>
                      <input
                        type="text"
                        name="username"
                        id="username"
                        value={formData.username}
                        onChange={handleChange}
                        className={clsx(
                          'form-input',
                          errors.username && 'border-red-300 focus:border-red-500 focus:ring-red-500'
                        )}
                        placeholder="管理者ユーザー名"
                      />
                      {errors.username && <p className="form-error">{errors.username}</p>}
                    </div>

                    <div>
                      <label htmlFor="password" className="form-label">
                        WordPressパスワード *
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          id="password"
                          value={formData.password}
                          onChange={handleChange}
                          className={clsx(
                            'form-input pr-10',
                            errors.password && 'border-red-300 focus:border-red-500 focus:ring-red-500'
                          )}
                          placeholder="パスワード"
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-5 w-5 text-gray-400" />
                          ) : (
                            <Eye className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      </div>
                      {errors.password && <p className="form-error">{errors.password}</p>}
                    </div>

                    <div>
                      <label htmlFor="region" className="form-label">
                        地域名 *
                      </label>
                      <input
                        type="text"
                        name="region"
                        id="region"
                        value={formData.region}
                        onChange={handleChange}
                        className={clsx(
                          'form-input',
                          errors.region && 'border-red-300 focus:border-red-500 focus:ring-red-500'
                        )}
                        placeholder="例: 新宿区"
                      />
                      {errors.region && <p className="form-error">{errors.region}</p>}
                    </div>

                    <div>
                      <label htmlFor="pharmacy_name" className="form-label">
                        薬局名 *
                      </label>
                      <input
                        type="text"
                        name="pharmacy_name"
                        id="pharmacy_name"
                        value={formData.pharmacy_name}
                        onChange={handleChange}
                        className={clsx(
                          'form-input',
                          errors.pharmacy_name && 'border-red-300 focus:border-red-500 focus:ring-red-500'
                        )}
                        placeholder="例: 新宿中央薬局"
                      />
                      {errors.pharmacy_name && <p className="form-error">{errors.pharmacy_name}</p>}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="pharmacy_features" className="form-label">
                      薬局の特徴
                    </label>
                    <textarea
                      name="pharmacy_features"
                      id="pharmacy_features"
                      rows={3}
                      value={formData.pharmacy_features}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="例: 在宅医療対応、漢方相談、24時間営業"
                    />
                  </div>

                  <div>
                    <label htmlFor="category_id" className="form-label">
                      投稿カテゴリID
                    </label>
                    <input
                      type="number"
                      name="category_id"
                      id="category_id"
                      value={formData.category_id}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="WordPressのカテゴリID（オプション）"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={testConnection}
                      loading={isTestingConnection}
                    >
                      接続テスト
                    </Button>
                    <div className="flex space-x-3">
                      <Button type="button" variant="outline" onClick={onClose}>
                        キャンセル
                      </Button>
                      <Button type="submit" loading={isLoading}>
                        {site ? '更新' : '追加'}
                      </Button>
                    </div>
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

export default SiteModal;