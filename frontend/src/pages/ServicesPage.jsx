import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import api from '../api/axios';

const categories = [
  'All', 'Plumbing', 'Electrical', 'Cleaning', 'Painting', 'Carpentry',
  'Landscaping', 'HVAC', 'Roofing', 'Moving', 'Pest Control', 'Appliance Repair',
  'Handyman', 'Security',
];

function ServiceCard({ service, onStartChat }) {
  const { user } = useSelector((s) => s.auth);
  const stars = Array.from({ length: 5 }, (_, i) =>
    i < Math.round(service.averageRating || 0) ? '★' : '☆'
  ).join('');
  const availColor = { ONLINE: 'bg-green-400', BUSY: 'bg-yellow-400', OFFLINE: 'bg-gray-400' };
  const isOwn = user && (user._id === service.provider?._id || user._id === service.provider);

  return (
    <div className="card hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group flex flex-col">
      {/* Image */}
      <Link to={`/services/${service._id}`} className="block">
        <div className="aspect-video bg-gradient-to-br from-primary-100 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 relative overflow-hidden">
          {service.images?.[0] ? (
            <img
              src={service.images[0]}
              alt={service.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl">🛠️</div>
          )}
          <span className="absolute top-3 left-3 badge badge-blue">{service.category}</span>
        </div>
      </Link>

      {/* Body */}
      <div className="p-5 flex flex-col flex-1">
        <Link to={`/services/${service._id}`}>
          <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-1 line-clamp-1 hover:text-primary-600 transition-colors">
            {service.title}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-3 line-clamp-2">{service.description}</p>
        </Link>

        {/* Price + rating */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">₹{service.price}</span>
            <span className="text-gray-400 text-sm">/{service.priceType?.toLowerCase()}</span>
          </div>
          <div className="text-right">
            <div className="text-yellow-400 text-sm">{stars}</div>
            <div className="text-xs text-gray-400">({service.totalReviews || 0})</div>
          </div>
        </div>

        {/* Provider row */}
        {service.provider && (
          <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2">
            <div className="relative shrink-0">
              <div className="w-7 h-7 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-xs font-bold text-primary-700 dark:text-primary-300 overflow-hidden">
                {service.provider.avatar
                  ? <img src={service.provider.avatar} className="w-full h-full object-cover" alt="" />
                  : service.provider.name?.charAt(0)}
              </div>
              <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 ${availColor[service.provider.availability] || 'bg-gray-400'} rounded-full border border-white dark:border-gray-900`} />
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400 truncate flex-1">{service.provider.name}</span>

            {/* ── Message Provider button ── */}
            {!isOwn && (
              user ? (
                <button
                  onClick={(e) => { e.preventDefault(); onStartChat(service); }}
                  className="shrink-0 flex items-center gap-1 text-xs px-2.5 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors font-medium"
                  title={`Message ${service.provider.name}`}
                >
                  💬 Message
                </button>
              ) : (
                <Link
                  to="/login"
                  className="shrink-0 flex items-center gap-1 text-xs px-2.5 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors font-medium"
                >
                  💬 Message
                </Link>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ServicesPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [startingChatFor, setStartingChatFor] = useState(null);
  const [filters, setFilters] = useState({
    category: params.get('category') || '',
    search: params.get('search') || '',
    minPrice: '',
    maxPrice: '',
    rating: '',
    sort: '-createdAt',
    page: 1,
  });

  const fetchServices = async () => {
    setLoading(true);
    try {
      const query = Object.entries(filters)
        .filter(([_, v]) => v !== '' && v !== null)
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join('&');
      const { data } = await api.get(`/services?${query}&limit=12`);
      setServices(data.data);
      setPagination(data.pagination || {});
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchServices(); }, [filters.category, filters.page, filters.sort]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchServices();
  };

  // ── Start chat from service card ────────────────────────────────────────
  const handleStartChat = async (service) => {
    if (!user) { navigate('/login'); return; }
    const providerId = service.provider?._id || service.provider;
    if (user._id === providerId) { toast.info("That's your own service!"); return; }

    setStartingChatFor(service._id);
    try {
      const { data } = await api.post('/conversations', { participantId: providerId });
      const convId = data.data.conversation._id;
      const chatPath = user.role === 'PROVIDER' ? '/provider/chat' : '/dashboard/chat';
      toast.success(`Chat with ${service.provider?.name} opened!`);
      navigate(chatPath, { state: { openConversationId: convId } });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start chat');
    } finally {
      setStartingChatFor(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Home Services</h1>
        <p className="text-gray-600 dark:text-gray-400">Find verified professionals · Click 💬 to message any provider directly</p>
      </div>

      {/* Search & Filters */}
      <form onSubmit={handleSearch} className="card p-4 mb-8">
        <div className="flex flex-col lg:flex-row gap-3">
          <input
            className="input flex-1"
            placeholder="Search services..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          <input
            type="number" className="input w-28" placeholder="Min ₹"
            value={filters.minPrice}
            onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
          />
          <input
            type="number" className="input w-28" placeholder="Max ₹"
            value={filters.maxPrice}
            onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
          />
          <select
            className="input w-40"
            value={filters.sort}
            onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
          >
            <option value="-createdAt">Newest</option>
            <option value="price">Price: Low</option>
            <option value="-price">Price: High</option>
            <option value="-averageRating">Top Rated</option>
          </select>
          <button type="submit" className="btn-primary whitespace-nowrap">Search</button>
        </div>
      </form>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilters({ ...filters, category: cat === 'All' ? '' : cat, page: 1 })}
            className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              (cat === 'All' ? !filters.category : filters.category === cat)
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="card overflow-hidden">
              <div className="skeleton aspect-video" />
              <div className="p-5 space-y-3">
                <div className="skeleton h-5 w-3/4" />
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-6 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300">No services found</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Try adjusting your filters</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{pagination.total || services.length} services found</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {services.map((s) => (
              <ServiceCard
                key={s._id}
                service={s}
                onStartChat={handleStartChat}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="mt-10 flex justify-center gap-2">
              {[...Array(pagination.pages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setFilters({ ...filters, page: i + 1 })}
                  className={`w-10 h-10 rounded-xl text-sm font-medium transition-all ${
                    filters.page === i + 1
                      ? 'bg-primary-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
