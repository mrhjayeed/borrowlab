import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  FileText,
  Filter,
  User,
  Clock,
  Code,
} from 'lucide-react';

export const AuditTrailPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await api.getAuditLogs({
        action: actionFilter || undefined,
        entity_type: entityFilter || undefined,
      });
      setLogs(res.logs);
    } catch {
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, entityFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Platform Audit Trail</h1>
          <p className="text-xs text-slate-500 mt-1">
            Immutable audit record of sensitive financial actions, status transitions, and logins
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="h-[36px] bg-white border border-slate-300 rounded-[6px] px-3 text-xs text-slate-800"
        >
          <option value="">All Actions</option>
          <option value="INSERT">INSERT</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
          <option value="LOGIN">LOGIN</option>
          <option value="STATUS_CHANGE">STATUS_CHANGE</option>
          <option value="DISPUTE_ACTION">DISPUTE_ACTION</option>
          <option value="PAYMENT">PAYMENT</option>
        </select>

        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="h-[36px] bg-white border border-slate-300 rounded-[6px] px-3 text-xs text-slate-800"
        >
          <option value="">All Entities</option>
          <option value="users">users</option>
          <option value="rentals">rentals</option>
          <option value="inventory">inventory</option>
          <option value="listings">listings</option>
          <option value="disputes">disputes</option>
          <option value="wallets">wallets</option>
        </select>
      </div>

      {/* Audit Log Table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading audit log stream...</div>
        ) : logs.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-400">No audit records match this criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 font-semibold label-caps">
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-4">Entity</th>
                  <th className="py-2.5 px-4">Actor</th>
                  <th className="py-2.5 px-4">State Modifications</th>
                  <th className="py-2.5 px-4">IP Address</th>
                  <th className="py-2.5 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {logs.map((log) => (
                  <tr key={log.audit_log_id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded font-bold uppercase text-[10px] bg-slate-100 text-slate-800">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#4F46E5]">
                      {log.entity_type} #{log.entity_id || 'N/A'}
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-700">
                      {log.actor_name ? `${log.actor_name} (${log.actor_email})` : 'System Daemon'}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-sm">
                      <div className="truncate text-[10px] text-slate-500">
                        {log.new_values || log.old_values || '—'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{log.ip_address || '127.0.0.1'}</td>
                    <td className="py-3 px-4 text-right text-slate-500">
                      {new Date(log.created_at).toLocaleString()}
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
