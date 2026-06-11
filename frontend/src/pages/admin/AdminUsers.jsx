import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../api/axios';

export function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      const { data } = await api.get(`/admin/users?${params}`);
      setUsers(data.data || []);
      setPagination(data.pagination || {});
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, [page, roleFilter]);

  const handleSuspend = async (user) => {
    const reason = user.isSuspended ? '' : prompt('Reason for suspension:');
    if (!user.isSuspended && !reason) return;
    try {
      await api.put(`/admin/users/${user._id}/suspend`, { suspend: !user.isSuspended, reason });
      toast.success(`User ${user.isSuspended ? 'unsuspended' : 'suspended'}`);
      fetchUsers();
    } catch { toast.error('Failed'); }
  };

  const roleBadge = { USER: 'badge-blue', PROVIDER: 'badge-green', ADMIN: 'badge-red' };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
      <div className="flex flex-col sm:flex-row gap-3">
        <input className="input flex-1" placeholder="Search by name or email..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchUsers()} />
        <select className="input w-40" value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}>
          <option value="">All Roles</option>
          <option value="USER">Users</option>
          <option value="PROVIDER">Providers</option>
          <option value="ADMIN">Admins</option>
        </select>
        <button onClick={fetchUsers} className="btn-primary">Search</button>
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
              <tr>
                {['User', 'Role', 'Phone', 'Rating', 'Earnings', 'Status', 'Joined', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}><td colSpan={8} className="px-4 py-3"><div className="skeleton h-5 rounded" /></td></tr>
                ))
              ) : users.map((u) => (
                <tr key={u._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center text-xs font-bold text-primary-700 dark:text-primary-300 shrink-0">
                        {u.avatar ? <img src={u.avatar} className="w-full h-full rounded-lg object-cover" alt="" /> : u.name?.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{u.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className={`badge ${roleBadge[u.role]}`}>{u.role}</span></td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{u.phone || '—'}</td>
                  <td className="px-4 py-3 text-yellow-500">{u.averageRating ? `⭐ ${u.averageRating.toFixed(1)}` : '—'}</td>
                  <td className="px-4 py-3 text-green-600 dark:text-green-400">{u.totalEarnings ? `$${u.totalEarnings.toFixed(2)}` : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${u.isSuspended ? 'badge-red' : u.isActive ? 'badge-green' : 'badge-gray'}`}>
                      {u.isSuspended ? 'Suspended' : u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {u.role !== 'ADMIN' && (
                      <button onClick={() => handleSuspend(u)}
                        className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                          u.isSuspended ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                        {u.isSuspended ? 'Unsuspend' : 'Suspend'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 && !loading && (
          <div className="p-10 text-center text-gray-500 dark:text-gray-400">No users found</div>
        )}
      </div>
      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2">
          {[...Array(Math.min(pagination.pages, 10))].map((_, i) => (
            <button key={i} onClick={() => setPage(i + 1)}
              className={`w-10 h-10 rounded-xl text-sm font-medium transition-all ${page === i + 1 ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'}`}>
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (statusFilter) params.set('status', statusFilter);
      const { data } = await api.get(`/admin/bookings?${params}`);
      setBookings(data.data || []);
      setPagination(data.pagination || {});
    } catch { toast.error('Failed to load bookings'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBookings(); }, [page, statusFilter]);

  const statusColors = { PENDING: 'badge-yellow', ACCEPTED: 'badge-blue', IN_PROGRESS: 'badge-blue', COMPLETED: 'badge-green', CANCELLED: 'badge-red', REJECTED: 'badge-red' };
  const statuses = ['', 'PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED'];

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">All Bookings</h1>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {statuses.map((s) => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-all ${statusFilter === s ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
              <tr>
                {['Service', 'User', 'Provider', 'Date', 'Amount', 'Commission', 'Status'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                [...Array(5)].map((_, i) => <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="skeleton h-5 rounded" /></td></tr>)
              ) : bookings.map((b) => (
                <tr key={b._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white max-w-[150px] truncate">{b.service?.title}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{b.user?.name}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{b.provider?.name}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{new Date(b.scheduledDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">${b.paymentAmount}</td>
                  <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-medium">${b.platformCommission?.toFixed(2)}</td>
                  <td className="px-4 py-3"><span className={`badge ${statusColors[b.status]}`}>{b.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {bookings.length === 0 && !loading && <div className="p-10 text-center text-gray-500">No bookings found</div>}
      </div>
    </div>
  );
}

export default AdminUsers;
