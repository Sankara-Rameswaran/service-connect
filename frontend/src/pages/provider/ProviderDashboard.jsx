import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { updateUser } from '../../store/authSlice';
import api from '../../api/axios';

export default function ProviderDashboard() {
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, completed: 0, earnings: 0 });
  const [loading, setLoading] = useState(true);
  const [updatingAvail, setUpdatingAvail] = useState(false);
  const [chattingId, setChattingId] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/bookings/provider?limit=5');
        const bks = data.data || [];
        setBookings(bks);
        setStats({
          total: data.pagination?.total || bks.length,
          pending: bks.filter((b) => b.status === 'PENDING').length,
          completed: bks.filter((b) => b.status === 'COMPLETED').length,
          earnings: user?.totalEarnings || 0,
        });
      } catch {}
      finally { setLoading(false); }
    };
    load();
  }, []);

  const updateAvailability = async (avail) => {
    setUpdatingAvail(true);
    try {
      await api.put('/providers/availability', { availability: avail });
      dispatch(updateUser({ availability: avail }));
      toast.success(`Status set to ${avail}`);
    } catch { toast.error('Failed to update'); }
    finally { setUpdatingAvail(false); }
  };

  const handleBookingAction = async (id, status) => {
    try {
      await api.put(`/bookings/${id}/status`, { status });
      toast.success(`Booking ${status.toLowerCase()}`);
      setBookings((prev) => prev.map((b) => b._id === id ? { ...b, status } : b));
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleChatWithUser = async (booking) => {
    setChattingId(booking._id);
    try {
      const userId = booking.user?._id || booking.user;
      const { data } = await api.post('/conversations', { participantId: userId, bookingId: booking._id });
      navigate('/provider/chat', { state: { openConversationId: data.data.conversation._id } });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not open chat');
    } finally { setChattingId(null); }
  };

  const availOptions = [
    { value: 'ONLINE', label: 'Online', color: 'bg-green-500', hover: 'hover:bg-green-600' },
    { value: 'BUSY', label: 'Busy', color: 'bg-yellow-500', hover: 'hover:bg-yellow-600' },
    { value: 'OFFLINE', label: 'Offline', color: 'bg-gray-500', hover: 'hover:bg-gray-600' },
  ];

  const currentAvail = availOptions.find((a) => a.value === user?.availability) || availOptions[2];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-700 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">Welcome, {user?.name?.split(' ')[0]}! 🛠️</h1>
            <p className="text-green-100">Manage your bookings and services</p>
          </div>
          <div className="flex items-center gap-2 bg-white/10 rounded-xl p-2">
            <span className={`w-3 h-3 rounded-full ${currentAvail.color}`} />
            <span className="text-sm font-medium">{currentAvail.label}</span>
            <div className="flex gap-1 ml-2">
              {availOptions.map((o) => (
                <button key={o.value} disabled={updatingAvail || user?.availability === o.value}
                  onClick={() => updateAvailability(o.value)}
                  className={`text-xs px-2.5 py-1 rounded-lg text-white transition-all disabled:opacity-50 ${o.color} ${o.hover}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Bookings', value: stats.total, icon: '📋', color: 'text-blue-600' },
          { label: 'Pending', value: stats.pending, icon: '⏳', color: 'text-yellow-600' },
          { label: 'Completed', value: stats.completed, icon: '✅', color: 'text-green-600' },
          { label: 'Total Earnings', value: `$${user?.totalEarnings?.toFixed(2) || '0.00'}`, icon: '💰', color: 'text-emerald-600' },
        ].map((s) => (
          <div key={s.label} className="card p-5">
            <div className="text-2xl mb-2">{s.icon}</div>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Rating card */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Your Rating</h3>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-yellow-500">{user?.averageRating?.toFixed(1) || '0.0'}</span>
              <div>
                <div className="text-yellow-400">{'★'.repeat(Math.round(user?.averageRating || 0))}{'☆'.repeat(5 - Math.round(user?.averageRating || 0))}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{user?.totalReviews || 0} reviews</div>
              </div>
            </div>
          </div>
          <div className="text-right">
            <Link to="/provider/services" className="btn-primary text-sm">+ Add Service</Link>
          </div>
        </div>
      </div>

      {/* Recent Bookings */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent Bookings</h2>
          <Link to="/provider/bookings" className="text-sm text-primary-600 hover:underline font-medium">View all →</Link>
        </div>
        {loading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}</div>
        ) : bookings.length === 0 ? (
          <div className="card p-10 text-center">
            <div className="text-5xl mb-3">📋</div>
            <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">No bookings yet</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Add services to start receiving bookings</p>
          </div>
        ) : (
          <div className="card divide-y divide-gray-100 dark:divide-gray-800">
            {bookings.map((b) => (
              <div key={b._id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center text-lg shrink-0">
                      {b.user?.avatar ? <img src={b.user.avatar} className="w-full h-full rounded-xl object-cover" alt="" /> : '👤'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white text-sm">{b.user?.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{b.service?.title} · {new Date(b.scheduledDate).toLocaleDateString()}</p>
                      <p className="text-xs text-gray-400">{b.address?.street}, {b.address?.city}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`badge ${b.status === 'PENDING' ? 'badge-yellow' : b.status === 'COMPLETED' ? 'badge-green' : b.status === 'ACCEPTED' ? 'badge-blue' : 'badge-red'}`}>{b.status}</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">${b.paymentAmount}</span>
                  </div>
                </div>
                {b.status === 'PENDING' && (
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => handleBookingAction(b._id, 'ACCEPTED')} className="btn-primary text-xs py-1.5 px-3 flex-1">✓ Accept</button>
                    <button onClick={() => handleBookingAction(b._id, 'REJECTED')} className="text-xs px-3 py-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 transition-colors flex-1">✗ Reject</button>
                  </div>
                )}
                {b.status === 'ACCEPTED' && (
                  <button onClick={() => handleBookingAction(b._id, 'COMPLETED')} className="btn-primary text-xs py-1.5 px-3 mt-3 w-full">Mark as Completed</button>
                )}
                {/* Chat with client */}
                {!['CANCELLED', 'REJECTED'].includes(b.status) && (
                  <button
                    onClick={() => handleChatWithUser(b)}
                    disabled={chattingId === b._id}
                    className="mt-2 w-full flex items-center justify-center gap-1.5 text-xs px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-xl border border-blue-200 dark:border-blue-800 transition-colors disabled:opacity-50"
                  >
                    <span>💬</span>
                    {chattingId === b._id ? 'Opening...' : `Chat with ${b.user?.name?.split(' ')[0] || 'Client'}`}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
