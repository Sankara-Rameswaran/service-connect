import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import api from '../api/axios';
import { clearNotifications } from '../store/uiSlice';
import { updateUser } from '../store/authSlice';
import { getSocket } from '../services/socket';

// ==================== NOTIFICATIONS ====================
export function NotificationsPage() {
  const dispatch = useDispatch();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    try {
      const { data } = await api.get('/notifications?limit=30');
      setNotifications(data.data?.notifications || []);
      dispatch(clearNotifications());
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchNotifs(); }, []);

  const markRead = async (id) => {
    await api.put(`/notifications/${id}/read`);
    setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, isRead: true } : n));
  };

  const markAllRead = async () => {
    await api.put('/notifications/all/read');
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    dispatch(clearNotifications());
  };

  const typeIcons = { BOOKING_REQUEST: '📋', BOOKING_ACCEPTED: '✅', BOOKING_REJECTED: '❌', BOOKING_COMPLETED: '🎉', BOOKING_CANCELLED: '🚫', NEW_MESSAGE: '💬', NEW_REVIEW: '⭐', PAYMENT_RECEIVED: '💰', GENERAL: '🔔' };

  return (
    <div className="space-y-4 animate-fade-in max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
        {notifications.some((n) => !n.isRead) && (
          <button onClick={markAllRead} className="text-sm text-primary-600 hover:underline font-medium">Mark all read</button>
        )}
      </div>
      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
      ) : notifications.length === 0 ? (
        <div className="card p-12 text-center"><div className="text-5xl mb-3">🔔</div><h3 className="font-semibold text-gray-700 dark:text-gray-300">No notifications</h3></div>
      ) : (
        <div className="card divide-y divide-gray-100 dark:divide-gray-800">
          {notifications.map((n) => (
            <button key={n._id} onClick={() => !n.isRead && markRead(n._id)}
              className={`w-full flex items-start gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${!n.isRead ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''}`}>
              <span className="text-xl shrink-0">{typeIcons[n.type] || '🔔'}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${!n.isRead ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>{n.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{n.message}</p>
                <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
              {!n.isRead && <span className="w-2 h-2 bg-primary-500 rounded-full mt-2 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== NEED HELP ====================
export function NeedHelpPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: 'Plumbing', address: '' });
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = async () => {
    try {
      const { data } = await api.get('/need-help?status=OPEN');
      setRequests(data.data || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      files.forEach((f) => fd.append('images', f));
      await api.post('/need-help', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Help request posted!');
      setShowForm(false);
      setForm({ title: '', description: '', category: 'Plumbing', address: '' });
      fetchRequests();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Need Help?</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Post a request and providers will respond with quotes</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">+ Post Request</button>
      </div>

      {showForm && (
        <div className="card p-6">
          <h2 className="font-bold text-gray-900 dark:text-white mb-4">Describe your problem</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" required className="input" placeholder="Brief title of your issue"
              value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <textarea required className="input h-28 resize-none" placeholder="Describe the problem in detail..."
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div className="grid sm:grid-cols-2 gap-3">
              <select required className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {['Plumbing', 'Electrical', 'Cleaning', 'Painting', 'Carpentry', 'HVAC', 'Handyman', 'Other'].map((c) => <option key={c}>{c}</option>)}
              </select>
              <input type="text" className="input" placeholder="Your address"
                value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <input type="file" multiple accept="image/*" className="input py-2 text-sm" onChange={(e) => setFiles(Array.from(e.target.files))} />
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={submitting} className="btn-primary flex-1">{submitting ? 'Posting...' : 'Post Request'}</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}</div>
      ) : requests.length === 0 ? (
        <div className="card p-12 text-center"><div className="text-5xl mb-3">🆘</div><h3 className="font-semibold text-gray-700 dark:text-gray-300">No open requests</h3></div>
      ) : (
        <div className="space-y-4">
          {requests.map((r) => (
            <div key={r._id} className="card p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="font-semibold text-gray-900 dark:text-white">{r.title}</h3>
                <span className="badge badge-blue shrink-0">{r.category}</span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">{r.description}</p>
              {r.address && <p className="text-xs text-gray-400 mb-2">📍 {r.address}</p>}
              {r.images?.length > 0 && (
                <div className="flex gap-2 mb-3">
                  {r.images.map((img, i) => <img key={i} src={img} className="w-16 h-16 rounded-lg object-cover" alt="" />)}
                </div>
              )}
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>By {r.user?.name}</span>
                <span>{r.responses?.length || 0} responses</span>
                <span>{new Date(r.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== PROFILE ====================
export function ProfilePage() {
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '', bio: user?.bio || '', skills: user?.skills?.join(', ') || '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState(null);

  const handleProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (file) fd.append('avatar', file);
      const { data } = await api.put('/auth/profile', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      dispatch(updateUser(data.data?.user));
      toast.success('Profile updated!');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handlePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirm) { toast.error('Passwords do not match'); return; }
    try {
      await api.put('/auth/change-password', { currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword });
      toast.success('Password changed!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile Settings</h1>
      <div className="card p-6">
        <h2 className="font-bold text-gray-900 dark:text-white mb-5">Personal Information</h2>
        <form onSubmit={handleProfile} className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center text-2xl font-bold text-primary-700 dark:text-primary-300 overflow-hidden">
              {file ? <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="" /> :
               user?.avatar ? <img src={user.avatar} className="w-full h-full object-cover" alt="" /> : user?.name?.charAt(0)}
            </div>
            <div>
              <label className="btn-secondary text-sm cursor-pointer py-2">
                📷 Change Photo
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files[0])} />
              </label>
            </div>
          </div>
          {[
            { name: 'name', label: 'Full Name', type: 'text' },
            { name: 'phone', label: 'Phone', type: 'tel' },
          ].map((f) => (
            <div key={f.name}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{f.label}</label>
              <input type={f.type} className="input" value={form[f.name]} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} />
            </div>
          ))}
          {user?.role === 'PROVIDER' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bio</label>
                <textarea className="input h-24 resize-none" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Tell clients about yourself..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Skills (comma separated)</label>
                <input type="text" className="input" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="plumbing, installation, repairs" />
              </div>
            </>
          )}
          <button type="submit" disabled={saving} className="btn-primary w-full">{saving ? 'Saving...' : 'Save Changes'}</button>
        </form>
      </div>

      <div className="card p-6">
        <h2 className="font-bold text-gray-900 dark:text-white mb-5">Change Password</h2>
        <form onSubmit={handlePassword} className="space-y-4">
          {[
            { name: 'currentPassword', label: 'Current Password' },
            { name: 'newPassword', label: 'New Password' },
            { name: 'confirm', label: 'Confirm New Password' },
          ].map((f) => (
            <div key={f.name}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{f.label}</label>
              <input type="password" required className="input" value={passwordForm[f.name]}
                onChange={(e) => setPasswordForm({ ...passwordForm, [f.name]: e.target.value })} />
            </div>
          ))}
          <button type="submit" className="btn-primary w-full">Update Password</button>
        </form>
      </div>
    </div>
  );
}

// ==================== BOOKING TRACKING ====================
export function BookingTrackingPage() {
  const [booking, setBooking] = useState(null);
  const [providerLocation, setProviderLocation] = useState(null);
  const { id } = window.location.pathname.match(/\/bookings\/([^/]+)\/track/)?.groups || {};
  const bookingId = window.location.pathname.split('/')[window.location.pathname.split('/').indexOf('bookings') + 1];

  useEffect(() => {
    if (!bookingId) return;
    api.get(`/bookings/${bookingId}`).then(({ data }) => setBooking(data.data?.booking));
    const socket = getSocket();
    socket?.emit('join_booking', bookingId);
    socket?.on('provider_location', ({ lat, lng }) => setProviderLocation({ lat, lng }));
    return () => { socket?.emit('leave_booking', bookingId); socket?.off('provider_location'); };
  }, [bookingId]);

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Live Tracking</h1>
      {booking ? (
        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center font-bold text-primary-700 dark:text-primary-300">
                {booking.provider?.name?.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{booking.provider?.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{booking.service?.title}</p>
              </div>
              <span className="ml-auto badge badge-blue">{booking.status}</span>
            </div>
          </div>
          <div className="card p-5 text-center">
            <div className="text-6xl mb-3">📍</div>
            {providerLocation ? (
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Provider is on the way!</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Location: {providerLocation.lat.toFixed(4)}, {providerLocation.lng.toFixed(4)}</p>
              </div>
            ) : (
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Waiting for location updates...</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Provider will share location when they start</p>
                <div className="flex justify-center mt-3">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => <div key={i} className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="skeleton h-48 rounded-2xl" />
      )}
    </div>
  );
}
// ==================== NOT FOUND ====================
export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="text-center">
        <div className="text-9xl font-black text-gray-200 dark:text-gray-800">404</div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mt-4 mb-2">Page not found</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">The page you're looking for doesn't exist.</p>
        <a href="/" className="btn-primary inline-block">Go Home</a>
      </div>
    </div>
  );
}

export default NotificationsPage;
