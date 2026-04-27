import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FileText, ArrowUpRight, ArrowDownLeft, RefreshCcw, Lock, Unlock, Hash, Download } from 'lucide-react';
import { downloadServerFile } from '../utils/export';

const formatPaise = (paise) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format((paise || 0) / 100);
};

const Ledger = () => {
  const { user } = useAuth();
  
  const { data: entries, isLoading } = useQuery({
    queryKey: ['ledger'],
    queryFn: async () => {
      const res = await api.get('/ledger/');
      return res.data;
    },
    refetchInterval: 5000,
  });

  const getTypeStyles = (type) => {
    switch (type) {
      case 'CREDIT': return { icon: <ArrowDownLeft className="text-emerald-500" />, bg: 'bg-emerald-500/10 text-emerald-500', label: 'Credit Received' };
      case 'DEBIT': return { icon: <ArrowUpRight className="text-red-500" />, bg: 'bg-red-500/10 text-red-500', label: 'Debit Sent' };
      case 'HOLD': return { icon: <Lock className="text-blue-500" />, bg: 'bg-blue-500/10 text-blue-500', label: 'Balance Hold' };
      case 'RELEASE': return { icon: <Unlock className="text-orange-500" />, bg: 'bg-orange-500/10 text-orange-500', label: 'Hold Release' };
      case 'REFUND': return { icon: <RefreshCcw className="text-purple-500" />, bg: 'bg-purple-500/10 text-purple-500', label: 'Refund Restored' };
      default: return { icon: <Hash className="text-fintech-muted" />, bg: 'bg-white/5 text-fintech-muted', label: type };
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Audit Ledger</h2>
          <p className="text-fintech-muted">Complete immutable record of all balance movements.</p>
        </div>
        <button 
          onClick={() => downloadServerFile('/export/ledger/', 'ledger', 'csv')}
          className="flex items-center gap-2 px-6 py-3 bg-fintech-primary text-black font-bold rounded-2xl hover:bg-fintech-primary/90 transition-all shadow-lg shadow-fintech-primary/20"
        >
          <Download size={18} />
          Export CSV
        </button>
      </header>

      <div className="bg-fintech-card rounded-3xl border border-fintech-border overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-fintech-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
              <FileText className="text-fintech-muted w-5 h-5" />
            </div>
            <h3 className="text-xl font-bold">Transaction Audit Trail</h3>
          </div>
          <div className="text-[10px] text-fintech-muted font-bold uppercase tracking-widest bg-white/5 px-3 py-1.5 rounded-lg border border-fintech-border">
            {entries?.length || 0} Total Entries
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-fintech-bg text-fintech-muted text-[10px] uppercase tracking-widest">
                <th className="px-8 py-5 font-bold">Transaction Type</th>
                <th className="px-8 py-5 font-bold">Amount</th>
                <th className="px-8 py-5 font-bold">Reference ID</th>
                <th className="px-8 py-5 font-bold">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-fintech-border/50">
              {isLoading ? (
                [1,2,3,4].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan="4" className="px-8 py-6 h-16"><div className="bg-white/5 rounded w-full h-full"/></td>
                  </tr>
                ))
              ) : entries?.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-8 py-32 text-center">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-fintech-border">
                      <FileText className="text-fintech-muted w-10 h-10 opacity-20" />
                    </div>
                    <p className="text-xl font-bold">Empty Ledger</p>
                    <p className="text-sm text-fintech-muted max-w-xs mx-auto mt-2">
                      When you process your first transaction, the audit trail will appear here.
                    </p>
                  </td>
                </tr>
              ) : entries?.map((entry) => {
                const styles = getTypeStyles(entry.type);
                return (
                  <tr key={entry.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border border-current opacity-20 group-hover:opacity-100 transition-opacity`}>
                          {styles.icon}
                        </div>
                        <div>
                          <p className="text-sm font-bold uppercase tracking-wide">{styles.label}</p>
                          <p className="text-[10px] text-fintech-muted font-bold">ID: {entry.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className={`text-lg font-bold ${['CREDIT', 'RELEASE', 'REFUND'].includes(entry.type) ? 'text-emerald-500' : 'text-fintech-accent'}`}>
                        {['CREDIT', 'RELEASE', 'REFUND'].includes(entry.type) ? '+' : '-'}{formatPaise(entry.amount_paise)}
                      </p>
                    </td>
                    <td className="px-8 py-6">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-fintech-border rounded-lg">
                        <span className="text-[10px] font-mono text-fintech-muted truncate max-w-[120px]">{entry.reference_id}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm font-medium">{new Date(entry.created_at).toLocaleDateString()}</p>
                      <p className="text-[10px] text-fintech-muted">{new Date(entry.created_at).toLocaleTimeString()}</p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Ledger;
