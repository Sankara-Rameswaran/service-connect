import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../api/axios';

const categories = ['Plumbing', 'Electrical', 'Cleaning', 'Painting', 'Carpentry', 'Landscaping', 'HVAC', 'Roofing', 'Moving', 'Pest Control', 'Appliance Repair', 'Handyman', 'Security', 'Interior Design', 'Other'];

const emptyForm = { title: '', description: '', category: 'Plumbing', price: '', priceType: 'FIXED', tags: '' };

function ServiceFormModal({ service, onClose, onSave }) {
  const [form, setForm] = useState(service ? {
    title: service.title, description: service.description, category: service.category,
    price: service.price, priceType: service.priceType, tags: service.tags?.join(', ') || '',
  } : emptyForm);
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      files.forEach((f) => fd.append('images', f));
      const headers = { 'Content-Type': 'multipart/form-data' };
      if (service) {
        await api.put(`/services/${service._id}`, fd, { headers });
      } else {
        await api.post('/services', fd, { headers });
      }
      toast.success(`Service ${service ? 'updated' : 'created'}!`);
      onSave();
      onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{service ? 'Edit Service' : 'Add New Service'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
            <input type="text" required className="input" placeholder="e.g. Professional Plumbing Service"
              value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category *</label>
            <select required className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description *</label>
            <textarea required className="input h-28 resize-none" placeholder="Describe your service..."
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price ($) *</label>
              <input type="number" required min="0" step="0.01" className="input" placeholder="50.00"
                value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price Type</label>
              <select className="input" value={form.priceType} onChange={(e) => setForm({ ...form, priceType: e.target.value })}>
                <option value="FIXED">Fixed</option>
                <option value="HOURLY">Hourly</option>
                <option value="NEGOTIABLE">Negotiable</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags (comma separated)</label>
            <input type="text" className="input" placeholder="fast, reliable, insured"
              value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Images (up to 5)</label>
            <input type="file" multiple accept="image/*" className="input py-2 text-sm" onChange={(e) => setFiles(Array.from(e.target.files))} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1">{submitting ? 'Saving...' : service ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProviderServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'create' | service object

  const fetchServices = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/services/my');
      setServices(data.data || []);
    } catch { toast.error('Failed to load services'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchServices(); }, []);

  const deleteService = async (id) => {
    if (!confirm('Delete this service?')) return;
    try {
      await api.delete(`/services/${id}`);
      toast.success('Service deleted');
      fetchServices();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const toggleActive = async (service) => {
    try {
      await api.put(`/services/${service._id}`, { isActive: !service.isActive });
      fetchServices();
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Services</h1>
        <button onClick={() => setModal('create')} className="btn-primary">+ Add Service</button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-44 rounded-2xl" />)}</div>
      ) : services.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-6xl mb-4">🛠️</div>
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No services yet</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Add your first service to start receiving bookings</p>
          <button onClick={() => setModal('create')} className="btn-primary">Add First Service</button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {services.map((s) => (
            <div key={s._id} className={`card overflow-hidden transition-opacity ${!s.isActive ? 'opacity-60' : ''}`}>
              <div className="aspect-video bg-gradient-to-br from-primary-100 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 relative overflow-hidden">
                {s.images?.[0] ? (
                  <img src={s.images[0]} alt={s.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-5xl">🛠️</div>
                )}
                <span className={`absolute top-3 left-3 badge ${s.isActive ? 'badge-green' : 'badge-gray'}`}>{s.isActive ? 'Active' : 'Inactive'}</span>
                <span className="absolute top-3 right-3 badge badge-blue">{s.category}</span>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{s.title}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-3 line-clamp-2">{s.description}</p>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">${s.price}</span>
                  <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                    <div>⭐ {s.averageRating?.toFixed(1) || '0.0'} ({s.totalReviews || 0})</div>
                    <div>📋 {s.totalBookings || 0} bookings</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setModal(s)} className="btn-secondary flex-1 text-sm py-2">✏️ Edit</button>
                  <button onClick={() => toggleActive(s)} className="btn-secondary flex-1 text-sm py-2">{s.isActive ? '⏸ Deactivate' : '▶ Activate'}</button>
                  <button onClick={() => deleteService(s._id)} className="text-sm px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 transition-colors">🗑</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <ServiceFormModal
          service={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSave={fetchServices}
        />
      )}
    </div>
  );
}
