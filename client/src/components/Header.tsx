import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Bell, User, LogOut, Settings } from 'lucide-react';
import { Menu } from '@headlessui/react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';

const Header = () => {
  const { user, logout } = useAuth();
  const [notifications] = useState<any[]>([]);

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            {/* Page title could go here */}
          </div>

          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <Menu as="div" className="relative">
              <Menu.Button className="relative p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 rounded-md">
                <Bell className="h-5 w-5" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </Menu.Button>
              <Menu.Items className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                <div className="py-1">
                  <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
                    <strong>通知</strong>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-500">
                      新しい通知はありません
                    </div>
                  ) : (
                    notifications.map((notification, index) => (
                      <Menu.Item key={index}>
                        {({ active }: { active: boolean }) => (
                          <div
                            className={clsx(
                              'px-4 py-3 text-sm',
                              active ? 'bg-gray-50' : ''
                            )}
                          >
                            {notification.message}
                          </div>
                        )}
                      </Menu.Item>
                    ))
                  )}
                </div>
              </Menu.Items>
            </Menu>

            {/* User menu */}
            <Menu as="div" className="relative">
              <Menu.Button className="flex items-center space-x-2 p-2 text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 rounded-md">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium">{user?.name}</span>
              </Menu.Button>
              <Menu.Items className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                <div className="py-1">
                  <Menu.Item>
                    {({ active }: { active: boolean }) => (
                      <Link
                        to="/profile"
                        className={clsx(
                          'flex items-center px-4 py-2 text-sm',
                          active ? 'bg-gray-50 text-gray-900' : 'text-gray-700'
                        )}
                      >
                        <Settings className="mr-3 h-4 w-4" />
                        プロフィール設定
                      </Link>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }: { active: boolean }) => (
                      <button
                        onClick={logout}
                        className={clsx(
                          'flex items-center w-full px-4 py-2 text-sm text-left',
                          active ? 'bg-gray-50 text-gray-900' : 'text-gray-700'
                        )}
                      >
                        <LogOut className="mr-3 h-4 w-4" />
                        ログアウト
                      </button>
                    )}
                  </Menu.Item>
                </div>
              </Menu.Items>
            </Menu>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;