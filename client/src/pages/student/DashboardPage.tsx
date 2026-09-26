import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useRealtimeEvent } from '../../context/RealtimeContext';
import { api } from '../../api/client';
import { Rental, WalletTransaction } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { TrustGauge } from '../../components/ui/TrustGauge';
import {
  Cpu,
  Repeat,
  Wallet,
  Lock,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  PlusCircle,
  Search,
  CheckCircle2,
  Building,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [borrowedRentals, setBorrowedRentals] = useState<Rental[]>([]);
  const [lendedRentals, setLendedRentals] = useState<Rental[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = () => {
    Promise.all([
      api.getMyRentals('borrower'),
      api.getMyRentals('owner'),
      api.getTransactions(),
    ])
      .then(([borRes, lendRes, txRes]) => {
        setBorrowedRentals(borRes.rentals);
        setLendedRentals(lendRes.rentals);
        setTransactions(txRes.transactions.slice(0, 5));
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    setIsLoading(true);
    fetchDashboardData();
  }, []);

  useRealtimeEvent(['RENTAL_UPDATED', 'WALLET_UPDATED', 'DISPUTE_RESOLVED'], () => {
    fetchDashboardData();
  });

  const activeBorrows = borrowedRentals.filter((r) =>
    ['ACTIVE', 'APPROVED', 'REQUESTED', 'OVERDUE', 'RETURN_PENDING'].includes(r.status)
  );
  const activeLends = lendedRentals.filter((r) =>
    ['ACTIVE', 'APPROVED', 'REQUESTED', 'OVERDUE', 'RETURN_PENDING'].includes(r.status)
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-level-2 relative overflow-hidden">
        {/* Soft Ambient Light Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-indigo-200 text-xs font-medium border border-white/10 flex items-center gap-1.5">
                <Building className="w-3 h-3 text-indigo-300" />
                {user?.universityShortName || 'Campus'} • {user?.departmentCode || 'Engineering'}
              </span>
              <span className="text-slate-400 text-xs font-mono">• ID: {user?.studentId}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Welcome back, {user?.fullName?.split(' ')[0]}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              Track active hardware loans, verify return milestones, and manage your virtual wallet balance.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link to="/inventory">
              <Button
                variant="secondary"
                size="sm"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 shadow-none gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                List Equipment
              </Button>
            </Link>
            <Link to="/browse">
              <Button
                variant="primary"
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-500 text-white border-none shadow-sm gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                Borrow Equipment
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Primary Telemetry Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Wallet Balance */}
        <Card className="p-4 sm:p-5 rounded-2xl border-slate-200/80 hover:border-slate-300 hover:shadow-card-hover transition-all">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Virtual Wallet</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-[#4F46E5] flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {(user?.walletBalance ?? 0).toLocaleString()}{' '}
            <span className="text-xs text-slate-500 font-sans font-normal">BDT</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Available balance</span>
            <Link to="/wallet" className="text-[#4F46E5] hover:underline font-medium">
              View ledger →
            </Link>
          </div>
        </Card>

        {/* Metric 2: Escrow Locked */}
        <Card className="p-4 sm:p-5 rounded-2xl border-slate-200/80 hover:border-slate-300 hover:shadow-card-hover transition-all">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Security Escrow</span>
            <div className="w-7 h-7 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-800 tabular-nums">
            {(user?.lockedEscrowTotal ?? 0).toLocaleString()}{' '}
            <span className="text-xs text-cyan-600 font-sans font-normal">BDT</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Protected deposits for rentals
          </div>
        </Card>

        {/* Metric 3: Active Borrows */}
        <Card className="p-4 sm:p-5 rounded-2xl border-slate-200/80 hover:border-slate-300 hover:shadow-card-hover transition-all">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Loans</span>
            <div className="w-7 h-7 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
              <Repeat className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {activeBorrows.length}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Hardware units in possession
          </div>
        </Card>

        {/* Metric 4: Trust Score */}
        <Card className="p-4 sm:p-5 rounded-2xl border-slate-200/80 hover:border-slate-300 hover:shadow-card-hover transition-all">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Trust Reputation</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700 tabular-nums">
            {(user?.trustScore || 100).toFixed(1)}%
          </div>
          <div className="mt-1 text-[11px] text-emerald-700 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Good academic standing</span>
          </div>
        </Card>
      </div>

      {/* Active Borrowed Hardware Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Current Hardware Rentals</h2>
            <p className="text-xs text-slate-500">Active equipment in your custody and scheduled return windows</p>
          </div>
          <Link to="/rentals?tab=borrower">
            <Button variant="ghost" size="sm" className="text-xs text-[#4F46E5] hover:text-[#4338CA]">
              View All Loans <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>

        {activeBorrows.length === 0 ? (
          <Card className="p-8 text-center rounded-2xl border-slate-200/80 bg-white space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-[#4F46E5] mx-auto flex items-center justify-center">
              <Cpu className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-slate-800">No active hardware loans</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Need an FPGA development board, digital oscilloscope, or microcontroller kit for your semester project?
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <Link to="/browse">
                <Button variant="primary" size="sm" className="gap-1.5 text-xs">
                  <Search className="w-3.5 h-3.5" />
                  Browse Available Hardware
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeBorrows.map((rental) => (
              <Card
                key={rental.rental_id}
                className="p-4 sm:p-5 rounded-2xl border-slate-200/80 hover:border-slate-300 hover:shadow-card-hover transition-all space-y-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="mono-data-sm text-[#4F46E5] font-semibold text-[11px] bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        {rental.inventory_code}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 line-clamp-1">{rental.listing_title}</h3>
                    <div className="text-xs text-slate-500 mt-0.5">Lender: {rental.owner_name}</div>
                  </div>
                  <StatusBadge status={rental.status} size="sm" />
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] p-2.5 bg-slate-50/80 rounded-xl border border-slate-100 font-mono">
                  <div>
                    <span className="text-slate-400 block font-sans text-[10px] uppercase tracking-wider">Due Date</span>
                    <span className="font-semibold text-slate-800">{rental.due_date}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-sans text-[10px] uppercase tracking-wider">Security Deposit</span>
                    <span className="font-semibold text-[#0E7490]">{rental.security_deposit} BDT</span>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <Link to={`/rentals/${rental.rental_id}`}>
                    <Button variant="secondary" size="sm" className="text-xs">
                      Manage Return & Handover →
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Two Column Section: Lending Actions & Recent Financial Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incoming Lending Action Requests */}
        <Card className="p-5 rounded-2xl border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Lending Actions Required</h2>
              <p className="text-[11px] text-slate-500">Rentals on your equipment awaiting approval or return inspection</p>
            </div>
            <Link to="/rentals?tab=owner" className="text-xs text-[#4F46E5] hover:underline font-medium">
              View All
            </Link>
          </div>

          {activeLends.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              No pending lending requests or return inspections required.
            </div>
          ) : (
            <div className="space-y-2.5">
              {activeLends.slice(0, 4).map((r) => (
                <div
                  key={r.rental_id}
                  className="p-3 bg-slate-50/80 hover:bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs transition-colors"
                >
                  <div className="min-w-0 pr-3">
                    <div className="font-semibold text-slate-900 truncate">{r.component_name}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Borrower: {r.borrower_name}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={r.status} size="sm" />
                    <Link to={`/rentals/${r.rental_id}`}>
                      <Button variant="secondary" size="sm" className="text-xs">
                        Review
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Financial Ledger Movements */}
        <Card className="p-5 rounded-2xl border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Recent Ledger Activity</h2>
              <p className="text-[11px] text-slate-500">Immutable wallet deposits, fees, and escrow settlements</p>
            </div>
            <Link to="/wallet" className="text-xs text-[#4F46E5] hover:underline font-medium">
              Full Ledger
            </Link>
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              No transactions recorded yet.
            </div>
          ) : (
            <div className="space-y-2.5 divide-y divide-slate-100">
              {transactions.map((tx) => (
                <div key={tx.wallet_transaction_id} className="pt-2.5 first:pt-0 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    {tx.transaction_type === 'WALLET_DEPOSIT' ||
                    tx.transaction_type === 'OWNER_EARNING' ||
                    tx.transaction_type === 'ESCROW_RELEASE' ? (
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <ArrowDownLeft className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                        <ArrowUpRight className="w-4 h-4" />
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-slate-900">{tx.transaction_type.replace(/_/g, ' ')}</div>
                      <div className="mono-data-sm text-slate-400 text-[10px]">{tx.reference_code}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-bold text-slate-900 tabular-nums">
                      {parseFloat(String(tx.amount)).toLocaleString()} BDT
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
