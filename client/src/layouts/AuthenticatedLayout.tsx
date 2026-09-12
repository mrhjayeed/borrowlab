import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export const AuthenticatedLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans text-slate-900 antialiased selection:bg-indigo-500 selection:text-white">
      {/* Fixed Left 240px Navigation Sidebar — Only visible in Authenticated Shell */}
      <Sidebar />

      {/* Main Dashboard Canvas */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Authenticated User Topbar (Wallet, Trust, Escrow, Notifications) */}
        <Topbar />

        {/* Fluid Workspace Canvas */}
        <main className="flex-1 p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export const AppLayout = AuthenticatedLayout;
