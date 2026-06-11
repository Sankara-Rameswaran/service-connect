import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../api/axios';

const statusColors = {
  PENDING: 'badge-yellow', ACCEPTED: 'badge-blue', IN_PROGRESS: 'badge-blue',
  COMPLETED: 'badge-green', CANCELLED: 'badge-red', REJECTED: 'badge-red',
};

function ReviewModal({ booking, onClose, onSubmit }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/reviews', { bookingId: booking._id, rating, comment });
      toast.success('Review submitted!');
      onSubmit();
      onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md animate-slide-up">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Leave a Review</h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
          How was your experience with <strong>{booking.provider?.name}</strong>?
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setRating(n)}
                  className={`text-3xl transition-transform hover:scale-110 ${n <= rating ? 'text-yellow-400' : 'text-gray-300'}`}>★</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Comment</label>
            <textarea className="input h-24 resize-none" placeholder="Share your experience..."
              value={comment} onChange={(e) => setComment(e.target.value)} />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UserBookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [reviewBooking, setReviewBooking] = useState(null);
  const [chattingId, setChattingId] = useState(null);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      if (statusFilter) params.set('status', statusFilter);
      const { data } = await api.get(`/bookings/my?${params}`);
      setBookings(data.data || []);
      setPagination(data.pagination || {});
    } catch { toast.error('Failed to load bookings'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBookings(); }, [page, statusFilter]);

  const cancelBooking = async (id) => {
    if (!window.confirm('Cancel this booking?')) return;
    try {
      await api.put(`/bookings/${id}/status`, { status: 'CANCELLED', cancellationReason: 'Cancelled by user' });
      toast.success('Booking cancelled');
      fetchBookings();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  // Open (or create) a conversation with the booking's provider
  const handleChatWithProvider = async (booking) => {
    setChattingId(booking._id);
    try {
      const providerId = booking.provider?._id || booking.provider;
      const { data } = await api.post('/conversations', { participantId: providerId, bookingId: booking._id });
      const convId = data.data.conversation._id;
      navigate('/dashboard/chat', { state: { openConversationId: convId } });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not open chat');
    } finally { setChattingId(null); }
  };

  const statuses = ['', 'PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Bookings</h1>
        <Link to="/services" className="btn-primary text-sm">+ New Booking</Link>
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

      {/* Booking Cards */}
      {loading ? (
        <div className="space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-36 rounded-2xl" />)}</div>
      ) : bookings.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-3">📋</div>
          <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">No bookings found</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Book your first service to get started</p>
          <Link to="/services" className="btn-primary inline-block">Browse Services</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => (
            <div key={b._id} className="card p-5 hover:shadow-md transition-shadow">
              {/* Header row */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center shrink-0 text-xl overflow-hidden">
                    {b.service?.images?.[0]
                      ? <img src={b.service.images[0]} className="w-full h-full object-cover" alt="" />
                      : '🛠️'}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">{b.service?.title}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="w-5 h-5 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-xs font-bold text-green-700 dark:text-green-300 shrink-0">
                        {b.provider?.name?.charAt(0)}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{b.provider?.name}</p>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      📅 {new Date(b.scheduledDate).toLocaleDateString()} at {b.scheduledTime}
                      <span className="mx-2">·</span>
                      📍 {b.address?.city}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`badge ${statusColors[b.status]}`}>{b.status}</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">₹{b.paymentAmount}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex-wrap">
                {/* ── Chat with Provider (always visible for active bookings) ── */}
                {!['CANCELLED', 'REJECTED'].includes(b.status) && (
                  <button
                    onClick={() => handleChatWithProvider(b)}
                    disabled={chattingId === b._id}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-xl border border-blue-200 dark:border-blue-800 transition-colors disabled:opacity-50"
                  >
                    <span>💬</span>
                    {chattingId === b._id ? 'Opening...' : `Chat with ${b.provider?.name?.split(' ')[0] || 'Provider'}`}
                  </button>
                )}

                {/* Track provider during active job */}
                {b.status === 'IN_PROGRESS' && (
                  <Link to={`/dashboard/bookings/${b._id}/track`} className="btn-primary text-xs py-1.5 px-3">
                    📍 Track Provider
                  </Link>
                )}

                {/* Review after completion */}
                {b.status === 'COMPLETED' && !b.reviewSubmitted && (
                  <button onClick={() => setReviewBooking(b)} className="btn-outline text-xs py-1.5 px-3">
                    ⭐ Leave Review
                  </button>
                )}

                {/* Review submitted label */}
                {b.status === 'COMPLETED' && b.reviewSubmitted && (
                  <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">✅ Review submitted</span>
                )}

                {/* Cancel button */}
                {['PENDING', 'ACCEPTED'].includes(b.status) && (
                  <button onClick={() => cancelBooking(b._id)}
                    className="text-xs px-3 py-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-900 transition-colors ml-auto">
                    Cancel
                  </button>
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

      {reviewBooking && (
        <ReviewModal booking={reviewBooking} onClose={() => setReviewBooking(null)} onSubmit={fetchBookings} />
      )}
    </div>
  );
}
