import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { apiService } from '../../services/api';
import Button from '../ui/Button';
import { X, Plus, Minus } from 'lucide-react';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

interface ClaudeGenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  siteId: string;
}

const ClaudeGenerateModal: React.FC<ClaudeGenerateModalProps> = ({ isOpen, onClose, siteId }) => {
  const [formData, setFormData] = useState({
    topic: '',
    tone: 'friendly',
    target_length: 2000,
    keywords: [''],
    exclude_keywords: [''],
    structure: '導入→基本知識→詳細説明→地域情報→まとめ',
    seo_focus: true,
    create_post: true,
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const queryClient = useQueryClient();

  const { data: site } = useQuery({
    queryKey: ['site', siteId],
    queryFn: () => apiService.getSite(siteId),
    enabled: !!siteId,
  });

  const generateMutation = useMutation({
    mutationFn: (data: any) => apiService.generateArticle(siteId, data.request_data, data.create_post),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claude-requests', siteId] });
      queryClient.invalidateQueries({ queryKey: ['posts', siteId] });
      toast.success('記事生成を開始しました');
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || '記事生成の開始に失敗しました');
    },
  });

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setFormData({
      topic: '',
      tone: 'friendly',
      target_length: 2000,
      keywords: [''],
      exclude_keywords: [''],
      structure: '導入→基本知識→詳細説明→地域情報→まとめ',
      seo_focus: true,
      create_post: true,
    });
    setErrors({});
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.topic.trim()) {
      newErrors.topic = 'トピックを入力してください';
    }

    const validKeywords = formData.keywords.filter(k => k.trim());
    if (validKeywords.length === 0) {
      newErrors.keywords = '最低1つのキーワードを入力してください';
    }

    if (formData.target_length < 500 || formData.target_length > 5000) {
      newErrors.target_length = '文字数は500〜5000の範囲で設定してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const siteData = site?.data;
    if (!siteData) {
      toast.error('サイト情報の取得に失敗しました');
      return;
    }

    const requestData = {
      site_info: {
        region: siteData.region,
        pharmacy_name: siteData.pharmacy_name,
        pharmacy_features: siteData.pharmacy_features || '',
      },
      article_config: {
        topic: formData.topic,
        tone: formData.tone,
        target_length: formData.target_length,
        keywords: formData.keywords.filter(k => k.trim()),
        exclude_keywords: formData.exclude_keywords.filter(k => k.trim()),
      },
      template: {
        structure: formData.structure,
        seo_focus: formData.seo_focus,
      },
    };

    generateMutation.mutate({
      request_data: requestData,
      create_post: formData.create_post,
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData((prev) => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseInt(value) || 0 : value 
    }));
    
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleKeywordChange = (index: number, value: string, type: 'keywords' | 'exclude_keywords') => {
    setFormData((prev) => ({
      ...prev,
      [type]: prev[type].map((item, i) => (i === index ? value : item)),
    }));
    
    if (errors[type]) {
      setErrors((prev) => ({ ...prev, [type]: '' }));
    }
  };

  const addKeyword = (type: 'keywords' | 'exclude_keywords') => {
    setFormData((prev) => ({
      ...prev,
      [type]: [...prev[type], ''],
    }));
  };

  const removeKeyword = (index: number, type: 'keywords' | 'exclude_keywords') => {
    setFormData((prev) => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index),
    }));
  };

  const predefinedTopics = [
    '風邪薬の選び方と使い分け',
    'インフルエンザ予防と対策',
    '花粉症薬の種類と効果',
    '胃腸薬の正しい使い方',
    '高血圧の薬物療法',
    '糖尿病患者の薬管理',
    '薬の飲み合わせ注意点',
    '子供の薬の与え方',
    '高齢者の服薬管理',
    '漢方薬の基礎知識',
  ];

  const isLoading = generateMutation.isPending;

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
                    Claude記事生成
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
                  {/* Topic Selection */}
                  <div>
                    <label htmlFor="topic" className="form-label">
                      記事トピック *
                    </label>
                    <div className="space-y-2">
                      <input
                        type="text"
                        name="topic"
                        id="topic"
                        value={formData.topic}
                        onChange={handleChange}
                        className={clsx(
                          'form-input',
                          errors.topic && 'border-red-300 focus:border-red-500 focus:ring-red-500'
                        )}
                        placeholder="例: 風邪薬の選び方と使い分け"
                      />
                      <div className="flex flex-wrap gap-2">
                        {predefinedTopics.map((topic) => (
                          <button
                            key={topic}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, topic }))}
                            className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 transition-colors"
                          >
                            {topic}
                          </button>
                        ))}
                      </div>
                    </div>
                    {errors.topic && <p className="form-error">{errors.topic}</p>}
                  </div>

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="tone" className="form-label">
                        記事のトーン *
                      </label>
                      <select
                        name="tone"
                        id="tone"
                        value={formData.tone}
                        onChange={handleChange}
                        className="form-input"
                      >
                        <option value="professional">専門的で信頼性のある</option>
                        <option value="friendly">親しみやすく読みやすい</option>
                        <option value="neutral">中立的で情報提供的な</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="target_length" className="form-label">
                        目標文字数 *
                      </label>
                      <input
                        type="number"
                        name="target_length"
                        id="target_length"
                        min="500"
                        max="5000"
                        step="100"
                        value={formData.target_length}
                        onChange={handleChange}
                        className={clsx(
                          'form-input',
                          errors.target_length && 'border-red-300 focus:border-red-500 focus:ring-red-500'
                        )}
                      />
                      {errors.target_length && (
                        <p className="form-error">{errors.target_length}</p>
                      )}
                    </div>
                  </div>

                  {/* Keywords */}
                  <div>
                    <label className="form-label">
                      必須キーワード *
                    </label>
                    <div className="space-y-2">
                      {formData.keywords.map((keyword, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={keyword}
                            onChange={(e) => handleKeywordChange(index, e.target.value, 'keywords')}
                            className="form-input flex-1"
                            placeholder={`キーワード ${index + 1}`}
                          />
                          {formData.keywords.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeKeyword(index, 'keywords')}
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addKeyword('keywords')}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        キーワードを追加
                      </Button>
                    </div>
                    {errors.keywords && <p className="form-error">{errors.keywords}</p>}
                  </div>

                  {/* Exclude Keywords */}
                  <div>
                    <label className="form-label">
                      除外キーワード
                    </label>
                    <div className="space-y-2">
                      {formData.exclude_keywords.map((keyword, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={keyword}
                            onChange={(e) => handleKeywordChange(index, e.target.value, 'exclude_keywords')}
                            className="form-input flex-1"
                            placeholder={`除外キーワード ${index + 1}`}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeKeyword(index, 'exclude_keywords')}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addKeyword('exclude_keywords')}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        除外キーワードを追加
                      </Button>
                    </div>
                  </div>

                  {/* Structure */}
                  <div>
                    <label htmlFor="structure" className="form-label">
                      記事構成
                    </label>
                    <textarea
                      name="structure"
                      id="structure"
                      rows={3}
                      value={formData.structure}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="記事の構成を指定してください"
                    />
                  </div>

                  {/* Options */}
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="seo_focus"
                        id="seo_focus"
                        checked={formData.seo_focus}
                        onChange={handleChange}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <label htmlFor="seo_focus" className="ml-2 block text-sm text-gray-900">
                        SEO最適化を重視する
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="create_post"
                        id="create_post"
                        checked={formData.create_post}
                        onChange={handleChange}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <label htmlFor="create_post" className="ml-2 block text-sm text-gray-900">
                        生成後に自動で記事を作成する
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-6 border-t border-gray-200 space-x-3">
                    <Button type="button" variant="outline" onClick={onClose}>
                      キャンセル
                    </Button>
                    <Button type="submit" loading={isLoading}>
                      記事を生成
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

export default ClaudeGenerateModal;