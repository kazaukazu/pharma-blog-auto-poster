import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Button from '../../components/ui/Button';
import { User, Lock, Mail, Edit } from 'lucide-react';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  const [profileErrors, setProfileErrors] = useState<{ [key: string]: string }>({});
  const [passwordErrors, setPasswordErrors] = useState<{ [key: string]: string }>({});

  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => apiService.getProfile(),
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: { name: string; email: string }) => apiService.updateProfile(data),
    onSuccess: (response) => {
      updateUser(response.data);
      toast.success('プロフィールを更新しました');
      setIsEditingProfile(false);
      setProfileErrors({});
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || 'プロフィールの更新に失敗しました';
      toast.error(errorMessage);
      if (error.response?.data?.details) {
        const errors: { [key: string]: string } = {};
        error.response.data.details.forEach((detail: any) => {
          errors[detail.field] = detail.message;
        });
        setProfileErrors(errors);
      }
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) => 
      apiService.changePassword(data.currentPassword, data.newPassword),
    onSuccess: () => {
      toast.success('パスワードを変更しました');
      setIsChangingPassword(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setPasswordErrors({});
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || 'パスワードの変更に失敗しました';
      toast.error(errorMessage);
    },
  });

  const validateProfile = () => {
    const errors: { [key: string]: string } = {};

    if (!profileData.name.trim()) {
      errors.name = '名前を入力してください';
    } else if (profileData.name.length < 2) {
      errors.name = '名前は2文字以上で入力してください';
    }

    if (!profileData.email.trim()) {
      errors.email = 'メールアドレスを入力してください';
    } else if (!/\S+@\S+\.\S+/.test(profileData.email)) {
      errors.email = '有効なメールアドレスを入力してください';
    }

    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePassword = () => {
    const errors: { [key: string]: string } = {};

    if (!passwordData.currentPassword) {
      errors.currentPassword = '現在のパスワードを入力してください';
    }

    if (!passwordData.newPassword) {
      errors.newPassword = '新しいパスワードを入力してください';
    } else if (passwordData.newPassword.length < 8) {
      errors.newPassword = 'パスワードは8文字以上で入力してください';
    }

    if (!passwordData.confirmPassword) {
      errors.confirmPassword = 'パスワード（確認）を入力してください';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'パスワードが一致しません';
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateProfile()) {
      updateProfileMutation.mutate(profileData);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validatePassword()) {
      changePasswordMutation.mutate({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
    }
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
    if (profileErrors[name]) {
      setProfileErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    if (passwordErrors[name]) {
      setPasswordErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const startEditProfile = () => {
    setProfileData({
      name: user?.name || '',
      email: user?.email || '',
    });
    setIsEditingProfile(true);
    setProfileErrors({});
  };

  const cancelEditProfile = () => {
    setIsEditingProfile(false);
    setProfileErrors({});
  };

  const cancelChangePassword = () => {
    setIsChangingPassword(false);
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setPasswordErrors({});
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const userData = profile?.data || user;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
          プロフィール設定
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          アカウント情報の管理
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Information */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <User className="w-5 h-5 mr-2" />
                基本情報
              </h3>
              {!isEditingProfile && (
                <Button size="sm" variant="outline" onClick={startEditProfile}>
                  <Edit className="w-4 h-4 mr-1" />
                  編集
                </Button>
              )}
            </div>
          </div>
          <div className="card-body">
            {isEditingProfile ? (
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="form-label">
                    名前 *
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    value={profileData.name}
                    onChange={handleProfileChange}
                    className={clsx(
                      'form-input',
                      profileErrors.name && 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    )}
                  />
                  {profileErrors.name && (
                    <p className="form-error">{profileErrors.name}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="email" className="form-label">
                    メールアドレス *
                  </label>
                  <input
                    type="email"
                    name="email"
                    id="email"
                    value={profileData.email}
                    onChange={handleProfileChange}
                    className={clsx(
                      'form-input',
                      profileErrors.email && 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    )}
                  />
                  {profileErrors.email && (
                    <p className="form-error">{profileErrors.email}</p>
                  )}
                </div>

                <div className="flex space-x-3">
                  <Button
                    type="submit"
                    loading={updateProfileMutation.isPending}
                    size="sm"
                  >
                    保存
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={cancelEditProfile}
                  >
                    キャンセル
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">名前</dt>
                  <dd className="mt-1 text-sm text-gray-900">{userData?.name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">メールアドレス</dt>
                  <dd className="mt-1 text-sm text-gray-900 flex items-center">
                    <Mail className="w-4 h-4 mr-2 text-gray-400" />
                    {userData?.email}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">登録日</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {userData?.created_at ? 
                      new Date(userData.created_at).toLocaleDateString('ja-JP') : 
                      '-'
                    }
                  </dd>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Password Change */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Lock className="w-5 h-5 mr-2" />
                パスワード変更
              </h3>
              {!isChangingPassword && (
                <Button size="sm" variant="outline" onClick={() => setIsChangingPassword(true)}>
                  <Edit className="w-4 h-4 mr-1" />
                  変更
                </Button>
              )}
            </div>
          </div>
          <div className="card-body">
            {isChangingPassword ? (
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label htmlFor="currentPassword" className="form-label">
                    現在のパスワード *
                  </label>
                  <input
                    type="password"
                    name="currentPassword"
                    id="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    className={clsx(
                      'form-input',
                      passwordErrors.currentPassword && 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    )}
                  />
                  {passwordErrors.currentPassword && (
                    <p className="form-error">{passwordErrors.currentPassword}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="newPassword" className="form-label">
                    新しいパスワード *
                  </label>
                  <input
                    type="password"
                    name="newPassword"
                    id="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    className={clsx(
                      'form-input',
                      passwordErrors.newPassword && 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    )}
                  />
                  {passwordErrors.newPassword && (
                    <p className="form-error">{passwordErrors.newPassword}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="form-label">
                    新しいパスワード（確認） *
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    id="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    className={clsx(
                      'form-input',
                      passwordErrors.confirmPassword && 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    )}
                  />
                  {passwordErrors.confirmPassword && (
                    <p className="form-error">{passwordErrors.confirmPassword}</p>
                  )}
                </div>

                <div className="flex space-x-3">
                  <Button
                    type="submit"
                    loading={changePasswordMutation.isPending}
                    size="sm"
                  >
                    パスワードを変更
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={cancelChangePassword}
                  >
                    キャンセル
                  </Button>
                </div>
              </form>
            ) : (
              <div className="text-center py-8">
                <Lock className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  セキュリティのため
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  パスワードは暗号化されて保存されています
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Account Info */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">
            アカウント情報
          </h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">アカウントID</dt>
              <dd className="mt-1 text-sm text-gray-900 font-mono">
                {userData?.id}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">最終更新</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {userData?.updated_at ? 
                  new Date(userData.updated_at).toLocaleString('ja-JP') : 
                  '-'
                }
              </dd>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;