import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Send, History, Plus, Loader2, CheckCircle2, XCircle, Clock, ExternalLink, ChevronDown, Building2, Download, Calendar, FileDown 
} from 'lucide-react';
import { downloadServerFile } from '../utils/export';

const formatPaise = (paise) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format((paise || 0) / 100);
};

const Payouts = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [selectedBankId, setSelectedBankId] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user?.bank_accounts?.length > 0 && !selectedBankId) {
      const defaultBank = user.bank_accounts.find(b => b.is_default) || user.bank_accounts[0];
      setSelectedBankId(defaultBank.id.toString());
    }
  }, [user, selectedBankId]);

  const { data: payouts, isLoading: isLoadingPayouts } = useQuery({
    queryKey: ['payouts'],
    queryFn: async () => {
      const res = await api.get('/payouts/');
      return res.data;
    },
    refetchInterval: 5000,
  });

  const payoutMutation = useMutation({
    mutationFn: (data) => api.post('/payouts/', data),
    onSuccess: () => {
      showToast('Payout initiated successfully', 'success');
      setAmount('');
      setScheduledAt('');
      queryClient.invalidateQueries(['payouts']);
      queryClient.invalidateQueries(['dashboard']);
    },
    onError: (err) => {
      showToast(err.response?.data?.error || 'Failed to initiate payout', 'error');
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });

  const handlePayout = (e) => {
    e.preventDefault();
    const amountPaise = parseFloat(amount) * 100;
    
    if (amountPaise < 10000) {
      showToast('Minimum payout is ₹100', 'error');
      return;
    }

    if (amountPaise > user.available_balance_paise) {
      showToast('Insufficient available balance', 'error');
      return;
    }

    setIsSubmitting(true);
    payoutMutation.mutate({
      amount_paise: amountPaise,
      bank_account_id: selectedBankId,
      scheduled_at: scheduledAt || null,
    });
  };

  const selectedBank = user?.bank_accounts?.find(b => b.id.toString() === selectedBankId);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Payouts</h2>
          <p className="text-fintech-muted">Withdraw funds from your Playto wallet to your linked bank account.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Payout Form */}
        <div className="lg:col-span-5 bg-fintech-card rounded-3xl border border-fintech-border p-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-fintech-primary/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-fintech-primary/10 transition-colors" />
          
          <div className="relative">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-fintech-primary/10 flex items-center justify-center">
                <Send className="text-fintech-primary" size={24} />
              </div>
              <h3 className="text-xl font-bold">New Payout</h3>
            </div>

            {user?.bank_accounts?.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building2 className="text-fintech-muted w-8 h-8" />
                </div>
                <p className="text-sm text-fintech-muted mb-6">No bank accounts linked yet.</p>
                <Link 
                  to="/bank-accounts" 
                  className="inline-flex items-center gap-2 bg-fintech-primary text-black px-6 py-3 rounded-xl font-bold transition-all hover:scale-105"
                >
                  <Plus size={18} />
                  Link Account
                </Link>
              </div>
            ) : (
              <form onSubmit={handlePayout} className="space-y-6">
                <div>
                  <label className="block text-xs font-medium text-fintech-muted mb-2 uppercase tracking-wider">Select Destination Bank</label>
                  <div className="relative">
                    <button 
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className={`w-full text-left bg-fintech-bg border ${isDropdownOpen ? 'border-fintech-primary' : 'border-fintech-border'} rounded-xl py-4 px-4 outline-none focus:border-fintech-primary transition-colors flex justify-between items-center font-medium`}
                    >
                      <span>
                        {selectedBank ? `${selectedBank.bank_name} (**** ${selectedBank.account_number.slice(-4)})` : 'Select Bank'}
                      </span>
                      <ChevronDown className={`text-fintech-muted transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} size={18} />
                    </button>
                    
                    {isDropdownOpen && (
                      <div className="absolute z-20 w-full mt-2 bg-fintech-card border border-fintech-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        {user.bank_accounts.map(bank => (
                          <div 
                            key={bank.id} 
                            onClick={() => {
                              setSelectedBankId(bank.id.toString());
                              setIsDropdownOpen(false);
                            }}
                            className={`px-4 py-4 cursor-pointer transition-colors flex items-center gap-3 ${selectedBankId === bank.id.toString() ? 'bg-fintech-primary/10 text-white font-bold' : 'text-fintech-muted hover:bg-white/5 hover:text-white'}`}
                          >
                            <div className="w-5 flex justify-center">
                              {selectedBankId === bank.id.toString() && <CheckCircle2 size={18} className="text-fintech-primary" />}
                            </div>
                            <span>
                              {bank.bank_name} (**** {bank.account_number.slice(-4)})
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-fintech-muted mb-2 uppercase tracking-wider">Amount to Payout (INR)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-fintech-muted font-bold text-lg">₹</span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      min="100"
                      className="w-full bg-fintech-bg border border-fintech-border rounded-2xl py-5 pl-10 pr-4 focus:border-fintech-primary outline-none transition-all text-2xl font-bold"
                      required
                    />
                  </div>
                  <div className="flex justify-between mt-2 px-1">
                    <span className="text-[10px] text-fintech-muted uppercase">Min: ₹100</span>
                    <span className="text-[10px] text-fintech-muted uppercase">Max: {formatPaise(user.available_balance_paise)}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-fintech-muted mb-2 uppercase tracking-wider">Schedule Payout (Optional)</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-fintech-muted pointer-events-none" size={18} />
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      style={{ colorScheme: 'dark' }}
                      className="w-full bg-fintech-bg border border-fintech-border rounded-2xl py-4 pl-12 pr-4 focus:border-fintech-primary outline-none transition-all text-sm font-medium"
                    />
                  </div>
                </div>

                {selectedBank && (
                  <div className="p-4 rounded-2xl bg-fintech-bg border border-fintech-border flex items-center justify-between group cursor-default">
                    <div>
                      <p className="text-[10px] text-fintech-muted uppercase mb-1">Transferring to</p>
                      <p className="text-sm font-bold">{selectedBank.account_holder}</p>
                      <p className="text-xs text-fintech-muted">{selectedBank.bank_name} • {selectedBank.ifsc}</p>
                    </div>
                    <Building2 className="text-white/10 group-hover:text-fintech-primary transition-colors" size={24} />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || !selectedBankId}
                  className="w-full bg-fintech-primary hover:bg-fintech-primary-hover text-black font-bold py-5 rounded-2xl transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-xl shadow-fintech-primary/20 flex items-center justify-center gap-3 text-lg"
                >
                  {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Confirm Payout <Send size={20}/></>}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Payout History */}
        <div className="lg:col-span-7 bg-fintech-card rounded-3xl border border-fintech-border shadow-2xl flex flex-col overflow-hidden">
          <div className="p-8 border-b border-fintech-border flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <History className="text-blue-500" size={20} />
              </div>
              <h3 className="text-xl font-bold">Payout Activity</h3>
            </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => downloadServerFile('/export/payouts/', 'payouts', 'csv')}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-sm font-medium text-fintech-muted hover:text-white"
                >
                  <Download size={16} />
                  Export CSV
                </button>
                <button 
                  onClick={() => downloadServerFile('/export/pdf/', 'PlaytoPay_Statement', 'pdf')}
                  className="flex items-center gap-2 px-4 py-2 bg-fintech-primary text-black rounded-xl hover:bg-fintech-primary/90 transition-all text-sm font-bold shadow-lg shadow-fintech-primary/10"
                >
                  <FileDown size={16} />
                  Export Premium PDF
                </button>
                <div className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-bold uppercase">Live Updates</div>
            </div>
          </div>
          
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-fintech-bg text-fintech-muted text-[10px] uppercase tracking-widest font-bold">
                  <th className="px-8 py-5">Transaction ID</th>
                  <th className="px-8 py-5">Destination</th>
                  <th className="px-8 py-5">Amount</th>
                  <th className="px-8 py-5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-fintech-border/50">
                {isLoadingPayouts ? (
                  [1,2,3,4,5].map(i => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan="4" className="px-8 py-6 h-16"><div className="bg-white/5 rounded w-full h-full"/></td>
                    </tr>
                  ))
                ) : payouts?.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-8 py-32 text-center">
                      <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                        <History className="text-fintech-muted w-10 h-10 opacity-20" />
                      </div>
                      <p className="text-xl font-bold">No history yet</p>
                      <p className="text-sm text-fintech-muted mt-2">Your recent payouts will appear here.</p>
                    </td>
                  </tr>
                ) : payouts?.map((payout) => (
                  <tr key={payout.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-8 py-6">
                      <p className="text-sm font-mono text-fintech-muted group-hover:text-white transition-colors">#{payout.id.substring(0, 8)}</p>
                      <p className="text-[10px] text-fintech-muted mt-1">{new Date(payout.created_at).toLocaleString()}</p>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm font-bold">{payout.bank_account.bank_name}</p>
                      <p className="text-[10px] text-fintech-muted uppercase tracking-wider">**** {payout.bank_account.account_number.slice(-4)}</p>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-lg font-bold">{formatPaise(payout.amount_paise)}</p>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <span className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                          payout.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                          payout.status === 'failed' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                          payout.status === 'processing' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                          'bg-white/5 text-fintech-muted border border-white/10'
                        }`}>
                          {payout.status === 'completed' && <CheckCircle2 size={12} />}
                          {payout.status === 'failed' && <XCircle size={12} />}
                          {payout.status === 'processing' && <Loader2 size={12} className="animate-spin" />}
                          {payout.status === 'pending' && <Clock size={12} />}
                          {payout.status}
                        </span>
                        
                        <a href={`/api/v1/payouts/${payout.id}/receipt/`} target="_blank" rel="noreferrer" className="opacity-0 group-hover:opacity-100 transition-all text-fintech-primary hover:text-white">
                          <ExternalLink size={16} />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payouts;
