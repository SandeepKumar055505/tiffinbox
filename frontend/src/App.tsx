import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from './context/AuthContext';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import ErrorBoundary from './components/shared/ErrorBoundary';

const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage'));

// User interface animations
const pageVariants = {
  initial: { opacity: 0, x: 20, filter: 'blur(8px)' },
  animate: { opacity: 1, x: 0, filter: 'blur(0px)', transition: { duration: 0.4, ease: [0.32, 0.72, 0, 1] as any } },
  exit: { opacity: 0, x: -20, filter: 'blur(8px)', transition: { duration: 0.3 } }
};

// User pages
const LoginPage = React.lazy(() => import('./pages/auth/LoginPage'));
const InvitePage = React.lazy(() => import('./pages/auth/InvitePage'));
const DashboardPage = React.lazy(() => import('./pages/user/DashboardPage'));
const SubscribePage = React.lazy(() => import('./pages/user/SubscribePage'));
const SubscriptionDetailPage = React.lazy(() => import('./pages/user/SubscriptionDetailPage'));
const SubscriptionsPage = React.lazy(() => import('./pages/user/SubscriptionsPage'));
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
const AdminLogisticsPage = React.lazy(() => import('./pages/admin/AdminLogisticsPage'));
const AdminSubscriptionsPage = React.lazy(() => import('./pages/admin/AdminSubscriptionsPage'));
const AdminSkipPage = React.lazy(() => import('./pages/admin/AdminSkipPage'));
const AdminMenuPage = React.lazy(() => import('./pages/admin/AdminMenuPage'));
const AdminSupportPage = React.lazy(() => import('./pages/admin/AdminSupportPage'));
const AdminSettingsPage = React.lazy(() => import('./pages/admin/AdminSettingsPage'));
const AdminHolidaysPage = React.lazy(() => import('./pages/admin/AdminHolidaysPage'));
const AdminAreaPage = React.lazy(() => import('./pages/admin/AdminAreaPage'));
const AdminLedgerPage = React.lazy(() => import('./pages/admin/AdminLedgerPage'));
const AdminReferralPage = React.lazy(() => import('./pages/admin/AdminReferralPage'));
const AdminNotificationPage = React.lazy(() => import('./pages/admin/AdminNotificationPage'));
const AdminUsersPage = React.lazy(() => import('./pages/admin/AdminUsersPage'));
const AdminUserDetailPage = React.lazy(() => import('./pages/admin/AdminUserDetailPage'));
const PhoneVerificationPage = React.lazy(() => import('./pages/auth/PhoneVerificationPage'));
const LandingPage = React.lazy(() => import('./pages/portal/LandingPage'));

import GlassLayout from './components/shared/GlassLayout';
import UserLayout from './components/user/UserLayout';
import ScrollToTop from './components/shared/ScrollToTop';

const Loader = () => (
  <div className="min-h-screen flex items-center justify-center text-secondary text-sm">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
      <span className="font-medium animate-pulse text-accent">Gourmet Experience Loading…</span>
    </div>
  </div>
);

function RequireUser({ children }: { children: React.ReactNode }) {
  const { user, loading, needsOnboarding } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  if (needsOnboarding && window.location.pathname !== '/onboarding/phone') {
    return <Navigate to="/onboarding/phone" replace />;
  }
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { admin, loading } = useAdminAuth();
  const location = useLocation();
  if (loading) return <Loader />;
  if (!admin) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

export default function App() {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <AdminAuthProvider>
      <ErrorBoundary>
        <React.Suspense fallback={<Loader />}>
          <ScrollToTop />
          <GlassLayout>
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname.split('/')[1]} // Group animations by top-level route
                initial="initial"
                animate="animate"
                exit="exit"
                variants={pageVariants}
                className="w-full h-full"
              >
                <Routes location={location}>
                  {/* Public/Auth routes */}
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/invite/:code" element={<InvitePage />} />
                  <Route path="/onboarding/phone" element={<RequireUser><PhoneVerificationPage /></RequireUser>} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/terms" element={<TermsOfService />} />
                  <Route path="/refund" element={<RefundPolicy />} />
                  <Route path="/shipping" element={<ShippingPolicy />} />
                  <Route path="/contact" element={<ContactUs />} />

                  <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <LandingPage />} />

                  {/* User routes — Wrapped in UserLayout */}
                  <Route element={<RequireUser><UserLayout /></RequireUser>}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/subscribe" element={<SubscribePage />} />
                    <Route path="/subscriptions" element={<SubscriptionsPage />} />
                    <Route path="/subscriptions/:id" element={<SubscriptionDetailPage />} />
                    <Route path="/wallet" element={<WalletPage />} />
                    <Route path="/support" element={<SupportPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                  </Route>

                  {/* Admin routes */}
                  <Route path="/admin/login" element={<AdminLoginPage />} />
                  <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
                    <Route index element={<AdminDashboardPage />} />
                    <Route path="delivery" element={<AdminLogisticsPage />} />
                    <Route path="subscriptions" element={<AdminSubscriptionsPage />} />
                    <Route path="menu" element={<AdminMenuPage />} />
                    <Route path="support" element={<AdminSupportPage />} />
                    <Route path="settings" element={<AdminSettingsPage />} />
                    <Route path="holidays" element={<AdminHolidaysPage />} />
                    <Route path="areas" element={<AdminAreaPage />} />
                    <Route path="ledger" element={<AdminLedgerPage />} />
                    <Route path="referrals" element={<AdminReferralPage />} />
                    <Route path="notifications" element={<AdminNotificationPage />} />
                    <Route path="skip" element={<AdminSkipPage />} />
                    <Route path="users" element={<AdminUsersPage />} />
                    <Route path="users/:id" element={<AdminUserDetailPage />} />
                  </Route>

                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </motion.div>
            </AnimatePresence>
          </GlassLayout>
        </React.Suspense>
      </ErrorBoundary>
    </AdminAuthProvider>
  );
}
