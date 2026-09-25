import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RealtimeProvider } from './context/RealtimeContext';
import { ToastProvider } from './context/ToastContext';
import { PublicLayout } from './layouts/PublicLayout';
import { AuthenticatedLayout } from './layouts/AuthenticatedLayout';
import { AdaptiveDiscoveryLayout } from './layouts/AdaptiveDiscoveryLayout';

// Public Marketing & Discovery Pages
import { LandingPage } from './pages/public/LandingPage';
import { BrowseHardwarePage } from './pages/public/BrowseHardwarePage';
import { HardwareDetailPage } from './pages/public/HardwareDetailPage';
import { CatalogCategoriesPage } from './pages/public/CatalogCategoriesPage';
import { HowItWorksPage } from './pages/public/HowItWorksPage';
import { AboutPage } from './pages/public/AboutPage';
import { FaqPage } from './pages/public/FaqPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';

// Authenticated Student Workspace Pages
import { DashboardPage } from './pages/student/DashboardPage';
import { RentalsPage } from './pages/student/RentalsPage';
import { RentalDetailPage } from './pages/student/RentalDetailPage';
import { MyHardwarePage } from './pages/student/MyHardwarePage';
import { MyListingsPage } from './pages/student/MyListingsPage';
import { WalletPage } from './pages/student/WalletPage';
import { DisputesPage } from './pages/student/DisputesPage';
import { WaitlistPage } from './pages/student/WaitlistPage';
import { ProfilePage } from './pages/student/ProfilePage';

// Moderator Protected Pages
import { DisputesQueuePage } from './pages/moderator/DisputesQueuePage';
import { DamageQueuePage } from './pages/moderator/DamageQueuePage';

// Administrator Protected Pages
import { AnalyticsPage } from './pages/admin/AnalyticsPage';
import { UserDirectoryPage } from './pages/admin/UserDirectoryPage';
import { AuditTrailPage } from './pages/admin/AuditTrailPage';

// Internal Evaluation Route (Unlinked)
import { SqlProofPage } from './pages/internal/SqlProofPage';

const queryClient = new QueryClient();

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRoles?: string[] }> = ({
  children,
  requiredRoles,
}) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center text-xs font-mono text-slate-400">
        Authenticating session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRoles && !user.roles.some((r) => requiredRoles.includes(r))) {
    return (
      <div className="p-8 text-center text-xs text-red-600 bg-red-50 rounded border border-red-200">
        Access Restricted: You do not hold the required role ({requiredRoles.join(', ')}).
      </div>
    );
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RealtimeProvider>
          <ToastProvider>
            <BrowserRouter>
            <Routes>
              {/* 1. PUBLIC MARKETING & AUTH ROUTES — Unauthenticated Public Shell without Sidebar */}
              <Route element={<PublicLayout />}>
                <Route path="/" element={<LandingPage />} />
                <Route path="/how-it-works" element={<HowItWorksPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/faq" element={<FaqPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
              </Route>

              {/* 2. DISCOVERY & CATALOG ROUTES — Adaptive: Authenticated Dashboard Shell for signed-in users, Public Shell for guests */}
              <Route element={<AdaptiveDiscoveryLayout />}>
                <Route path="/browse" element={<BrowseHardwarePage />} />
                <Route path="/categories" element={<CatalogCategoriesPage />} />
                <Route path="/listings/:id" element={<HardwareDetailPage />} />
              </Route>

              {/* 3. AUTHENTICATED OPERATIONAL SHELL — Rendered with Fixed Sidebar & Telemetry */}
              <Route element={<AuthenticatedLayout />}>
                {/* Student Workspace */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/rentals"
                  element={
                    <ProtectedRoute>
                      <RentalsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/rentals/:id"
                  element={
                    <ProtectedRoute>
                      <RentalDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/inventory"
                  element={
                    <ProtectedRoute>
                      <MyHardwarePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/listings"
                  element={
                    <ProtectedRoute>
                      <MyListingsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/wallet"
                  element={
                    <ProtectedRoute>
                      <WalletPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/disputes"
                  element={
                    <ProtectedRoute>
                      <DisputesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/waitlist"
                  element={
                    <ProtectedRoute>
                      <WaitlistPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={<Navigate to="/profile" replace />}
                />

                {/* Moderator Routes */}
                <Route
                  path="/moderator/disputes"
                  element={
                    <ProtectedRoute requiredRoles={['MODERATOR', 'ADMIN']}>
                      <DisputesQueuePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/moderator/damage"
                  element={
                    <ProtectedRoute requiredRoles={['MODERATOR', 'ADMIN']}>
                      <DamageQueuePage />
                    </ProtectedRoute>
                  }
                />

                {/* Administrator Routes */}
                <Route
                  path="/admin/analytics"
                  element={
                    <ProtectedRoute requiredRoles={['ADMIN']}>
                      <AnalyticsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/users"
                  element={
                    <ProtectedRoute requiredRoles={['ADMIN']}>
                      <UserDirectoryPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/audit"
                  element={
                    <ProtectedRoute requiredRoles={['ADMIN']}>
                      <AuditTrailPage />
                    </ProtectedRoute>
                  }
                />

                {/* Internal Unlinked SQL Diagnostic Verification Route */}
                <Route
                  path="/internal/sql-proof"
                  element={
                    <ProtectedRoute requiredRoles={['ADMIN']}>
                      <SqlProofPage />
                    </ProtectedRoute>
                  }
                />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </RealtimeProvider>
    </AuthProvider>
  </QueryClientProvider>
  );
};

export default App;
