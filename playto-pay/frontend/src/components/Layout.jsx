import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Send, FileText, Wallet, LogOut, User, Building2, AlertTriangle, ShieldCheck, BarChart2, Settings as SettingsIcon
} from 'lucide-react';
import Modal from './Modal';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = React.useState(false);

  const confirmLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/bank-accounts', icon: <Building2 size={20} />, label: 'Bank Accounts' },
    { to: '/payouts', icon: <Send size={20} />, label: 'Payouts' },
    { to: '/ledger', icon: <FileText size={20} />, label: 'Ledger' },
    { to: '/audit-logs', icon: <ShieldCheck size={20} />, label: 'Audit Logs' },
    { to: '/admin', icon: <BarChart2 size={20} />, label: 'Admin Analytics' },
    { to: '/settings', icon: <SettingsIcon size={20} />, label: 'Settings' },
  ];

  return (
    <div className="flex min-h-screen bg-fintech-bg text-fintech-text font-inter">
      {/* Sidebar */}
      <aside className="w-72 bg-fintech-card border-r border-fintech-border flex flex-col fixed h-full z-10">
        <div className="p-8 flex items-center gap-3">
          <div className="bg-fintech-primary p-2 rounded-lg">
            <Wallet className="text-black" size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Playto Pay</h1>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 ${isActive
                  ? 'bg-fintech-primary text-black font-bold shadow-lg shadow-fintech-primary/20'
                  : 'text-fintech-muted hover:bg-white/5 hover:text-white'
                }`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-fintech-border space-y-2">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5">
            <div className="w-8 h-8 rounded-full bg-fintech-primary/20 flex items-center justify-center">
              <User size={16} className="text-fintech-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{user?.name || 'Merchant'}</p>
              <p className="text-xs text-fintech-muted truncate">ID: {user?.id}</p>
            </div>
          </div>
          <button
            onClick={() => setIsLogoutModalOpen(true)}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-fintech-danger hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-72 flex flex-col min-h-screen">
        <div className="max-w-6xl mx-auto p-12 flex-1 w-full">
          {children}
        </div>
        <footer className="p-8 text-center border-t border-white/5">
          <p className="text-[10px] text-fintech-muted uppercase tracking-widest">
            With love <a href="https://www.linkedin.com/in/vishal-s-bab6a6301/" target="_blank" rel="noopener noreferrer" className="text-fintech-primary hover:underline font-bold">Vishal S 🤍</a>
          </p>
        </footer>
      </main>

      <Modal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        title="Confirm Logout"
      >
        <div className="text-center space-y-6">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="text-red-500 w-10 h-10" />
          </div>
          <div>
            <h4 className="text-xl font-bold text-white mb-2">Are you sure?</h4>
            <p className="text-fintech-muted text-sm">
              You will need to login again to access your dashboard and payouts.
            </p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setIsLogoutModalOpen(false)}
              className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl transition-all border border-white/10"
            >
              Cancel
            </button>
            <button
              onClick={confirmLogout}
              className="flex-1 py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-red-500/20"
            >
              Logout
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Layout;
