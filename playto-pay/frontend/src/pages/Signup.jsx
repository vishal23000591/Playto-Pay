import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Wallet, Loader2, AlertCircle, UserPlus } from 'lucide-react';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [merchantName, setMerchantName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth(); // We can login automatically after signup
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/signup/', {
        email,
        password,
        merchant_name: merchantName
      });
      
      // Store tokens and set user state (mimic login behavior)
      localStorage.setItem('access_token', res.data.access);
      localStorage.setItem('refresh_token', res.data.refresh);
      window.location.href = '/dashboard'; // Hard reload to refresh auth state
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Check your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-fintech-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="inline-flex w-16 h-16 bg-fintech-primary rounded-2xl items-center justify-center mb-6">
            <UserPlus className="text-black w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Create Account</h1>
          <p className="text-fintech-muted mt-2 text-lg">Join the Playto Pay ecosystem</p>
        </div>

        <div className="bg-fintech-card p-8 rounded-3xl border border-fintech-border shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-fintech-muted mb-2">Merchant Name</label>
              <input
                type="text"
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
                placeholder="e.g. Acme Studio"
                className="w-full bg-fintech-bg border border-fintech-border rounded-xl py-3 px-4 focus:outline-none focus:border-fintech-primary transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-fintech-muted mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="hello@company.com"
                className="w-full bg-fintech-bg border border-fintech-border rounded-xl py-3 px-4 focus:outline-none focus:border-fintech-primary transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-fintech-muted mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="w-full bg-fintech-bg border border-fintech-border rounded-xl py-3 px-4 focus:outline-none focus:border-fintech-primary transition-colors"
                required
                minLength={8}
              />
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-fintech-primary hover:bg-fintech-primary-hover text-black font-bold py-4 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Merchant Account'}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-fintech-border text-center">
            <p className="text-sm text-fintech-muted">
              Already have an account?{' '}
              <Link to="/login" className="text-fintech-primary hover:underline font-bold">
                Login here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
