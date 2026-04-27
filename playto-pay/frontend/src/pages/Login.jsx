import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Wallet, Loader2, AlertCircle } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials. Try founder@playto.com / password123');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-fintech-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="inline-flex w-16 h-16 bg-fintech-primary rounded-2xl items-center justify-center mb-6">
            <Wallet className="text-black w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Playto Pay</h1>
          <p className="text-fintech-muted mt-2 text-lg">Merchant Payout Engine</p>
        </div>

        <div className="bg-fintech-card p-8 rounded-3xl border border-fintech-border shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-fintech-muted mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="founder@playto.com"
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
                placeholder="••••••••"
                className="w-full bg-fintech-bg border border-fintech-border rounded-xl py-3 px-4 focus:outline-none focus:border-fintech-primary transition-colors"
                required
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
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Login to Dashboard'}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-fintech-border text-center">
            <p className="text-sm text-fintech-muted mb-4">
              Don't have an account?{' '}
              <Link to="/signup" className="text-fintech-primary hover:underline font-bold">
                Sign up
              </Link>
            </p>
            <p className="text-xs text-fintech-muted">
              Hint: Use seed data to initialize credentials.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
