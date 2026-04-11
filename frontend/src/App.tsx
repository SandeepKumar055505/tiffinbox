import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import ErrorBoundary from './components/shared/ErrorBoundary';

const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage'));

// User pages
const LoginPage = React.lazy(() => import('./pages/auth/LoginPage'));
const InvitePage = React.lazy(() => import('./pages/auth/InvitePage'));
const DashboardPage = React.lazy(() => import('./pages/user/DashboardPage'));
const SubscribePage = React.lazy(() => import('./pages/user/SubscribePage'));
const SubscriptionDetailPage = React.lazy(() => import('./pages/user/SubscriptionDetailPage'));
const WalletPage = React.lazy(() => import('./pages/user/WalletPage'));
const SupportPage = React.lazy(() => import('./pages/user/SupportPage'));
const ProfilePage = React.lazy(() => import('./pages/user/ProfilePage'));

// Legal pages
const PrivacyPolicy = React.lazy(() => import('./pages/legal/PrivacyPolicy'));
const TermsOfService = React.lazy(() => import('./pages/legal/TermsOfService'));
const RefundPolicy = React.lazy(() => import('./pages/legal/RefundPolicy'));
const ShippingPolicy = React.lazy(() => import('./pages/legal/ShippingPolicy'));
const ContactUs = React.lazy(() => import('./pages/legal/ContactUs'));

// Admin pages
const AdminLoginPage = React.lazy(() => import('./pages/admin/AdminLoginPage'));
const AdminLayout = React.lazy(() => import('./pages/admin/AdminLayout'));
const AdminDashboardPage = React.lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminDeliveryPage = React.lazy(() => import('./pages/admin/AdminDeliveryPage'));
const AdminSubscriptionsPage = React.lazy(() => import('./pages/admin/AdminSubscriptionsPage'));
const AdminSkipPage = React.lazy(() => import('./pages/admin/AdminSkipPage'));
const AdminMenuPage = React.lazy(() => import('./pages/admin/AdminMenuPage'));
const AdminSupportPage = React.lazy(() => import('./pages/admin/AdminSupportPage'));
const AdminSettingsPage = React.lazy(() => import('./pages/admin/AdminSettingsPage'));
const AdminHolidaysPage = React.lazy(() => import('./pages/admin/AdminHolidaysPage'));
const AdminLedgerPage = React.lazy(() => import('./pages/admin/AdminLedgerPage'));
const AdminReferralPage = React.lazy(() => import('./pages/admin/AdminReferralPage'));

import GlassLayout from './components/shared/GlassLayout';
import UserLayout from './components/user/UserLayout';

const Loader = () => (
  <div className="min-h-screen flex items-center justify-center text-secondary text-sm">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
      <span className="font-medium animate-pulse">Brewing Freshness…</span>
    </div>
  </div>
);

function RequireUser({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { admin, loading } = useAdminAuth();
  if (loading) return <Loader />;
  if (!admin) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AdminAuthProvider>
      <ErrorBoundary>
      <React.Suspense fallback={<Loader />}>
        <GlassLayout>
          <Routes>
            {/* Public/Auth routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/invite/:code" element={<InvitePage />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/refund" element={<RefundPolicy />} />
            <Route path="/shipping" element={<ShippingPolicy />} />
            <Route path="/contact" element={<ContactUs />} />
            
            {/* User routes — Wrapped in UserLayout */}
            <Route element={<RequireUser><UserLayout /></RequireUser>}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/subscribe" element={<SubscribePage />} />
              <Route path="/subscriptions/:id" element={<SubscriptionDetailPage />} />
              <Route path="/wallet" element={<WalletPage />} />
              <Route path="/support" element={<SupportPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>

            {/* Admin routes */}
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="delivery" element={<AdminDeliveryPage />} />
              <Route path="subscriptions" element={<AdminSubscriptionsPage />} />
              <Route path="skip" element={<AdminSkipPage />} />
              <Route path="menu" element={<AdminMenuPage />} />
              <Route path="support" element={<AdminSupportPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
              <Route path="holidays" element={<AdminHolidaysPage />} />
              <Route path="ledger" element={<AdminLedgerPage />} />
              <Route path="referrals" element={<AdminReferralPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </GlassLayout>
      </React.Suspense>
      </ErrorBoundary>
    </AdminAuthProvider>
  );
}
