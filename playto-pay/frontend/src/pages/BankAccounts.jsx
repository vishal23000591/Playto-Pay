import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import { 
  Plus, CreditCard, Trash2, CheckCircle2, AlertCircle, Loader2, Building2 
} from 'lucide-react';

const BankAccounts = () => {
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();
  const { showToast } = useToast();
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    account_holder: '',
    account_number: '',
    ifsc: '',
    bank_name: '',
    branch_name: '',
    is_default: false
  });

  const { data: accounts, isLoading } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      const res = await api.get('/bank-accounts/');
      return res.data;
    }
  });

  const addMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/bank-accounts/', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      setShowAddModal(false);
      setFormData({ account_holder: '', account_number: '', ifsc: '', bank_name: '', branch_name: '', is_default: false });
      refreshUser();
      showToast('Bank account linked successfully!');
    },
    onError: (err) => showToast(err.response?.data?.error || 'Failed to add account', 'error')
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/bank-accounts/${id}/`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    addMutation.mutate(formData);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Bank Accounts</h2>
          <p className="text-fintech-muted">Manage your registered payout destinations.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-fintech-primary hover:bg-fintech-primary-hover text-black px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-fintech-primary/10"
        >
          <Plus size={20} />
          Add Account
        </button>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-fintech-primary" />
        </div>
      ) : accounts?.length === 0 ? (
        <div className="bg-fintech-card rounded-3xl border border-fintech-border p-20 text-center">
          <div className="w-20 h-20 bg-fintech-bg rounded-full flex items-center justify-center mx-auto mb-6 border border-fintech-border">
            <Building2 className="text-fintech-muted w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold mb-2">No bank accounts linked</h3>
          <p className="text-fintech-muted mb-8 max-w-md mx-auto">
            You need to link at least one bank account to start receiving payouts.
          </p>
          <button 
            onClick={() => setShowAddModal(true)}
            className="text-fintech-primary border border-fintech-primary/20 px-8 py-3 rounded-xl font-bold hover:bg-fintech-primary/5 transition-colors"
          >
            Link Your First Account
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts?.map((account) => (
            <div key={account.id} className="group bg-fintech-card rounded-3xl border border-fintech-border p-6 hover:border-fintech-primary/30 transition-all relative overflow-hidden">
              {account.is_default && (
                <div className="absolute top-4 right-4 bg-fintech-primary/10 text-fintech-primary px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                  <CheckCircle2 size={12} />
                  Default
                </div>
              )}
              
              <div className="w-12 h-12 bg-fintech-bg rounded-2xl flex items-center justify-center mb-6 border border-fintech-border group-hover:bg-fintech-primary/10 transition-colors">
                <CreditCard className="text-fintech-muted group-hover:text-fintech-primary w-6 h-6" />
              </div>

              <h4 className="font-bold text-lg mb-1">{account.bank_name}</h4>
              <p className="text-fintech-muted text-sm mb-4">{account.branch_name || 'Main Branch'}</p>
              
              <div className="space-y-3 pt-4 border-t border-fintech-border/50">
                <div className="flex justify-between">
                  <span className="text-xs text-fintech-muted">Account Holder</span>
                  <span className="text-sm font-medium">{account.account_holder}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-fintech-muted">Account Number</span>
                  <span className="text-sm font-mono font-medium">**** {account.account_number.slice(-4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-fintech-muted">IFSC</span>
                  <span className="text-sm font-mono font-medium">{account.ifsc}</span>
                </div>
              </div>

              <button 
                onClick={() => deleteMutation.mutate(account.id)}
                className="mt-6 w-full flex items-center justify-center gap-2 py-3 rounded-xl text-fintech-danger hover:bg-red-500/10 transition-colors text-sm font-medium"
              >
                <Trash2 size={16} />
                Remove Account
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-fintech-card w-full max-w-lg rounded-3xl border border-fintech-border shadow-2xl p-8 animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-bold mb-6">Link Bank Account</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-fintech-muted mb-2 uppercase tracking-wider">Account Holder Name</label>
                  <input
                    type="text"
                    value={formData.account_holder}
                    onChange={(e) => setFormData({...formData, account_holder: e.target.value})}
                    placeholder="Full name as per bank"
                    className="w-full bg-fintech-bg border border-fintech-border rounded-xl py-3 px-4 focus:border-fintech-primary outline-none transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-fintech-muted mb-2 uppercase tracking-wider">Bank Name</label>
                  <input
                    type="text"
                    value={formData.bank_name}
                    onChange={(e) => setFormData({...formData, bank_name: e.target.value})}
                    placeholder="e.g. HDFC Bank"
                    className="w-full bg-fintech-bg border border-fintech-border rounded-xl py-3 px-4 focus:border-fintech-primary outline-none transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-fintech-muted mb-2 uppercase tracking-wider">IFSC Code</label>
                  <input
                    type="text"
                    value={formData.ifsc}
                    onChange={(e) => setFormData({...formData, ifsc: e.target.value.toUpperCase()})}
                    placeholder="HDFC0001234"
                    className="w-full bg-fintech-bg border border-fintech-border rounded-xl py-3 px-4 focus:border-fintech-primary outline-none transition-colors font-mono"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-fintech-muted mb-2 uppercase tracking-wider">Account Number</label>
                  <input
                    type="text"
                    value={formData.account_number}
                    onChange={(e) => setFormData({...formData, account_number: e.target.value})}
                    placeholder="Enter full account number"
                    className="w-full bg-fintech-bg border border-fintech-border rounded-xl py-3 px-4 focus:border-fintech-primary outline-none transition-colors font-mono"
                    required
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-3 py-2">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={formData.is_default}
                  onChange={(e) => setFormData({...formData, is_default: e.target.checked})}
                  className="w-5 h-5 rounded border-fintech-border bg-fintech-bg text-fintech-primary focus:ring-fintech-primary"
                />
                <label htmlFor="is_default" className="text-sm text-fintech-muted">Set as default payout account</label>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-6 py-4 rounded-xl border border-fintech-border hover:bg-white/5 transition-colors font-bold"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={addMutation.isLoading}
                  className="flex-1 bg-fintech-primary hover:bg-fintech-primary-hover text-black px-6 py-4 rounded-xl font-bold disabled:opacity-50 transition-all"
                >
                  {addMutation.isLoading ? <Loader2 className="animate-spin mx-auto" /> : 'Confirm & Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankAccounts;
