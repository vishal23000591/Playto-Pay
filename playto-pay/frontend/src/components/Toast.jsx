import React, { useEffect } from 'react';
import { CheckCircle2, XCircle, AlertCircle, X } from 'lucide-react';

const Toast = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const styles = {
    success: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      text: 'text-emerald-500',
      icon: <CheckCircle2 size={18} />
    },
    error: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      text: 'text-red-500',
      icon: <XCircle size={18} />
    },
    info: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      text: 'text-blue-500',
      icon: <AlertCircle size={18} />
    }
  };

  const current = styles[type] || styles.success;

  return (
    <div className={`fixed bottom-8 right-8 z-[100] animate-in slide-in-from-right-full duration-300`}>
      <div className={`flex items-center gap-4 px-6 py-4 rounded-2xl border ${current.bg} ${current.border} shadow-2xl backdrop-blur-md`}>
        <div className={current.text}>{current.icon}</div>
        <p className="text-sm font-bold text-white pr-4">{message}</p>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-white/10 rounded-lg transition-colors text-fintech-muted hover:text-white"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default Toast;
