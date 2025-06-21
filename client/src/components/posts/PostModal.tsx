import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { apiService } from '../../services/api';
import Button from '../ui/Button';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

interface PostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post?: any;
  siteId: string;
}

const PostModal: React.FC<PostModalProps> = ({ isOpen, onClose, post, siteId }) => {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    scheduled_at: '',
    meta_description: '',
    tags: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: any) => apiService.createPost(siteId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts', siteId] });
      toast.success('記事を作成しました');
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || '記事の作成に失敗しました');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiService.updatePost(siteId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts', siteId] });
      toast.success('記事を更新しました');
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || '記事の更新に失敗しました');
    },
  });

  useEffect(() => {
    if (post) {
      setFormData({
        title: post.title || '',
        content: post.content || '',
        scheduled_at: post.scheduled_at ? 
          new Date(post.scheduled_at).toISOString().slice(0, 16) : '',
        meta_description: post.meta_description || '',
        tags: post.tags ? post.tags.join(', ') : '',
      });
    } else {
      resetForm();
    }
  }, [post]);

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      scheduled_at: '',
      meta_description: '',
      tags: '',
    });
    setErrors({});
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.title.trim()) {
      newErrors.title = 'タイトルを入力してください';
    }

    if (!formData.content.trim()) {
      newErrors.content = '記事内容を入力してください';
    }

    if (formData.scheduled_at) {
      const scheduledDate = new Date(formData.scheduled_at);
      if (scheduledDate <= new Date()) {
        newErrors.scheduled_at = '予定日時は未来の日時を指定してください';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const submitData = {
      title: formData.title.trim(),
      content: formData.content.trim(),
      scheduled_at: formData.scheduled_at || undefined,
      meta_description: formData.meta_description.trim() || undefined,
      tags: formData.tags ? 
        formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : 
        undefined,
    };

    if (post) {
      updateMutation.mutate({ id: post.id, data: submitData });
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
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900"
                  >
                    {post ? '記事編集' : '新しい記事を作成'}
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
                  <div>
                    <label htmlFor="title" className="form-label">
                      タイトル *
                    </label>
                    <input
                      type="text"
                      name="title"
                      id="title"
                      value={formData.title}
                      onChange={handleChange}
                      className={clsx(
                        'form-input',
                        errors.title && 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      )}
                      placeholder="記事のタイトルを入力"
                    />
                    {errors.title && <p className="form-error">{errors.title}</p>}
                  </div>

                  <div>
                    <label htmlFor="content" className="form-label">
                      記事内容 *
                    </label>
                    <textarea
                      name="content"
                      id="content"
                      rows={12}
                      value={formData.content}
                      onChange={handleChange}
                      className={clsx(
                        'form-input',
                        errors.content && 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      )}
                      placeholder="記事の内容を入力してください..."
                    />
                    {errors.content && <p className="form-error">{errors.content}</p>}
                  </div>

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="scheduled_at" className="form-label">
                        予定投稿日時
                      </label>
                      <input
                        type="datetime-local"
                        name="scheduled_at"
                        id="scheduled_at"
                        value={formData.scheduled_at}
                        onChange={handleChange}
                        className={clsx(
                          'form-input',
                          errors.scheduled_at && 'border-red-300 focus:border-red-500 focus:ring-red-500'
                        )}
                      />
                      {errors.scheduled_at && <p className="form-error">{errors.scheduled_at}</p>}
                      <p className="mt-1 text-sm text-gray-500">
                        空欄の場合は下書きとして保存されます
                      </p>
                    </div>

                    <div>
                      <label htmlFor="tags" className="form-label">
                        タグ
                      </label>
                      <input
                        type="text"
                        name="tags"
                        id="tags"
                        value={formData.tags}
                        onChange={handleChange}
                        className="form-input"
                        placeholder="タグ1, タグ2, タグ3"
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        カンマ区切りで入力してください
                      </p>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="meta_description" className="form-label">
                      メタディスクリプション
                    </label>
                    <textarea
                      name="meta_description"
                      id="meta_description"
                      rows={3}
                      value={formData.meta_description}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="SEO用の説明文（120-160文字程度）"
                      maxLength={160}
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      {formData.meta_description.length}/160文字
                    </p>
                  </div>

                  <div className="flex items-center justify-end pt-6 border-t border-gray-200 space-x-3">
                    <Button type="button" variant="outline" onClick={onClose}>
                      キャンセル
                    </Button>
                    <Button type="submit" loading={isLoading}>
                      {post ? '更新' : '作成'}
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

export default PostModal;