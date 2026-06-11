import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const categories = [
  { icon: '🔧', name: 'Plumbing' },
  { icon: '⚡', name: 'Electrical' },
  { icon: '🧹', name: 'Cleaning' },
  { icon: '🎨', name: 'Painting' },
  { icon: '🌳', name: 'Landscaping' },
  { icon: '❄️', name: 'HVAC' },
  { icon: '🪚', name: 'Carpentry' },
  { icon: '🐛', name: 'Pest Control' },
  { icon: '📦', name: 'Moving' },
  { icon: '🔨', name: 'Handyman' },
  { icon: '🏠', name: 'Roofing' },
  { icon: '🔒', name: 'Security' },
];

const stats = [
  { value: '10,000+', label: 'Happy Customers' },
  { value: '2,500+', label: 'Pro Providers' },
  { value: '50,000+', label: 'Jobs Completed' },
  { value: '4.9★', label: 'Average Rating' },
];

const testimonials = [
  { name: 'Sarah Johnson', role: 'Homeowner', text: 'Found an amazing plumber within minutes. Professional, punctual, and great value!', avatar: '👩' },
  { name: 'Mike Chen', role: 'Provider', text: 'ServiceConnect has transformed my business. More clients, less admin work, better income.', avatar: '👨' },
  { name: 'Emily Davis', role: 'Homeowner', text: 'The real-time tracking feature is brilliant. I knew exactly when my cleaner would arrive.', avatar: '👩‍💼' },
];

export default function LandingPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/services?search=${searchQuery}`);
  };

  return (
    <div className="dark:bg-gray-950">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent-400 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-4 py-2 text-sm mb-6">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              2,500+ professionals available now
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Home Services,<br />
              <span className="text-accent-400">Delivered Fast</span>
            </h1>
            <p className="text-xl text-blue-100 mb-10 max-w-2xl">
              Connect with verified professionals for all your home service needs. Book instantly, track in real-time, pay securely.
            </p>
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 max-w-2xl">
              <input
                type="text"
                placeholder="What service do you need?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-5 py-4 rounded-xl text-gray-900 text-lg focus:outline-none focus:ring-4 focus:ring-white/30"
              />
              <button type="submit" className="bg-accent-500 hover:bg-accent-600 text-white font-bold px-8 py-4 rounded-xl transition-colors whitespace-nowrap">
                Find Services →
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">{stat.value}</div>
                <div className="text-gray-600 dark:text-gray-400 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Browse by Category</h2>
          <p className="text-gray-600 dark:text-gray-400">Find the right professional for any job</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.name}
              to={`/services?category=${cat.name}`}
              className="card p-5 text-center hover:shadow-md hover:border-primary-200 dark:hover:border-primary-700 transition-all duration-200 group cursor-pointer"
            >
              <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-200">{cat.icon}</div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{cat.name}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 dark:bg-gray-900 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">How ServiceConnect Works</h2>
            <p className="text-gray-600 dark:text-gray-400">Simple, fast, and reliable</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '1', icon: '🔍', title: 'Browse & Book', desc: 'Find verified professionals in your area and book instantly with transparent pricing.' },
              { step: '2', icon: '📍', title: 'Real-Time Tracking', desc: 'Track your provider\'s location in real-time and get live updates on their arrival.' },
              { step: '3', icon: '⭐', title: 'Review & Pay', desc: 'Job done? Pay securely and leave a review to help others find great professionals.' },
            ].map((item) => (
              <div key={item.step} className="card p-8 text-center">
                <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center text-2xl mx-auto mb-4">{item.icon}</div>
                <div className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider mb-2">Step {item.step}</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{item.title}</h3>
                <p className="text-gray-600 dark:text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">What People Say</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div key={t.name} className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center text-2xl">{t.avatar}</div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">{t.name}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{t.role}</div>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-400 italic">"{t.text}"</p>
              <div className="mt-3 text-yellow-400 text-sm">★★★★★</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-blue-100 mb-8">Join thousands of homeowners and service providers on ServiceConnect</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register?role=USER" className="bg-white text-primary-700 font-bold px-8 py-4 rounded-xl hover:bg-gray-100 transition-colors">
              Hire a Professional
            </Link>
            <Link to="/register?role=PROVIDER" className="border-2 border-white text-white font-bold px-8 py-4 rounded-xl hover:bg-white/10 transition-colors">
              Become a Provider
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
