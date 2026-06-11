import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/authSlice';
import { toggleDarkMode } from '../store/uiSlice';

const userNav = [
  { path: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { path: '/dashboard/bookings', label: 'My Bookings', icon: '📋' },
  { path: '/dashboard/need-help', label: 'Need Help', icon: '🆘' },
  { path: '/dashboard/chat', label: 'Messages', icon: '💬' },
  { path: '/dashboard/notifications', label: 'Notifications', icon: '🔔' },
  { path: '/dashboard/profile', label: 'Profile', icon: '👤' },
];

const providerNav = [
  { path: '/provider', label: 'Dashboard', icon: '🏠' },
  { path: '/provider/services', label: 'My Services', icon: '🛠️' },
  { path: '/provider/bookings', label: 'Bookings', icon: '📋' },
  { path: '/provider/chat', label: 'Messages', icon: '💬' },
  { path: '/provider/notifications', label: 'Notifications', icon: '🔔' },
  { path: '/provider/profile', label: 'Profile', icon: '👤' },
];

const adminNav = [
  { path: '/admin', label: 'Dashboard', icon: '📊' },
  { path: '/admin/users', label: 'Users', icon: '👥' },
  { path: '/admin/bookings', label: 'Bookings', icon: '📋' },
];

export default function DashboardLayout() {
  const { user } = useSelector((s) => s.auth);
  const { darkMode, unreadCount } = useSelector((s) => s.ui);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = user?.role === 'PROVIDER' ? providerNav : user?.role === 'ADMIN' ? adminNav : userNav;

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/');
  };

  const NavLink = ({ item }) => {
    const active = location.pathname === item.path;
    const hasNotif = item.icon === '🔔' && unreadCount > 0;
    return (
      <Link
        to={item.path}
        onClick={() => setSidebarOpen(false)}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 relative ${
          active
            ? 'bg-primary-600 text-white shadow-md'
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
      >
        <span className="text-lg">{item.icon}</span>
        <span>{item.label}</span>
        {hasNotif && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Link>
    );
  };

  const roleColor = user?.role === 'ADMIN' ? 'bg-red-600' : user?.role === 'PROVIDER' ? 'bg-green-600' : 'bg-primary-600';

  return (
    <div className="min-h-screen flex dark:bg-gray-950">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo */}
        <div className="flex items-center gap-2 p-6 border-b border-gray-100 dark:border-gray-800">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">H</span>
          </div>
          <span className="font-bold text-xl text-gray-900 dark:text-white">ServiceConnect</span>
        </div>

        {/* User info */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${roleColor} rounded-xl flex items-center justify-center text-white font-bold`}>
              {user?.avatar ? <img src={user.avatar} alt={user.name} className="w-full h-full rounded-xl object-cover" /> : user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user?.name}</p>
              <span className={`badge ${user?.role === 'ADMIN' ? 'badge-red' : user?.role === 'PROVIDER' ? 'badge-green' : 'badge-blue'} text-xs`}>
                {user?.role}
              </span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => <NavLink key={item.path} item={item} />)}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
          <Link to="/services" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <span>🔍</span> Browse Services
          </Link>
          <button onClick={() => dispatch(toggleDarkMode())} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <span>{darkMode ? '☀️' : '🌙'}</span> {darkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
            <span>🚪</span> Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 sm:px-6 h-16 flex items-center justify-between sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <span className="text-xl">☰</span>
          </button>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
            {location.pathname.split('/').pop() || 'Dashboard'}
          </h1>
          <div className="flex items-center gap-2">
            <Link to={user?.role === 'PROVIDER' ? '/provider/notifications' : user?.role === 'ADMIN' ? '/admin' : '/dashboard/notifications'} className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              <span className="text-xl">🔔</span>
              {unreadCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>}
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
