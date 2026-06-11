import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/authSlice';
import { toggleDarkMode } from '../store/uiSlice';

export default function MainLayout() {
  const { user } = useSelector((s) => s.auth);
  const { darkMode } = useSelector((s) => s.ui);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/');
  };

  const dashboardPath = user?.role === 'PROVIDER' ? '/provider' : user?.role === 'ADMIN' ? '/admin' : '/dashboard';

  return (
    <div className="min-h-screen flex flex-col dark:bg-gray-950">
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <span className="font-bold text-xl text-gray-900 dark:text-white">ServiceConnect</span>
            </Link>
            <div className="flex items-center gap-6">
              <Link to="/services" className="text-gray-600 dark:text-gray-300 hover:text-primary-600 font-medium transition-colors">Services</Link>
              <button onClick={() => dispatch(toggleDarkMode())} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300">
                {darkMode ? '☀️' : '🌙'}
              </button>
              {user ? (
                <div className="flex items-center gap-3">
                  <Link to={dashboardPath} className="btn-primary text-sm py-2">Dashboard</Link>
                  <button onClick={handleLogout} className="btn-secondary text-sm py-2">Logout</button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link to="/login" className="btn-secondary text-sm py-2">Login</Link>
                  <Link to="/register" className="btn-primary text-sm py-2">Get Started</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="bg-gray-900 dark:bg-gray-950 text-gray-400 py-10">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-6 h-6 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">S</span>
            </div>
            <span className="text-white font-bold">ServiceConnect</span>
          </div>
          <p className="text-sm">© 2026 ServiceConnect.</p>
        </div>
      </footer>
    </div>
  );
}
