import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
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
  AlertTriangle,
  Layers,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [borrowedRentals, setBorrowedRentals] = useState<Rental[]>([]);
  const [lendedRentals, setLendedRentals] = useState<Rental[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
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
  }, []);

  const activeBorrows = borrowedRentals.filter((r) => ['ACTIVE', 'APPROVED', 'REQUESTED', 'OVERDUE'].includes(r.status));
  const activeLends = lendedRentals.filter((r) => ['ACTIVE', 'APPROVED', 'REQUESTED', 'OVERDUE', 'RETURN_PENDING'].includes(r.status));

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Welcome back, {user?.fullName}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {user?.universityShortName} • {user?.departmentName || user?.departmentCode || 'Engineering'} • Student ID: {user?.studentId}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/inventory">
            <Button variant="outline" size="sm" className="gap-1.5">
              <PlusCircle className="w-3.5 h-3.5 text-[#4F46E5]" />
              Add Hardware
            </Button>
          </Link>
          <Link to="/browse">
            <Button variant="primary" size="sm" className="gap-1.5">
              <Search className="w-3.5 h-3.5" />
              Borrow Hardware
            </Button>
          </Link>
        </div>
      </div>

      {/* Primary Telemetry Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Wallet Balance */}
        <Card className="p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="label-caps">Virtual Wallet</span>
            <Wallet className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {(user?.walletBalance ?? 0).toLocaleString()} <span className="text-xs text-slate-500 font-sans font-normal">BDT</span>
          </div>
          <div className="text-[11px] text-slate-400 font-medium">
            Available simulated balance
          </div>
        </Card>

        {/* Metric 2: Escrow Locked */}
        <Card className="p-4 space-y-2 border-cyan-100 bg-[#F0FDFA]/30">
          <div className="flex items-center justify-between text-xs text-[#0E7490]">
            <span className="label-caps text-[#0E7490]">Locked In Escrow</span>
            <Lock className="w-4 h-4 text-[#06B6D4]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#0E7490] tabular-nums">
            {(user?.lockedEscrowTotal ?? 0).toLocaleString()} <span className="text-xs text-[#0E7490] font-sans font-normal">BDT</span>
          </div>
          <div className="text-[11px] text-[#0E7490] font-medium">
            Held deposits for active rentals
          </div>
        </Card>

        {/* Metric 3: Active Borrows */}
        <Card className="p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="label-caps">Active Borrows</span>
            <Repeat className="w-4 h-4 text-[#4F46E5]" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {activeBorrows.length}
          </div>
          <div className="text-[11px] text-slate-400 font-medium">
            Hardware units currently in your possession
          </div>
        </Card>

        {/* Metric 4: Trust Score */}
        <Card className="p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="label-caps">Student Reputation</span>
            <TrustGauge score={user?.trustScore || 100} size="sm" showLabel={false} />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 tabular-nums">
            {(user?.trustScore || 100).toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-400 font-medium">
            Verified academic trust score
          </div>
        </Card>
      </div>

      {/* Active Borrowed Hardware Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Active Borrowed Hardware</h2>
            <p className="text-xs text-slate-500">Track return deadlines and handover status</p>
          </div>
          <Link to="/rentals?tab=borrower">
            <Button variant="ghost" size="sm" className="text-xs text-[#4F46E5]">
              View All Borrows →
            </Button>
          </Link>
        </div>

        {activeBorrows.length === 0 ? (
          <Card className="p-6 text-center text-xs text-slate-500 space-y-2">
            <Cpu className="w-8 h-8 text-slate-300 mx-auto" />
            <p>You have no active hardware rentals at the moment.</p>
            <Link to="/browse">
              <Button variant="secondary" size="sm">Browse Hardware</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeBorrows.map((rental) => (
              <Card key={rental.rental_id} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="mono-data-sm text-[#4F46E5]">{rental.inventory_code}</span>
                    <h3 className="text-sm font-semibold text-slate-900 line-clamp-1">{rental.listing_title}</h3>
                    <div className="text-xs text-slate-500">Owner: {rental.owner_name}</div>
                  </div>
                  <StatusBadge status={rental.status} size="sm" />
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] p-2 bg-slate-50 rounded border border-slate-100 font-mono">
                  <div>
                    <span className="text-slate-400 block font-sans text-[10px]">Due Date</span>
                    <span className="font-semibold text-slate-800">{rental.due_date}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-sans text-[10px]">Held Escrow</span>
                    <span className="font-semibold text-[#0E7490]">{rental.security_deposit} BDT</span>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <Link to={`/rentals/${rental.rental_id}`}>
                    <Button variant="secondary" size="sm">
                      Manage Rental
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Two Column Section: Owned Hardware Requests & Recent Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incoming Lending Action Requests */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Incoming Lending Action Required</h2>
              <p className="text-[11px] text-slate-500">Rentals on your hardware awaiting review or inspection</p>
            </div>
            <Link to="/rentals?tab=owner" className="text-xs text-[#4F46E5] hover:underline font-medium">
              View All
            </Link>
          </div>

          {activeLends.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400">
              No pending lending requests or inspections required.
            </div>
          ) : (
            <div className="space-y-3">
              {activeLends.slice(0, 4).map((r) => (
                <div key={r.rental_id} className="p-3 bg-slate-50 rounded border border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-900">{r.component_name}</div>
                    <div className="text-[11px] text-slate-500">Borrower: {r.borrower_name}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={r.status} size="sm" />
                    <Link to={`/rentals/${r.rental_id}`}>
                      <Button variant="secondary" size="sm">Action</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Financial Ledger Movements */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Recent Financial Ledger Activity</h2>
              <p className="text-[11px] text-slate-500">Immutable wallet & escrow transaction records</p>
            </div>
            <Link to="/wallet" className="text-xs text-[#4F46E5] hover:underline font-medium">
              Full Ledger
            </Link>
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400">
              No transactions recorded yet.
            </div>
          ) : (
            <div className="space-y-2.5 divide-y divide-slate-100">
              {transactions.map((tx) => (
                <div key={tx.wallet_transaction_id} className="pt-2.5 first:pt-0 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    {tx.transaction_type === 'WALLET_DEPOSIT' || tx.transaction_type === 'OWNER_EARNING' || tx.transaction_type === 'ESCROW_RELEASE' ? (
                      <div className="w-7 h-7 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <ArrowDownLeft className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded bg-slate-100 text-slate-600 flex items-center justify-center">
                        <ArrowUpRight className="w-4 h-4" />
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-slate-900">{tx.transaction_type.replace('_', ' ')}</div>
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
