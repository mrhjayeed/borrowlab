import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { WaitlistItem } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import {
  Clock,
  Search,
  CheckCircle2,
  Trash2,
  Bell,
  Cpu,
} from 'lucide-react';

export const WaitlistPage: React.FC = () => {
  const { success, error } = useToast();
  const [waitlist, setWaitlist] = useState<WaitlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWaitlist = async () => {
    setIsLoading(true);
    try {
      const res = await api.getMyWaitlist();
      setWaitlist(res.waitlist);
    } catch {
      setWaitlist([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWaitlist();
  }, []);

  const handleLeave = async (waitlistId: number) => {
    try {
      await api.leaveWaitlist(waitlistId);
      success('Left waitlist queue');
      fetchWaitlist();
    } catch (err: any) {
      error(err.message || 'Failed to cancel waitlist entry');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Component Waitlists</h1>
          <p className="text-xs text-slate-500 mt-1">
            Automated priority reservations when currently rented hardware units are returned
          </p>
        </div>

        <Link to="/browse">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Search className="w-3.5 h-3.5" /> Browse Marketplace
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 bg-white rounded border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : waitlist.length === 0 ? (
        <Card className="p-12 text-center text-xs text-slate-500 space-y-3">
          <Clock className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="text-base font-semibold text-slate-900">You are not in any hardware waitlists</h3>
          <p className="max-w-xs mx-auto text-slate-400">
            When hardware is currently in use or unavailable, join its waitlist to secure the next available reservation window.
          </p>
          <Link to="/browse">
            <Button variant="primary" size="sm">Explore Hardware</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {waitlist.map((item) => (
            <Card key={item.waitlist_id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="label-caps text-[#4F46E5]">{item.category_name}</span>
                  <span className="text-slate-300">•</span>
                  <StatusBadge status={item.status} size="sm" />
                  {item.status === 'NOTIFIED' && (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 animate-pulse">
                      <Bell className="w-3 h-3" /> Available to Reserve Now!
                    </span>
                  )}
                </div>

                <h3 className="text-base font-semibold text-slate-900">{item.component_name}</h3>
                <div className="text-xs text-slate-500">
                  {item.manufacturer} • Model: {item.model} • Desired: {item.requested_duration_days} days
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right text-xs font-mono">
                  <div className="text-[10px] text-slate-400 uppercase font-sans">Queue Position</div>
                  <div className="font-bold text-[#4F46E5] text-sm">
                    #{item.queue_position || 1} in line
                  </div>
                </div>

                {item.status === 'WAITING' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleLeave(item.waitlist_id)}
                    className="text-red-600 border-red-200 hover:bg-red-50 gap-1 text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Leave Queue
                  </Button>
                )}

                {item.status === 'NOTIFIED' && (
                  <Link to="/browse">
                    <Button variant="primary" size="sm">Reserve Now</Button>
                  </Link>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
