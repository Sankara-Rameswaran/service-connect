import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { register, clearError } from '../../store/authSlice';
import { toast } from 'react-toastify';

export default function RegisterPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { loading, error, user } = useSelector((s) => s.auth);
  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '',
    role: params.get('role') || 'USER',
  });

  useEffect(() => {
    if (user) {
      const path = user.role === 'PROVIDER' ? '/provider' : '/dashboard';
      navigate(path, { replace: true });
    }
  }, [user]);

  useEffect(() => { if (error) toast.error(error); }, [error]);
  useEffect(() => { return () => dispatch(clearError()); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    dispatch(register(form));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="card p-8 animate-slide-up">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-6">
              <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold">H</span>
              </div>
              <span className="font-bold text-2xl text-gray-900 dark:text-white">ServiceConnect</span>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create account</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Join ServiceConnect today</p>
          </div>

          {/* Role toggle */}
          <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 mb-6">
            {['USER', 'PROVIDER'].map((r) => (
              <button key={r} type="button"
                onClick={() => setForm({ ...form, role: r })}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                  form.role === r ? 'bg-white dark:bg-gray-700 text-primary-700 dark:text-primary-300 shadow' : 'text-gray-600 dark:text-gray-400'
                }`}>
                {r === 'USER' ? '🏠 Homeowner' : '🛠️ Provider'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { name: 'name', label: 'Full Name', type: 'text', placeholder: 'John Doe' },
              { name: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com' },
              { name: 'phone', label: 'Phone (optional)', type: 'tel', placeholder: '+1 234 567 8900' },
              { name: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
            ].map((field) => (
              <div key={field.name}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{field.label}</label>
                <input type={field.type} required={field.name !== 'phone'} className="input"
                  placeholder={field.placeholder}
                  value={form[field.name]}
                  onChange={(e) => setForm({ ...form, [field.name]: e.target.value })} />
              </div>
            ))}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Creating account...' : `Create ${form.role === 'PROVIDER' ? 'Provider' : 'User'} Account`}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
