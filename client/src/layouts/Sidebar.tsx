import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Cpu,
  Search,
  Grid,
  Layers,
  Repeat,
  Wallet,
  AlertTriangle,
  Clock,
  ShieldAlert,
  BarChart3,
  Users,
  FileText,
  Boxes,
  Compass,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes('ADMIN');
  const isModerator = user?.roles?.includes('MODERATOR') || isAdmin;

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-[13px] font-medium transition-all duration-150 ${
      isActive
        ? 'bg-[#EEF2FF] text-[#4F46E5] font-semibold border border-[#C7D2FE]/60'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-transparent'
    }`;

  return (
    <aside className="w-[240px] h-screen bg-white border-r border-slate-200 flex flex-col shrink-0 sticky top-0 select-none z-20">
      {/* Brand Header */}
      <div className="h-[64px] border-b border-slate-200 px-5 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#4F46E5] text-white flex items-center justify-center shadow-level-1">
          <Cpu className="w-5 h-5" />
        </div>
        <div>
          <div className="font-bold text-sm tracking-tight text-slate-900 flex items-center gap-1">
            BorrowLab
            <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-100 text-slate-600 uppercase">
              P2P
            </span>
          </div>
          <div className="text-[11px] text-slate-500 tracking-tight">Academic Hardware</div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Discovery */}
        <div>
          <div className="label-caps px-3 mb-2 text-slate-400">Discovery</div>
          <div className="space-y-1">
            <NavLink to="/browse" className={linkClass}>
              <Search className="w-4 h-4 text-slate-500" />
              <span>Browse Hardware</span>
            </NavLink>
            <NavLink to="/categories" className={linkClass}>
              <Compass className="w-4 h-4 text-slate-500" />
              <span>Hardware Catalog</span>
            </NavLink>
          </div>
        </div>

        {/* Student Workspace */}
        <div>
          <div className="label-caps px-3 mb-2 text-slate-400">Workspace</div>
          <div className="space-y-1">
            <NavLink to="/dashboard" className={linkClass}>
              <Grid className="w-4 h-4 text-slate-500" />
              <span>Dashboard</span>
            </NavLink>
            <NavLink to="/rentals" className={linkClass}>
              <Repeat className="w-4 h-4 text-slate-500" />
              <span>Rentals & Returns</span>
            </NavLink>
            <NavLink to="/inventory" className={linkClass}>
              <Boxes className="w-4 h-4 text-slate-500" />
              <span>My Hardware</span>
            </NavLink>
            <NavLink to="/listings" className={linkClass}>
              <Layers className="w-4 h-4 text-slate-500" />
              <span>My Listings</span>
            </NavLink>
            <NavLink to="/wallet" className={linkClass}>
              <Wallet className="w-4 h-4 text-slate-500" />
              <span>Wallet & Ledger</span>
            </NavLink>
            <NavLink to="/disputes" className={linkClass}>
              <AlertTriangle className="w-4 h-4 text-slate-500" />
              <span>Disputes</span>
            </NavLink>
            <NavLink to="/waitlist" className={linkClass}>
              <Clock className="w-4 h-4 text-slate-500" />
              <span>Waitlist</span>
            </NavLink>
          </div>
        </div>

        {/* Moderator Surface */}
        {isModerator && (
          <div>
            <div className="label-caps px-3 mb-2 text-amber-600 flex items-center justify-between">
              <span>Moderation</span>
              <span className="text-[10px] font-mono px-1 py-0.2 bg-amber-50 text-amber-700 border border-amber-200 rounded">
                Staff
              </span>
            </div>
            <div className="space-y-1">
              <NavLink to="/moderator/disputes" className={linkClass}>
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span>Dispute Queue</span>
              </NavLink>
              <NavLink to="/moderator/damage" className={linkClass}>
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Damage Review</span>
              </NavLink>
            </div>
          </div>
        )}

        {/* Administrator Surface */}
        {isAdmin && (
          <div>
            <div className="label-caps px-3 mb-2 text-indigo-600 flex items-center justify-between">
              <span>Administration</span>
              <span className="text-[10px] font-mono px-1 py-0.2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded">
                Admin
              </span>
            </div>
            <div className="space-y-1">
              <NavLink to="/admin/analytics" className={linkClass}>
                <BarChart3 className="w-4 h-4 text-[#4F46E5]" />
                <span>Analytics & Reports</span>
              </NavLink>
              <NavLink to="/admin/users" className={linkClass}>
                <Users className="w-4 h-4 text-[#4F46E5]" />
                <span>User Directory</span>
              </NavLink>
              <NavLink to="/admin/audit" className={linkClass}>
                <FileText className="w-4 h-4 text-[#4F46E5]" />
                <span>Audit Trail</span>
              </NavLink>
            </div>
          </div>
        )}
      </div>

      {/* Footer / System Status */}
      <div className="p-3 border-t border-slate-200 text-slate-500 text-[11px] font-mono flex items-center justify-between bg-slate-50">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-sans font-medium text-slate-600">System Operational</span>
        </span>
        <span className="text-slate-400">v1.2.0</span>
      </div>
    </aside>
  );
};
