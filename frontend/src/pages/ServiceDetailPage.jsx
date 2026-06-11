import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import api from '../api/axios';

export default function ServiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const [service, setService] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBooking, setShowBooking] = useState(false);
  const [booking, setBooking] = useState({
    scheduledDate: '', scheduledTime: '', notes: '', paymentMethod: 'CASH',
    address: { street: '', city: '', state: '', zipCode: '' },
  });
  const [submitting, setSubmitting] = useState(false);
  const [startingChat, setStartingChat] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [svcRes, revRes] = await Promise.all([
          api.get(`/services/${id}`),
          api.get(`/reviews/provider/${id}?limit=5`),
        ]);
        setService(svcRes.data.data.service);
        setReviews(revRes.data.data || []);
      } catch { toast.error('Failed to load service'); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [id]);

  const handleBook = async (e) => {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    setSubmitting(true);
    try {
      await api.post('/bookings', { serviceId: id, ...booking });
      toast.success('Booking created! Provider will confirm shortly.');
      setShowBooking(false);
      navigate('/dashboard/bookings');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed');
    } finally { setSubmitting(false); }
  };

  // ── Start a conversation with the provider ──────────────────────────────
  const handleStartChat = async () => {
    if (!user) { navigate('/login'); return; }
    if (user._id === service?.provider?._id) {
      toast.info("That's your own service!");
      return;
    }
    setStartingChat(true);
    try {
      const { data } = await api.post('/conversations', {
        participantId: service.provider._id,
      });
      const convId = data.data.conversation._id;
      // Route to the correct chat page based on role
      const chatPath = user.role === 'PROVIDER' ? '/provider/chat' : '/dashboard/chat';
      navigate(chatPath, { state: { openConversationId: convId } });
      toast.success(`Chat with ${service.provider.name} opened!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start chat');
    } finally { setStartingChat(false); }
  };

  if (loading) return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="skeleton h-8 w-64 mb-4" />
      <div className="skeleton h-64 rounded-2xl mb-6" />
      <div className="skeleton h-40 rounded-2xl" />
    </div>
  );

  if (!service) return (
    <div className="max-w-5xl mx-auto px-4 py-20 text-center">
      <div className="text-6xl mb-4">😕</div>
      <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300">Service not found</h2>
      <Link to="/services" className="btn-primary mt-4 inline-block">Browse Services</Link>
    </div>
  );

  const stars = (r) => Array.from({ length: 5 }, (_, i) => i < Math.round(r || 0) ? '★' : '☆').join('');
  const availColor = { ONLINE: 'bg-green-400', BUSY: 'bg-yellow-400', OFFLINE: 'bg-gray-400' };
  const isOwn = user && user._id === service.provider?._id;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/services" className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-primary-600 mb-6 text-sm">
        ← Back to Services
      </Link>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* ── Main Content ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Images */}
          <div className="card overflow-hidden">
            {service.images?.length > 0 ? (
              <img src={service.images[0]} alt={service.title} className="w-full aspect-video object-cover" />
            ) : (
              <div className="aspect-video bg-gradient-to-br from-primary-100 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 flex items-center justify-center text-8xl">🛠️</div>
            )}
          </div>

          {/* Info */}
          <div className="card p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="badge badge-blue mb-2">{service.category}</span>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{service.title}</h1>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">${service.price}</div>
                <div className="text-gray-400 text-sm capitalize">{service.priceType?.toLowerCase()}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-yellow-400">{stars(service.averageRating)}</span>
              <span className="text-gray-600 dark:text-gray-400 text-sm">{service.averageRating?.toFixed(1) || '0.0'} ({service.totalReviews || 0} reviews)</span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-600 dark:text-gray-400 text-sm">{service.totalBookings || 0} bookings</span>
            </div>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{service.description}</p>
            {service.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {service.tags.map((t) => (
                  <span key={t} className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full text-sm">{t}</span>
                ))}
              </div>
            )}
          </div>

          {/* Reviews */}
          <div className="card p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Reviews</h2>
            {reviews.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-6">No reviews yet</p>
            ) : (
              <div className="space-y-4">
                {reviews.map((r) => (
                  <div key={r._id} className="border-b border-gray-100 dark:border-gray-800 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-sm font-bold text-primary-700 dark:text-primary-300">
                        {r.user?.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">{r.user?.name}</p>
                        <span className="text-yellow-400 text-xs">{stars(r.rating)}</span>
                      </div>
                      <span className="ml-auto text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>
                    {r.comment && <p className="text-gray-600 dark:text-gray-400 text-sm ml-12">{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-5">
          {/* Provider card */}
          <div className="card p-6">
            <h3 className="font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wider mb-4">Service Provider</h3>
            <div className="flex items-center gap-3 mb-4">
              <div className="relative">
                <div className="w-14 h-14 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center text-xl font-bold text-primary-700 dark:text-primary-300 overflow-hidden">
                  {service.provider?.avatar ? (
                    <img src={service.provider.avatar} alt={service.provider.name} className="w-full h-full rounded-xl object-cover" />
                  ) : service.provider?.name?.charAt(0)}
                </div>
                <span className={`absolute -bottom-1 -right-1 w-4 h-4 ${availColor[service.provider?.availability] || 'bg-gray-400'} rounded-full border-2 border-white dark:border-gray-900`} />
              </div>
              <div>
                <p className="font-bold text-gray-900 dark:text-white">{service.provider?.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{service.provider?.availability}</p>
              </div>
            </div>
            {service.provider?.bio && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{service.provider.bio}</p>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
              <span className="text-yellow-400">{stars(service.provider?.averageRating)}</span>
              <span>{service.provider?.averageRating?.toFixed(1) || '0.0'} ({service.provider?.totalReviews || 0})</span>
            </div>

            {/* Message Provider Button */}
            {!isOwn && (
              user ? (
                <button
                  onClick={handleStartChat}
                  disabled={startingChat}
                  className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"
                >
                  <span>💬</span>
                  {startingChat ? 'Opening chat...' : `Message ${service.provider?.name?.split(' ')[0]}`}
                </button>
              ) : (
                <Link to="/login" className="btn-secondary w-full flex items-center justify-center gap-2 text-sm">
                  <span>💬</span> Sign in to Message
                </Link>
              )
            )}
          </div>

          {/* Booking CTA */}
          <div className="card p-6">
            <div className="text-center mb-4">
              <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">${service.price}</div>
              <div className="text-gray-400 text-sm capitalize">{service.priceType?.toLowerCase()}</div>
            </div>
            {isOwn ? (
              <p className="text-center text-gray-500 dark:text-gray-400 text-sm">This is your service</p>
            ) : user?.role === 'USER' ? (
              <button onClick={() => setShowBooking(true)} className="btn-primary w-full text-lg py-3">
                Book Now
              </button>
            ) : user?.role === 'PROVIDER' ? (
              <p className="text-center text-gray-500 dark:text-gray-400 text-sm">Switch to a user account to book</p>
            ) : (
              <Link to="/login" className="btn-primary w-full text-center block py-3">Sign in to Book</Link>
            )}
            <p className="text-center text-xs text-gray-400 mt-3">No payment until job is done</p>
          </div>
        </div>
      </div>

      {/* ── Booking Modal ── */}
      {showBooking && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setShowBooking(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Book Service</h2>
              <button onClick={() => setShowBooking(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <form onSubmit={handleBook} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                  <input type="date" required className="input" min={new Date().toISOString().split('T')[0]}
                    value={booking.scheduledDate} onChange={(e) => setBooking({ ...booking, scheduledDate: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time</label>
                  <input type="time" required className="input"
                    value={booking.scheduledTime} onChange={(e) => setBooking({ ...booking, scheduledTime: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Street Address</label>
                <input type="text" required className="input" placeholder="123 Main St"
                  value={booking.address.street} onChange={(e) => setBooking({ ...booking, address: { ...booking.address, street: e.target.value } })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City</label>
                  <input type="text" required className="input" placeholder="New York"
                    value={booking.address.city} onChange={(e) => setBooking({ ...booking, address: { ...booking.address, city: e.target.value } })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ZIP Code</label>
                  <input type="text" className="input" placeholder="10001"
                    value={booking.address.zipCode} onChange={(e) => setBooking({ ...booking, address: { ...booking.address, zipCode: e.target.value } })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Method</label>
                <select className="input" value={booking.paymentMethod} onChange={(e) => setBooking({ ...booking, paymentMethod: e.target.value })}>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="ONLINE">Online</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optional)</label>
                <textarea className="input h-24 resize-none" placeholder="Describe your issue or any special requirements..."
                  value={booking.notes} onChange={(e) => setBooking({ ...booking, notes: e.target.value })} />
              </div>
              <div className="flex items-center justify-between py-3 border-t border-gray-100 dark:border-gray-800">
                <span className="font-medium text-gray-700 dark:text-gray-300">Total</span>
                <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">₹{service.price}</span>
              </div>
              <button type="submit" disabled={submitting} className="btn-primary w-full py-3">
                {submitting ? 'Confirming...' : 'Confirm Booking'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
