import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { TrustGauge } from '../../components/ui/TrustGauge';
import { Input } from '../../components/ui/Input';
import {
  Users,
  Search,
  ShieldCheck,
  Building,
  Ban,
  CheckCircle,
} from 'lucide-react';

export const UserDirectoryPage: React.FC = () => {
  const { success, error } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await api.getAdminUsers({
        search: search || undefined,
        status: statusFilter || undefined,
      });
      setUsers(res.users);
    } catch {
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [statusFilter]);

  const handleToggleStatus = async (userId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await api.updateUserStatus(userId, newStatus);
      success(`User account status updated to ${newStatus}`);
      fetchUsers();
    } catch (err: any) {
      error(err.message || 'Failed to update user status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">User & Academic Identity Directory</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage student registrations, roles, trust reputations, and suspension actions
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search student by name, email, student ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-[36px] bg-white border border-slate-300 rounded-[6px] px-3 text-xs text-slate-800"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="BANNED">Banned</option>
          </select>
          <Button variant="secondary" size="md" onClick={fetchUsers}>
            Filter
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading user roster...</div>
        ) : users.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-400">No users found matching query.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 font-semibold label-caps">
                  <th className="py-2.5 px-4">Student Name & ID</th>
                  <th className="py-2.5 px-4">University & Dept</th>
                  <th className="py-2.5 px-4">Assigned Roles</th>
                  <th className="py-2.5 px-4">Trust Score</th>
                  <th className="py-2.5 px-4">Wallet Balance</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.user_id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{u.full_name}</div>
                      <div className="font-mono text-[11px] text-slate-400">{u.university_email} • ID: {u.student_id}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-700">{u.university_name}</div>
                      <div className="text-[11px] text-slate-400">{u.department_code || 'General'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1 flex-wrap">
                        {u.roles && u.roles.map((r: string) => (
                          <span key={r} className="px-1.5 py-0.2 rounded font-mono font-bold text-[10px] bg-slate-100 text-slate-700 uppercase">
                            {r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <TrustGauge score={parseFloat(u.trust_score)} size="sm" />
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900 tabular-nums">
                      {parseFloat(u.wallet_balance || '0').toLocaleString()} BDT
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={u.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant={u.status === 'ACTIVE' ? 'destructive' : 'secondary'}
                        size="sm"
                        onClick={() => handleToggleStatus(u.user_id, u.status)}
                        className="text-xs"
                      >
                        {u.status === 'ACTIVE' ? 'Suspend' : 'Unsuspend'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
