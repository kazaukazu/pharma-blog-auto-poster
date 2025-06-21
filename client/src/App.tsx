import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import SitesPage from './pages/sites/SitesPage';
import SiteDetailPage from './pages/sites/SiteDetailPage';
import PostsPage from './pages/posts/PostsPage';
import PostDetailPage from './pages/posts/PostDetailPage';
import SchedulesPage from './pages/schedules/SchedulesPage';
import ClaudeRequestsPage from './pages/claude/ClaudeRequestsPage';
import AnalyticsPage from './pages/analytics/AnalyticsPage';
import ProfilePage from './pages/profile/ProfilePage';

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="sites" element={<SitesPage />} />
          <Route path="sites/:id" element={<SiteDetailPage />} />
          <Route path="sites/:siteId/posts" element={<PostsPage />} />
          <Route path="sites/:siteId/posts/:id" element={<PostDetailPage />} />
          <Route path="sites/:siteId/schedules" element={<SchedulesPage />} />
          <Route path="sites/:siteId/claude" element={<ClaudeRequestsPage />} />
          <Route path="sites/:siteId/analytics" element={<AnalyticsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Redirect unknown routes to dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;