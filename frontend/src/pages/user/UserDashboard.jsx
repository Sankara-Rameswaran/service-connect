import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../../api/axios';

const statusColors = {
  PENDING: 'badge-yellow', ACCEPTED: 'badge-blue', IN_PROGRESS: 'badge-blue',
  COMPLETED: 'badge-green', CANCELLED: 'badge-red', REJECTED: 'badge-red',
};

export default function UserDashboard() {
  const { user } = useSelector((s) => s.auth);
  const navigate = useNavigate();
  const [recentBookings, setRecentBookings] = useState([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, cancelled: 0 });
  const [loading, setLoading] = useState(true);
  const [chattingId, setChattingId] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/bookings/my?limit=5');
        const bookings = data.data || [];
        setRecentBookings(bookings);
        setStats({
          total: data.pagination?.total || bookings.length,
          completed: bookings.filter((b) => b.status === 'COMPLETED').length,
          pending: bookings.filter((b) => b.status === 'PENDING').length,
          cancelled: bookings.filter((b) => b.status === 'CANCELLED').length,
        });
      } catch {}
      finally { setLoading(false); }
    };
    load();
  }, []);

  const handleChatWithProvider = async (booking) => {
    setChattingId(booking._id);
    try {
      const providerId = booking.provider?._id || booking.provider;
      const { data } = await api.post('/conversations', { participantId: providerId, bookingId: booking._id });
      navigate('/dashboard/chat', { state: { openConversationId: data.data.conversation._id } });
    } catch {
    } finally { setChattingId(null); }
  };

  const statCards = [
    { label: 'Total Bookings', value: stats.total, icon: '📋', color: 'bg-blue-50 dark:bg-blue-900/20', textColor: 'text-blue-600' },
    { label: 'Completed', value: stats.completed, icon: '✅', color: 'bg-green-50 dark:bg-green-900/20', textColor: 'text-green-600' },
    { label: 'Pending', value: stats.pending, icon: '⏳', color: 'bg-yellow-50 dark:bg-yellow-900/20', textColor: 'text-yellow-600' },
    { label: 'Cancelled', value: stats.cancelled, icon: '❌', color: 'bg-red-50 dark:bg-red-900/20', textColor: 'text-red-600' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">Hello, {user?.name?.split(' ')[0]}! 👋</h1>
            <p className="text-primary-100">What can we help you with today?</p>
          </div>
          <Link to="/services" className="bg-white text-primary-700 font-semibold px-4 py-2 rounded-xl hover:bg-primary-50 transition-colors text-sm">
            Book a Service →
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className={`card p-5 ${s.color}`}>
            <div className="text-2xl mb-2">{s.icon}</div>
            <div className={`text-3xl font-bold ${s.textColor}`}>{s.value}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: '🔍', label: 'Browse Services', to: '/services', color: 'hover:border-blue-300' },
            { icon: '🆘', label: 'Need Help?', to: '/dashboard/need-help', color: 'hover:border-orange-300' },
            { icon: '💬', label: 'Messages', to: '/dashboard/chat', color: 'hover:border-green-300' },
            { icon: '📋', label: 'My Bookings', to: '/dashboard/bookings', color: 'hover:border-purple-300' },
          ].map((a) => (
            <Link key={a.label} to={a.to} className={`card p-5 flex flex-col items-center gap-3 hover:shadow-md transition-all duration-200 cursor-pointer border-2 border-transparent ${a.color}`}>
              <span className="text-3xl">{a.icon}</span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Bookings */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent Bookings</h2>
          <Link to="/dashboard/bookings" className="text-sm text-primary-600 hover:underline font-medium">View all →</Link>
        </div>
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
          </div>
        ) : recentBookings.length === 0 ? (
          <div className="card p-10 text-center">
            <div className="text-5xl mb-3">📋</div>
            <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">No bookings yet</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Book your first home service today</p>
            <Link to="/services" className="btn-primary inline-block">Browse Services</Link>
          </div>
        ) : (
          <div className="card divide-y divide-gray-100 dark:divide-gray-800">
            {recentBookings.map((b) => (
              <div key={b._id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center text-lg">
                    {b.service?.images?.[0] ? <img src={b.service.images[0]} className="w-full h-full rounded-xl object-cover" alt="" /> : '🛠️'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{b.service?.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{b.provider?.name} · {new Date(b.scheduledDate).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`badge ${statusColors[b.status]}`}>{b.status}</span>
                  {b.status === 'IN_PROGRESS' && (
                    <Link to={`/dashboard/bookings/${b._id}/track`} className="text-xs text-primary-600 hover:underline">Track</Link>
                  )}
                  {!['CANCELLED', 'REJECTED'].includes(b.status) && (
                    <button
                      onClick={() => handleChatWithProvider(b)}
                      disabled={chattingId === b._id}
                      className="text-xs px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors disabled:opacity-50"
                    >
                      💬 Chat
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
