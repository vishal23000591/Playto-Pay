import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Settings as SettingsIcon, Globe, Shield, Bell, Copy, Check } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const Settings = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [webhookUrl, setWebhookUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const { data: endpoints, isLoading } = useQuery({
    queryKey: ['webhook-endpoints'],
    queryFn: async () => {
      const res = await api.get('/webhook-endpoints/');
      if (res.data.length > 0) setWebhookUrl(res.data[0].url);
      return res.data;
    }
  });

  const updateWebhook = useMutation({
    mutationFn: (url) => api.post('/webhook-endpoints/', { url }),
    onSuccess: () => {
      queryClient.invalidateQueries(['webhook-endpoints']);
      showToast('Settings saved successfully', 'success');
    }
  });

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast('Secret copied to clipboard', 'success');
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h2 className="text-3xl font-bold">Developer Settings</h2>
        <p className="text-fintech-muted">Configure webhooks and security preferences.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Webhooks Section */}
        <div className="bg-fintech-card rounded-3xl border border-fintech-border p-8 space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Globe className="text-blue-500" size={20} />
            </div>
            <h3 className="text-xl font-bold">Webhooks</h3>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-fintech-muted uppercase">Endpoint URL</label>
            <input 
              type="url" 
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://your-api.com/webhooks"
              className="w-full bg-fintech-bg border border-fintech-border rounded-xl py-4 px-4 focus:border-fintech-primary outline-none transition-all text-sm"
            />
            <p className="text-[10px] text-fintech-muted">We will send POST requests to this URL for all payout events.</p>
          </div>

          <button 
            onClick={() => updateWebhook.mutate(webhookUrl)}
            disabled={updateWebhook.isLoading}
            className="w-full py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl transition-all border border-white/10"
          >
            {updateWebhook.isLoading ? 'Saving...' : 'Save Webhook Configuration'}
          </button>
        </div>

        {/* Security Section */}
        <div className="bg-fintech-card rounded-3xl border border-fintech-border p-8 space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Shield className="text-purple-500" size={20} />
            </div>
            <h3 className="text-xl font-bold">API Security</h3>
          </div>

          {endpoints?.[0] ? (
            <div className="space-y-4">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <label className="text-[10px] font-bold text-fintech-muted uppercase block mb-2">Webhook Signing Secret</label>
                <div className="flex items-center justify-between gap-4">
                  <code className="text-xs font-mono text-fintech-primary truncate">{endpoints[0].secret}</code>
                  <button 
                    onClick={() => copyToClipboard(endpoints[0].secret)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
              <p className="text-xs text-fintech-muted">Use this secret to verify that webhook requests are genuinely from Playto Pay.</p>
            </div>
          ) : (
            <div className="p-8 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
              <p className="text-sm text-fintech-muted italic">Setup a webhook URL to generate your API secret.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
