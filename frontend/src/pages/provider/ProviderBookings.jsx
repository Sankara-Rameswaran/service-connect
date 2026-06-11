import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../api/axios';

const statusColors = {
  PENDING: 'badge-yellow', ACCEPTED: 'badge-blue', IN_PROGRESS: 'badge-blue',
  COMPLETED: 'badge-green', CANCELLED: 'badge-red', REJECTED: 'badge-red',
};

export default function ProviderBookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [chattingId, setChattingId] = useState(null);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      if (statusFilter) params.set('status', statusFilter);
      const { data } = await api.get(`/bookings/provider?${params}`);
      setBookings(data.data || []);
      setPagination(data.pagination || {});
    } catch { toast.error('Failed to load bookings'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBookings(); }, [page, statusFilter]);

  const updateStatus = async (id, status, reason = '') => {
    try {
      const body = { status };
      if (reason) body[status === 'REJECTED' ? 'rejectionReason' : 'cancellationReason'] = reason;
      await api.put(`/bookings/${id}/status`, body);
      toast.success(`Booking ${status.toLowerCase()}`);
      fetchBookings();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  // Open (or create) a conversation with the client
  const handleChatWithUser = async (booking) => {
    setChattingId(booking._id);
    try {
      const userId = booking.user?._id || booking.user;
      const { data } = await api.post('/conversations', { participantId: userId, bookingId: booking._id });
      const convId = data.data.conversation._id;
      navigate('/provider/chat', { state: { openConversationId: convId } });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not open chat');
    } finally { setChattingId(null); }
  };

  const statuses = ['', 'PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Booking Requests</h1>
        <div className="text-sm text-gray-500 dark:text-gray-400">{pagination.total || 0} total</div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {statuses.map((s) => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              statusFilter === s
                ? 'bg-primary-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
            }`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-44 rounded-2xl" />)}</div>
      ) : bookings.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-3">📋</div>
          <h3 className="font-semibold text-gray-700 dark:text-gray-300">No bookings found</h3>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => (
            <div key={b._id} className="card p-5 hover:shadow-md transition-shadow">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center shrink-0 text-xl font-bold text-green-700 dark:text-green-300 overflow-hidden">
                    {b.user?.avatar
                      ? <img src={b.user.avatar} className="w-full h-full rounded-xl object-cover" alt="" />
                      : b.user?.name?.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{b.user?.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{b.service?.title}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      📅 {new Date(b.scheduledDate).toLocaleDateString()} at {b.scheduledTime}
                      <span className="mx-2">·</span>
                      📍 {b.address?.street}, {b.address?.city}
                    </p>
                    {b.notes && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">"{b.notes}"</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`badge ${statusColors[b.status]}`}>{b.status}</span>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">${b.paymentAmount}</div>
                    <div className="text-xs text-green-600 dark:text-green-400">
                      You earn: ${b.providerEarning?.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex-wrap">
                {/* ── Chat with Client (always available unless cancelled/rejected) ── */}
                {!['CANCELLED', 'REJECTED'].includes(b.status) && (
                  <button
                    onClick={() => handleChatWithUser(b)}
                    disabled={chattingId === b._id}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-xl border border-blue-200 dark:border-blue-800 transition-colors disabled:opacity-50"
                  >
                    <span>💬</span>
                    {chattingId === b._id ? 'Opening...' : `Chat with ${b.user?.name?.split(' ')[0] || 'Client'}`}
                  </button>
                )}

                {/* Accept / Reject */}
                {b.status === 'PENDING' && (
                  <>
                    <button onClick={() => updateStatus(b._id, 'ACCEPTED')}
                      className="btn-primary text-xs py-1.5 px-4">
                      ✓ Accept
                    </button>
                    <button onClick={() => {
                      const reason = prompt('Reason for rejection (optional):');
                      updateStatus(b._id, 'REJECTED', reason || 'Unable to fulfill');
                    }} className="text-xs px-4 py-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 transition-colors">
                      ✗ Reject
                    </button>
                  </>
                )}

                {/* Start Job */}
                {b.status === 'ACCEPTED' && (
                  <button onClick={() => updateStatus(b._id, 'IN_PROGRESS')}
                    className="btn-primary text-xs py-1.5 px-4">
                    🚗 Start Job
                  </button>
                )}

                {/* Complete Job */}
                {b.status === 'IN_PROGRESS' && (
                  <button onClick={() => updateStatus(b._id, 'COMPLETED')}
                    className="btn-primary text-xs py-1.5 px-4">
                    ✅ Mark Completed
                  </button>
                )}

                {/* Completed label */}
                {b.status === 'COMPLETED' && (
                  <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    ✅ Completed {b.completedAt ? new Date(b.completedAt).toLocaleDateString() : ''}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2">
          {[...Array(pagination.pages)].map((_, i) => (
            <button key={i} onClick={() => setPage(i + 1)}
              className={`w-10 h-10 rounded-xl text-sm font-medium transition-all ${
                page === i + 1 ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
              }`}>{i + 1}</button>
          ))}
        </div>
      )}
    </div>
  );
}
