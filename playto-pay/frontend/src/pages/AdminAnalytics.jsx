import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { BarChart2, Users, Zap, AlertTriangle, TrendingUp } from 'lucide-react';

const formatPaise = (paise) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format((paise || 0) / 100);
};

const AdminAnalytics = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: async () => {
      const res = await api.get('/admin-analytics/');
      return res.data;
    }
  });

  if (isLoading) return <div className="animate-pulse space-y-8">
    <div className="h-10 w-48 bg-white/5 rounded-lg" />
    <div className="grid grid-cols-4 gap-6">
      {[1,2,3,4].map(i => <div key={i} className="h-32 bg-white/5 rounded-2xl" />)}
    </div>
  </div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h2 className="text-3xl font-bold">Platform Analytics</h2>
        <p className="text-fintech-muted">High-level overview of Playto Pay network performance.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="p-6 rounded-3xl bg-fintech-card border border-fintech-border">
          <div className="flex items-center gap-3 text-fintech-primary mb-2">
            <TrendingUp size={18} />
            <span className="text-xs font-bold uppercase tracking-wider">Total Volume</span>
          </div>
          <p className="text-3xl font-bold">{formatPaise(stats.total_volume_paise)}</p>
        </div>

        <div className="p-6 rounded-3xl bg-fintech-card border border-fintech-border">
          <div className="flex items-center gap-3 text-blue-500 mb-2">
            <Zap size={18} />
            <span className="text-xs font-bold uppercase tracking-wider">Total Payouts</span>
          </div>
          <p className="text-3xl font-bold">{stats.total_payouts}</p>
        </div>

        <div className="p-6 rounded-3xl bg-fintech-card border border-fintech-border">
          <div className="flex items-center gap-3 text-emerald-500 mb-2">
            <BarChart2 size={18} />
            <span className="text-xs font-bold uppercase tracking-wider">Success Rate</span>
          </div>
          <p className="text-3xl font-bold">{stats.success_rate.toFixed(1)}%</p>
        </div>

        <div className="p-6 rounded-3xl bg-fintech-card border border-fintech-border">
          <div className="flex items-center gap-3 text-purple-500 mb-2">
            <Users size={18} />
            <span className="text-xs font-bold uppercase tracking-wider">Merchants</span>
          </div>
          <p className="text-3xl font-bold">{stats.active_merchants}</p>
        </div>
      </div>

      <div className="bg-fintech-card rounded-3xl border border-fintech-border overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h3 className="font-bold">Recent Network Activity</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase text-fintech-muted font-bold">
                <th className="px-8 py-4">Merchant</th>
                <th className="px-8 py-4">Amount</th>
                <th className="px-8 py-4">Status</th>
                <th className="px-8 py-4">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {stats.recent_payouts.map(p => (
                <tr key={p.id} className="text-sm">
                  <td className="px-8 py-4 font-medium">{p.merchant__name}</td>
                  <td className="px-8 py-4 font-bold">{formatPaise(p.amount_paise)}</td>
                  <td className="px-8 py-4">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                      p.status === 'completed' ? 'text-emerald-500 bg-emerald-500/10' :
                      p.status === 'failed' ? 'text-red-500 bg-red-500/10' :
                      'text-blue-500 bg-blue-500/10'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-8 py-4 text-fintech-muted text-xs">
                    {new Date(p.created_at).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
