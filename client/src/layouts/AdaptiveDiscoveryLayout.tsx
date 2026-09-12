import React from 'react';
import { useAuth } from '../context/AuthContext';
import { AuthenticatedLayout } from './AuthenticatedLayout';
import { PublicLayout } from './PublicLayout';

/**
 * AdaptiveDiscoveryLayout
 * Renders the full AuthenticatedLayout (operational sidebar + user topbar) for signed-in users,
 * and the PublicLayout (marketing navbar + footer) for unauthenticated guests.
 */
export const AdaptiveDiscoveryLayout: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center text-xs font-mono text-slate-400">
        Authenticating session...
      </div>
    );
  }

  return user ? <AuthenticatedLayout /> : <PublicLayout />;
};

export default AdaptiveDiscoveryLayout;
