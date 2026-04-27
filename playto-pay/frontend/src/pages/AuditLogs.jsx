import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { Shield, Search, Filter, Clock, User } from 'lucide-react';

const AuditLogs = () => {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const res = await api.get('/audit-logs/');
      return res.data;
    }
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Audit Logs</h2>
          <p className="text-fintech-muted">Complete trail of all sensitive activities on your account.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-fintech-muted" size={16} />
            <input 
              type="text" 
              placeholder="Search logs..." 
              className="bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 outline-none focus:border-fintech-primary text-sm transition-all"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-sm font-medium">
            <Filter size={16} />
            Filter
          </button>
        </div>
      </header>

      <div className="bg-fintech-card rounded-3xl border border-fintech-border overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-fintech-bg text-fintech-muted text-[10px] uppercase tracking-widest font-bold">
                <th className="px-8 py-5">Timestamp</th>
                <th className="px-8 py-5">Action</th>
                <th className="px-8 py-5">Resource</th>
                <th className="px-8 py-5">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-fintech-border/50">
              {isLoading ? (
                [1,2,3,4,5].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan="4" className="px-8 py-6 h-16"><div className="bg-white/5 rounded w-full h-full"/></td>
                  </tr>
                ))
              ) : logs?.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-8 py-20 text-center">
                    <Shield className="text-fintech-muted w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-bold">No logs recorded</p>
                    <p className="text-sm text-fintech-muted">Activity logs will appear here as they occur.</p>
                  </td>
                </tr>
              ) : logs?.map((log) => (
                <tr key={log.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-xs text-fintech-muted mb-1">
                      <Clock size={12} />
                      {new Date(log.created_at).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                      log.action.includes('FAIL') ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                      log.action.includes('COMPLETE') ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                      'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                    }`}>
                      {log.action.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-sm font-medium">
                    {log.resource_type}
                    {log.resource_id && <span className="text-xs text-fintech-muted block font-mono">#{log.resource_id.substring(0, 8)}</span>}
                  </td>
                  <td className="px-8 py-6 text-sm text-fintech-muted">
                    {log.description}
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

export default AuditLogs;
