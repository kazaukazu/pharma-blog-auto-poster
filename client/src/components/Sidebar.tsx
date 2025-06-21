import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home, 
  Globe, 
  FileText, 
  Calendar, 
  Brain, 
  User,
  Settings,
  BarChart3
} from 'lucide-react';
import { clsx } from 'clsx';

const navigation = [
  { name: 'ダッシュボード', href: '/', icon: Home },
  { name: 'サイト管理', href: '/sites', icon: Globe },
  { name: '設定', href: '/profile', icon: Settings },
];

const Sidebar = () => {
  const location = useLocation();
  const currentSiteId = location.pathname.split('/')[2];

  // If we're in a site-specific context, show site navigation
  const siteNavigation = currentSiteId ? [
    { name: '記事管理', href: `/sites/${currentSiteId}/posts`, icon: FileText },
    { name: 'スケジュール', href: `/sites/${currentSiteId}/schedules`, icon: Calendar },
    { name: 'Claude記事生成', href: `/sites/${currentSiteId}/claude`, icon: Brain },
    { name: '分析・レポート', href: `/sites/${currentSiteId}/analytics`, icon: BarChart3 },
  ] : [];

  return (
    <div className="bg-gray-900 text-white w-64 space-y-6 py-7 px-2 absolute inset-y-0 left-0 transform -translate-x-full md:relative md:translate-x-0 transition duration-200 ease-in-out">
      {/* Logo */}
      <div className="flex items-center space-x-2 px-4">
        <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-lg">P</span>
        </div>
        <span className="text-xl font-bold">PharmaBlog</span>
      </div>

      {/* Main Navigation */}
      <nav className="space-y-2">
        <div className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">
          メイン
        </div>
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              clsx(
                'group flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors',
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              )
            }
          >
            <item.icon className="mr-3 h-5 w-5" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      {/* Site-specific Navigation */}
      {siteNavigation.length > 0 && (
        <nav className="space-y-2">
          <div className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">
            サイト操作
          </div>
          {siteNavigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                clsx(
                  'group flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors',
                  isActive
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                )
              }
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
};

export default Sidebar;