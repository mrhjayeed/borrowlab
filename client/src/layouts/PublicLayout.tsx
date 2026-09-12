import React from 'react';
import { Outlet, Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Cpu, Search, Layers, HelpCircle, Info, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const PublicLayout: React.FC = () => {
  const { user } = useAuth();

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-xs font-medium transition-colors ${
      isActive ? 'text-[#4F46E5] font-semibold' : 'text-slate-600 hover:text-slate-900'
    }`;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-900 antialiased selection:bg-indigo-500 selection:text-white">
      {/* Public Marketing Top Navbar — No operational sidebar */}
      <header className="h-[64px] bg-white/95 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-40 px-4 sm:px-8 lg:px-12 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-[#4F46E5] text-white flex items-center justify-center shadow-level-1 group-hover:bg-indigo-700 transition-colors">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-slate-900 flex items-center gap-1.5">
                BorrowLab
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-50 text-[#4F46E5] border border-indigo-100 uppercase tracking-wider font-semibold">
                  UIU
                </span>
              </span>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-6 pl-4 border-l border-slate-200">
            <NavLink to="/browse" className={navLinkClass}>
              Browse Hardware
            </NavLink>
            <NavLink to="/categories" className={navLinkClass}>
              Categories
            </NavLink>
            <NavLink to="/how-it-works" className={navLinkClass}>
              How It Works
            </NavLink>
            <NavLink to="/about" className={navLinkClass}>
              About
            </NavLink>
            <NavLink to="/faq" className={navLinkClass}>
              FAQ
            </NavLink>
          </nav>
        </div>

        {/* Right CTA */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-600 hidden sm:inline">
                Signed in as <strong className="text-slate-900">{user.fullName.split(' ')[0]}</strong>
              </span>
              <Link to="/dashboard">
                <Button variant="primary" size="sm" className="flex items-center gap-1.5 shadow-level-1">
                  <span>Go to Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <Link to="/login">
                <Button variant="ghost" size="sm" className="text-xs font-semibold text-slate-700 hover:text-slate-900">
                  Sign In
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="primary" size="sm" className="text-xs shadow-level-1">
                  Get Started
                </Button>
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Main Page Canvas — Full width container with clean responsive padding */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Public Institutional Footer */}
      <footer className="bg-slate-950 text-slate-400 border-t border-slate-800 text-xs">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Column 1: Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm tracking-tight">
                <div className="w-6 h-6 rounded bg-[#4F46E5] flex items-center justify-center text-white">
                  <Cpu className="w-3.5 h-3.5" />
                </div>
                <span>BorrowLab</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                Peer-to-peer academic hardware lending platform for engineering departments. Facilitates safe sharing of microcontrollers, FPGA boards, oscilloscopes, and sensors.
              </p>
              <div className="flex items-center gap-2 pt-1 font-mono text-[11px] text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Institutional Network Active</span>
              </div>
            </div>

            {/* Column 2: Platform */}
            <div className="space-y-3">
              <div className="text-slate-200 font-semibold uppercase tracking-wider text-[11px]">
                Platform
              </div>
              <ul className="space-y-2">
                <li>
                  <Link to="/browse" className="hover:text-white transition-colors">
                    Hardware Catalog
                  </Link>
                </li>
                <li>
                  <Link to="/categories" className="hover:text-white transition-colors">
                    Equipment Categories
                  </Link>
                </li>
                <li>
                  <Link to="/how-it-works" className="hover:text-white transition-colors">
                    How Lending Works
                  </Link>
                </li>
                <li>
                  <Link to="/faq" className="hover:text-white transition-colors">
                    Frequently Asked Questions
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Institutions */}
            <div className="space-y-3">
              <div className="text-slate-200 font-semibold uppercase tracking-wider text-[11px]">
                Academic Network
              </div>
              <ul className="space-y-2">
                <li className="text-slate-300 font-medium">United International University (UIU)</li>
                <li>Department of CSE & EEE</li>
                <li>Madani Avenue, Badda, Dhaka 1212</li>
                <li>Dhaka, Bangladesh</li>
              </ul>
            </div>

            {/* Column 4: Trust & Protection */}
            <div className="space-y-3">
              <div className="text-slate-200 font-semibold uppercase tracking-wider text-[11px]">
                Security & Escrow
              </div>
              <ul className="space-y-2 text-slate-400">
                <li className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#06B6D4]" />
                  <span>Escrow-Protected Deposits</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Condition Inspection Logs</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Lab Manager Arbitration</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
            <div>
              © 2026 BorrowLab. United International University, Dhaka, Bangladesh. All rights reserved.
            </div>
            <div className="flex items-center gap-6">
              <Link to="/about" className="hover:text-slate-400 transition-colors">
                About Project
              </Link>
              <Link to="/how-it-works" className="hover:text-slate-400 transition-colors">
                Lending Rules
              </Link>
              <Link to="/faq" className="hover:text-slate-400 transition-colors">
                Support
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
