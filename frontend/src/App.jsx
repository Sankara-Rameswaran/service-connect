import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { connectSocket, disconnectSocket } from './services/socket';
import { addNotification, setUnreadCount } from './store/uiSlice';

// Layouts
import MainLayout from './layouts/MainLayout';
import DashboardLayout from './layouts/DashboardLayout';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ServicesPage from './pages/ServicesPage';
import ServiceDetailPage from './pages/ServiceDetailPage';
import UserDashboard from './pages/user/UserDashboard';
import UserBookings from './pages/user/UserBookings';
import ProviderDashboard from './pages/provider/ProviderDashboard';
import ProviderServices from './pages/provider/ProviderServices';
import ProviderBookings from './pages/provider/ProviderBookings';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminBookings from './pages/admin/AdminBookings';
import ChatPage from './pages/ChatPage';
import NotificationsPage from './pages/NotificationsPage';
import NeedHelpPage from './pages/NeedHelpPage';
import ProfilePage from './pages/ProfilePage';
import BookingTrackingPage from './pages/BookingTrackingPage';
import NotFoundPage from './pages/NotFoundPage';

// Protected Route Component
const ProtectedRoute = ({ children, roles }) => {
  const { user, token } = useSelector((state) => state.auth);
  if (!token || !user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

function App() {
  const dispatch = useDispatch();
  const { user, token } = useSelector((state) => state.auth);
  const { darkMode } = useSelector((state) => state.ui);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  useEffect(() => {
    if (token && user) {
      const socket = connectSocket(token);
      socket.on('notification', (notif) => dispatch(addNotification(notif)));
      socket.on('booking_update', (data) => dispatch(addNotification({ title: 'Booking Update', message: `Booking status: ${data.status}` })));
      return () => disconnectSocket();
    }
  }, [token, user]);

  return (
    <BrowserRouter>
      <ToastContainer position="top-right" autoClose={3000} />
      <Routes>
        {/* Public */}
        <Route path="/" element={<MainLayout />}>
          <Route index element={<LandingPage />} />
          <Route path="services" element={<ServicesPage />} />
          <Route path="services/:id" element={<ServiceDetailPage />} />
        </Route>

        {/* Auth */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* User Dashboard */}
        <Route path="/dashboard" element={
          <ProtectedRoute roles={['USER']}>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={<UserDashboard />} />
          <Route path="bookings" element={<UserBookings />} />
          <Route path="bookings/:id/track" element={<BookingTrackingPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="need-help" element={<NeedHelpPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Provider Dashboard */}
        <Route path="/provider" element={
          <ProtectedRoute roles={['PROVIDER']}>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={<ProviderDashboard />} />
          <Route path="services" element={<ProviderServices />} />
          <Route path="bookings" element={<ProviderBookings />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Admin Dashboard */}
        <Route path="/admin" element={
          <ProtectedRoute roles={['ADMIN']}>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="bookings" element={<AdminBookings />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
