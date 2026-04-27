import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Payouts from './pages/Payouts';
import Ledger from './pages/Ledger';
import Login from './pages/Login';
import Signup from './pages/Signup';
import BankAccounts from './pages/BankAccounts';
import AuditLogs from './pages/AuditLogs';
import AdminAnalytics from './pages/AdminAnalytics';
import Settings from './pages/Settings';

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return (
    <div className="min-h-screen bg-fintech-bg flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-fintech-primary border-t-transparent" />
    </div>
  );
  
  if (!user) return <Navigate to="/login" replace />;
  
  return <Layout>{children}</Layout>;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            
            <Route path="/dashboard" element={
              <ProtectedRoute><Dashboard /></ProtectedRoute>
            } />
            <Route path="/bank-accounts" element={
              <ProtectedRoute><BankAccounts /></ProtectedRoute>
            } />
            <Route path="/payouts" element={
              <ProtectedRoute><Payouts /></ProtectedRoute>
            } />
            <Route path="/ledger" element={
              <ProtectedRoute><Ledger /></ProtectedRoute>
            } />
            <Route path="/audit-logs" element={
              <ProtectedRoute><AuditLogs /></ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute><AdminAnalytics /></ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute><Settings /></ProtectedRoute>
            } />
            
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
