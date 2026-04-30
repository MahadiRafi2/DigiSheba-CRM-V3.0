import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useBrandingStore } from './store/brandingStore';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Sales from './pages/Sales';
import Renewals from './pages/Renewals';
import WooCommerce from './pages/WooCommerce';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import EmailCampaign from './pages/EmailCampaign';
import Landing from './pages/Landing';
import TrackOrder from './pages/TrackOrder';
import Login from './pages/Login';
import Register from './pages/Register';
import CanvaRenewal from './pages/CanvaRenewal';
import AdminCanvaRenewal from './pages/AdminCanvaRenewal';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore(state => state.token);
  if (!token) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  const { fetchBranding } = useBrandingStore();

  React.useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/track" element={<TrackOrder />} />
        <Route path="/canva-renewal" element={<CanvaRenewal />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        <Route path="/admin" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
        <Route path="/sales" element={<ProtectedRoute><Sales /></ProtectedRoute>} />
        <Route path="/renewals" element={<ProtectedRoute><Renewals /></ProtectedRoute>} />
        <Route path="/woocommerce" element={<ProtectedRoute><WooCommerce /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/email-campaign" element={<ProtectedRoute><EmailCampaign /></ProtectedRoute>} />
        <Route path="/admin/canva-renewal" element={<ProtectedRoute><AdminCanvaRenewal /></ProtectedRoute>} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
