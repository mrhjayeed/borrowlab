import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Wallet, WalletTransaction } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import {
  Wallet as WalletIcon,
  Lock,
  ArrowDownLeft,
  ArrowUpRight,
  PlusCircle,
  Clock,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';

export const WalletPage: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const { success, error } = useToast();

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [filterType, setFilterType] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Top-Up Modal
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('5000');
  const [isDepositing, setIsDepositing] = useState(false);

  const fetchWalletData = async () => {
    setIsLoading(true);
    try {
      const [wRes, txRes] = await Promise.all([
        api.getWallet(),
        api.getTransactions({ type: filterType || undefined }),
      ]);
      setWallet(wRes.wallet);
      setTransactions(txRes.transactions);
    } catch {
      // Handled
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, [filterType]);

  const handleDeposit = async () => {
    const amt = parseFloat(depositAmount);
    if (!amt || amt <= 0) {
      error('Please enter a valid deposit amount');
      return;
    }

    setIsDepositing(true);
    try {
      await api.depositWallet(amt, 'Simulated Campus Card Refill');
      await refreshProfile();
      success('Deposit successful', `${amt.toLocaleString()} BDT credited to your virtual wallet`);
      setIsDepositOpen(false);
      fetchWalletData();
    } catch (err: any) {
      error(err.message || 'Deposit failed');
    } finally {
      setIsDepositing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Virtual Wallet & Financial Ledger</h1>
          <p className="text-xs text-slate-500 mt-1">
            Simulated campus balances, atomic escrow locks, and double-entry transaction history
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => setIsDepositOpen(true)} className="gap-1.5">
          <PlusCircle className="w-3.5 h-3.5" />
          Simulate Instant Deposit
        </Button>
      </div>

      {/* Balance & Telemetry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Available Balance */}
        <Card className="p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="label-caps">Available Balance</span>
            <WalletIcon className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-3xl font-extrabold font-mono text-slate-900 tabular-nums">
            {parseFloat(String(wallet?.balance || '0')).toLocaleString()}{' '}
            <span className="text-sm font-normal text-slate-500 font-sans">BDT</span>
          </div>
          <div className="text-[11px] text-slate-400">Ready for rental activation & deposits</div>
        </Card>

        {/* Escrow Locked */}
        <Card className="p-5 space-y-2 border-cyan-200 bg-[#ECFEFF]/30">
          <div className="flex items-center justify-between text-xs text-[#0E7490]">
            <span className="label-caps text-[#0E7490]">Security Deposits in Escrow</span>
            <Lock className="w-4 h-4 text-[#06B6D4]" />
          </div>
          <div className="text-3xl font-extrabold font-mono text-[#0E7490] tabular-nums">
            {parseFloat(String(wallet?.total_escrow_locked || '0')).toLocaleString()}{' '}
            <span className="text-sm font-normal text-[#0E7490] font-sans">BDT</span>
          </div>
          <div className="text-[11px] text-[#0E7490]">Held securely during active hardware borrows</div>
        </Card>

        {/* Lifetime Earnings */}
        <Card className="p-5 space-y-2 border-emerald-100 bg-emerald-50/20">
          <div className="flex items-center justify-between text-xs text-emerald-800">
            <span className="label-caps text-emerald-700">Lifetime Owner Payouts</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-extrabold font-mono text-emerald-700 tabular-nums">
            {parseFloat(String(wallet?.total_earnings || '0')).toLocaleString()}{' '}
            <span className="text-sm font-normal text-emerald-600 font-sans">BDT</span>
          </div>
          <div className="text-[11px] text-emerald-600">Total earned from hardware lending</div>
        </Card>
      </div>

      {/* Financial Ledger Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Immutable Financial Ledger</h2>
            <p className="text-[11px] text-slate-500">Every wallet debit and credit is sequentially recorded</p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="h-[32px] bg-white border border-slate-300 rounded text-xs px-2 text-slate-800"
            >
              <option value="">All Transaction Types</option>
              <option value="WALLET_DEPOSIT">Wallet Deposits</option>
              <option value="RENTAL_PAYMENT">Rental Payments</option>
              <option value="ESCROW_LOCK">Escrow Locks</option>
              <option value="ESCROW_RELEASE">Escrow Releases</option>
              <option value="OWNER_EARNING">Owner Payouts</option>
              <option value="DISPUTE_SETTLEMENT">Dispute Settlements</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading ledger movements...</div>
        ) : transactions.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-400">No ledger entries match this query.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/40 text-slate-500 font-semibold label-caps">
                  <th className="py-2.5 px-4">Reference Code</th>
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4">Description</th>
                  <th className="py-2.5 px-4">Amount</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((tx) => {
                  const isCredit = [
                    'WALLET_DEPOSIT',
                    'OWNER_EARNING',
                    'ESCROW_RELEASE',
                    'REFUND',
                  ].includes(tx.transaction_type);

                  return (
                    <tr key={tx.wallet_transaction_id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-[#4F46E5] font-semibold">
                        {tx.reference_code}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wide bg-slate-100 text-slate-700 uppercase">
                          {tx.transaction_type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 max-w-xs truncate">
                        {tx.description}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold tabular-nums">
                        <span className={isCredit ? 'text-emerald-600' : 'text-slate-900'}>
                          {isCredit ? '+' : '-'} {parseFloat(String(tx.amount)).toLocaleString()} BDT
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500 text-[11px]">
                        {new Date(tx.created_at).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Deposit Simulation Modal */}
      <Modal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        title="Simulate Virtual Deposit"
        subtitle="Credits virtual balance to verify escrow lock and rental activation workflows"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <Input
            label="Deposit Amount (BDT)"
            type="number"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            min="100"
            max="100000"
          />

          <div className="flex gap-2">
            {[1000, 2000, 5000, 10000].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setDepositAmount(val.toString())}
                className="flex-1 py-1.5 text-xs font-mono border border-slate-200 rounded hover:bg-slate-50 transition-colors"
              >
                +{val}
              </button>
            ))}
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs text-slate-500">
            Deposits are immediately committed to the financial ledger (<span className="font-mono text-[10px]">wallet_transactions</span>).
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setIsDepositOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" isLoading={isDepositing} onClick={handleDeposit}>
              Confirm Deposit
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
