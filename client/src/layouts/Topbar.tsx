import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRealtime, useRealtimeEvent } from '../context/RealtimeContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';
import { TrustGauge } from '../components/ui/TrustGauge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import {
  Wallet,
  Lock,
  Bell,
  PlusCircle,
  Users,
  Check,
  ChevronDown,
  Building,
  GraduationCap,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const Topbar: React.FC = () => {
  const { user, logout, switchPersona, refreshProfile } = useAuth();
  const { success, error } = useToast();
  const { isConnected } = useRealtime();

  const [demoUsers, setDemoUsers] = useState<any[]>([]);
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Deposit modal state
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('2000');
  const [isDepositing, setIsDepositing] = useState(false);

  // Load demo users
  useEffect(() => {
    api.getDemoUsers().then((res) => setDemoUsers(res.users)).catch(() => {});
  }, []);

  // Poll / load notifications
  const loadNotifications = async () => {
    if (!user) return;
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch {}
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Real-time instant notification and financial sync
  useRealtimeEvent('NOTIFICATION', (data) => {
    loadNotifications();
    if (data?.title) {
      success(data.title, data.message);
    }
  });

  useRealtimeEvent('NOTIFICATION_READ', () => {
    loadNotifications();
  });

  useRealtimeEvent('WALLET_UPDATED', () => {
    refreshProfile();
  });

  useRealtimeEvent('RENTAL_UPDATED', () => {
    refreshProfile();
    loadNotifications();
  });

  const handleDeposit = async () => {
    const amt = parseFloat(depositAmount);
    if (!amt || amt <= 0) {
      error('Please enter a valid amount');
      return;
    }

    setIsDepositing(true);
    try {
      await api.depositWallet(amt, 'Simulated Campus Card Deposit');
      await refreshProfile();
      success('Deposit successful', `${amt.toLocaleString()} BDT added to your virtual wallet`);
      setIsDepositOpen(false);
    } catch (err: any) {
      error(err.message || 'Deposit failed');
    } finally {
      setIsDepositing(false);
    }
  };

  const markAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {}
  };

  return (
    <header className="h-[64px] bg-white border-b border-slate-200 sticky top-0 z-30 px-6 flex items-center justify-between shadow-level-1">
      {/* Left: Department & University Institutional Context */}
      <div className="flex items-center gap-3">
        {user ? (
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-slate-800 font-semibold tracking-wide">
              <Building className="w-3.5 h-3.5 text-slate-500" />
              {user.universityShortName || 'UIU'}
            </span>
            {user.departmentCode && (
              <span className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-[#4F46E5] font-semibold text-[11px]">
                {user.departmentCode}
              </span>
            )}
            <span className="text-slate-400 hidden sm:inline">•</span>
            <span className="text-slate-600 font-mono text-[11px] hidden sm:inline">
              ID: {user.studentId}
            </span>
          </div>
        ) : (
          <div className="text-xs text-slate-500 font-medium">
            Academic Hardware Exchange Network
          </div>
        )}
      </div>

      {/* Right: Telemetry & User Controls */}
      <div className="flex items-center gap-3">
        {user ? (
          <>
            {/* Live Realtime Indicator */}
            <div
              className={`hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                isConnected
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-amber-50 border-amber-200 text-amber-700'
              }`}
              title={isConnected ? 'Connected to BorrowLab Realtime SSE stream' : 'Connecting to Realtime stream...'}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-amber-400'
                }`}
              />
              <span>{isConnected ? 'Real-Time' : 'Connecting'}</span>
            </div>

            {/* Student Trust Chip */}
            <div className="hidden md:block">
              <TrustGauge score={user.trustScore} size="sm" />
            </div>

            {/* Locked Escrow Indicator */}
            {(user.lockedEscrowTotal ?? 0) > 0 && (
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#ECFEFF] border border-[#A5F3FC] text-[#0E7490] text-xs font-mono tabular-nums">
                <Lock className="w-3 h-3 text-[#06B6D4]" />
                <span>{(user.lockedEscrowTotal ?? 0).toLocaleString()} BDT Escrow</span>
              </div>
            )}

            {/* Wallet Balance Pill with Instant Top-Up */}
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-[6px] p-1 gap-1.5 shadow-level-1">
              <div className="flex items-center gap-1.5 px-2 text-xs">
                <Wallet className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-slate-500">Balance:</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {(user.walletBalance ?? 0).toLocaleString()} BDT
                </span>
              </div>
              <button
                onClick={() => setIsDepositOpen(true)}
                className="h-[26px] px-2 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-700 text-[11px] font-medium flex items-center gap-1 transition-colors"
                title="Simulate instant wallet top-up"
              >
                <PlusCircle className="w-3 h-3 text-[#4F46E5]" />
                Top-Up
              </button>
            </div>

            {/* Notifications Popover */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-lg shadow-level-2 z-40 overflow-hidden animate-in fade-in zoom-in-95">
                  <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                      Notifications ({unreadCount})
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-[11px] text-[#4F46E5] hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">
                        No notifications yet
                      </div>
                    ) : (
                      notifications.slice(0, 10).map((n) => (
                        <div
                          key={n.notification_id}
                          className={`p-3 text-xs transition-colors ${
                            n.is_read ? 'bg-white' : 'bg-indigo-50/40'
                          }`}
                        >
                          <div className="font-semibold text-slate-900">{n.title}</div>
                          <div className="text-slate-600 mt-0.5">{n.message}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-1">
                            {new Date(n.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Persona Switcher (For Grading & Testing) */}
            <div className="relative">
              <button
                onClick={() => setShowPersonaMenu(!showPersonaMenu)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] border border-brand-200 bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-medium transition-colors"
                title="Switch active user persona"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#4F46E5]" />
                <span className="font-medium">{user.fullName.split(' ')[0]}</span>
                <span className="text-[10px] px-1 py-0.2 rounded bg-[#4F46E5] text-white uppercase font-bold">
                  {user.roles[0] || 'STUDENT'}
                </span>
                <ChevronDown className="w-3 h-3 text-brand-600" />
              </button>

              {showPersonaMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-lg shadow-level-3 z-40 p-2 animate-in fade-in zoom-in-95">
                  <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Switch Test Persona
                  </div>
                  <div className="space-y-1 mt-1 max-h-60 overflow-y-auto">
                    {demoUsers.map((u) => (
                      <button
                        key={u.user_id}
                        onClick={async () => {
                          await switchPersona(u.user_id);
                          setShowPersonaMenu(false);
                          success('Switched Persona', `Active session switched to ${u.full_name}`);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-md text-left text-xs transition-colors ${
                          user.userId === u.user_id
                            ? 'bg-indigo-50 text-[#4F46E5] font-semibold'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{u.full_name}</div>
                          <div className="text-[10px] text-slate-500 font-mono truncate">
                            {u.roles.join(', ')} • {u.university_short_name}
                          </div>
                        </div>
                        {user.userId === u.user_id && <Check className="w-4 h-4 text-[#4F46E5] shrink-0" />}
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-slate-100 mt-2 pt-2">
                    <button
                      onClick={() => {
                        logout();
                        setShowPersonaMenu(false);
                      }}
                      className="w-full flex items-center gap-2 p-2 rounded text-left text-xs text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="secondary" size="sm">
                Sign In
              </Button>
            </Link>
            <Link to="/register">
              <Button variant="primary" size="sm">
                Register
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Simulated Deposit Modal */}
      <Modal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        title="Simulate Wallet Top-Up"
        subtitle="Simulated academic payment portal with instant ledger verification"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <Input
            label="Deposit Amount (BDT)"
            type="number"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            placeholder="2000"
            min="100"
            max="50000"
          />

          <div className="flex gap-2">
            {[1000, 2000, 5000, 10000].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setDepositAmount(amt.toString())}
                className="flex-1 py-1.5 text-xs font-mono border border-slate-200 rounded hover:bg-slate-50 transition-colors"
              >
                +{amt}
              </button>
            ))}
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs text-slate-500">
            Simulated campus card refill for development and testing. Funds reflect instantly with an immutable transaction log.
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
    </header>
  );
};
