import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useRealtimeEvent } from '../../context/RealtimeContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import {
  FileText,
  Filter,
  User,
  Clock,
  Code,
  Search,
  X,
  ExternalLink,
  Eye,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  LogIn,
  LogOut,
  ArrowRight,
  Shield,
  ShieldAlert,
  Copy,
  Check,
  CreditCard,
  PlusCircle,
} from 'lucide-react';

interface AuditLog {
  audit_log_id: number;
  actor_user_id: number | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  old_values: string | null;
  new_values: string | null;
  ip_address: string | null;
  created_at: string;
  actor_name?: string | null;
  actor_email?: string | null;
  actor_roles?: string[];
}

// Safely parse JSON strings
function parseJson(str: string | null | undefined): Record<string, any> | null {
  if (!str) return null;
  if (typeof str === 'object') return str;
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

// Extract field-level diffs between old and new state
function getFieldDiffs(oldVal: Record<string, any> | null, newVal: Record<string, any> | null) {
  if (!oldVal && !newVal) return [];
  const diffs: { key: string; old: any; new: any }[] = [];
  const allKeys = new Set([...Object.keys(oldVal || {}), ...Object.keys(newVal || {})]);

  // Keys to exclude from visual diffs (metadata/internal timestamps)
  const ignoredKeys = new Set(['opened_at', 'created_at', 'updated_at', 'timestamp']);

  allKeys.forEach((key) => {
    if (ignoredKeys.has(key)) return;
    const oldV = oldVal ? oldVal[key] : undefined;
    const newV = newVal ? newVal[key] : undefined;
    if (JSON.stringify(oldV) !== JSON.stringify(newV)) {
      diffs.push({ key, old: oldV, new: newV });
    }
  });

  return diffs;
}

export const AuditTrailPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Inspector Modal State
  const [inspectingLog, setInspectingLog] = useState<AuditLog | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'diff' | 'raw-json'>('diff');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await api.getAuditLogs({
        action: actionFilter || undefined,
        entity_type: entityFilter || undefined,
        search: debouncedSearch || undefined,
        page,
        limit: 50,
      });
      setLogs(res.logs);
      setTotalCount(res.total);
      setTotalPages(res.totalPages || 1);
    } catch {
      setLogs([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, entityFilter, debouncedSearch, page]);

  // Real-time SSE listener: prepend new audit log in real time
  useRealtimeEvent('AUDIT_LOG_ENTRY', (newEntry: any) => {
    if (!newEntry || !newEntry.audit_log_id) return;
    setLogs((prev) => {
      if (prev.some((item) => Number(item.audit_log_id) === Number(newEntry.audit_log_id))) {
        return prev;
      }
      return [newEntry, ...prev];
    });
    setTotalCount((c) => c + 1);
  });

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const resetFilters = () => {
    setActionFilter('');
    setEntityFilter('');
    setSearchQuery('');
    setPage(1);
  };

  // Semantic Action Badges
  const renderActionBadge = (action: string) => {
    switch (action) {
      case 'LOGIN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] font-mono text-[10px] font-bold uppercase bg-sky-50 border border-sky-200 text-sky-800">
            <LogIn className="w-3 h-3 text-sky-600" /> LOGIN
          </span>
        );
      case 'LOGOUT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] font-mono text-[10px] font-bold uppercase bg-slate-100 border border-slate-200 text-slate-700">
            <LogOut className="w-3 h-3 text-slate-500" /> LOGOUT
          </span>
        );
      case 'STATUS_CHANGE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] font-mono text-[10px] font-bold uppercase bg-amber-50 border border-amber-200 text-amber-800">
            <RefreshCw className="w-3 h-3 text-amber-600" /> STATUS_CHANGE
          </span>
        );
      case 'DISPUTE_ACTION':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] font-mono text-[10px] font-bold uppercase bg-rose-50 border border-rose-200 text-rose-800">
            <AlertTriangle className="w-3 h-3 text-rose-600" /> DISPUTE_ACTION
          </span>
        );
      case 'INSERT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] font-mono text-[10px] font-bold uppercase bg-emerald-50 border border-emerald-200 text-emerald-800">
            <PlusCircle className="w-3 h-3 text-emerald-600" /> INSERT
          </span>
        );
      case 'UPDATE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] font-mono text-[10px] font-bold uppercase bg-indigo-50 border border-indigo-200 text-[#4F46E5]">
            <RefreshCw className="w-3 h-3 text-indigo-500" /> UPDATE
          </span>
        );
      case 'PAYMENT':
      case 'REFUND':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] font-mono text-[10px] font-bold uppercase bg-purple-50 border border-purple-200 text-purple-800">
            <CreditCard className="w-3 h-3 text-purple-600" /> {action}
          </span>
        );
      case 'SUSPEND':
      case 'DELETE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] font-mono text-[10px] font-bold uppercase bg-red-50 border border-red-200 text-red-800">
            <ShieldAlert className="w-3 h-3 text-red-600" /> {action}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] font-mono text-[10px] font-bold uppercase bg-slate-100 border border-slate-200 text-slate-800">
            {action}
          </span>
        );
    }
  };

  // Clickable Entity Routing Link
  const renderEntityLink = (log: AuditLog) => {
    const { entity_type, entity_id } = log;
    if (!entity_id) {
      return <span className="font-mono text-slate-500">{entity_type}</span>;
    }

    let url = '';
    if (entity_type === 'rentals') url = `/rentals/${entity_id}`;
    else if (entity_type === 'disputes') url = `/disputes?rentalId=${parseJson(log.new_values)?.rental_id || ''}`;
    else if (entity_type === 'users') url = `/admin/users?search=${log.actor_email || ''}`;
    else if (entity_type === 'listings') url = `/listings/${entity_id}`;
    else if (entity_type === 'inventory') url = `/inventory`;

    if (!url) {
      return (
        <span className="font-mono text-slate-700 font-medium">
          {entity_type} <span className="text-slate-400">#{entity_id}</span>
        </span>
      );
    }

    return (
      <Link
        to={url}
        className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-[#4F46E5] hover:text-indigo-800 hover:underline group"
      >
        <span>{entity_type} #{entity_id}</span>
        <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
      </Link>
    );
  };

  // Human-Readable Narrative & Change Badges
  const renderChangeNarrative = (log: AuditLog) => {
    const oldVal = parseJson(log.old_values);
    const newVal = parseJson(log.new_values);

    // 1. Status Transitions (e.g. APPROVED ➔ ACTIVE)
    if (oldVal?.status && newVal?.status && oldVal.status !== newVal.status) {
      return (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[10px] line-through">
            {oldVal.status}
          </span>
          <ArrowRight className="w-3 h-3 text-slate-400" />
          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-[10px] font-bold">
            {newVal.status}
          </span>
          {newVal.resolution_notes && (
            <span className="text-[11px] text-slate-500 italic max-w-xs truncate">
              "{newVal.resolution_notes}"
            </span>
          )}
        </div>
      );
    }

    // 2. Dispute Action Summaries
    if (log.action === 'DISPUTE_ACTION') {
      if (newVal?.status && newVal.status.includes('RESOLVED')) {
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 font-mono text-[10px] font-bold">
              {newVal.status}
            </span>
            {newVal.requested_amount && (
              <span className="text-xs font-semibold text-slate-800 font-mono">
                {Number(newVal.requested_amount).toLocaleString()} BDT
              </span>
            )}
            {newVal.resolution_notes && (
              <span className="text-[11px] text-slate-500 italic truncate max-w-xs">
                — {newVal.resolution_notes}
              </span>
            )}
          </div>
        );
      }
      if (newVal?.reason) {
        return (
          <div className="flex items-center gap-1.5 text-xs text-slate-700">
            <span className="font-semibold text-rose-700">Reason: {newVal.reason}</span>
            {newVal.requested_amount && (
              <span className="text-slate-500 font-mono">
                • Claim: {Number(newVal.requested_amount).toLocaleString()} BDT
              </span>
            )}
          </div>
        );
      }
    }

    // 3. Review Submissions
    if (log.entity_type === 'reviews' && newVal?.rating) {
      return (
        <div className="flex items-center gap-1.5 text-xs">
          <span className="font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
            ★ {newVal.rating}/5
          </span>
          <span className="text-slate-600">Peer review on Rental #{newVal.rental_id}</span>
        </div>
      );
    }

    // 4. Session Login
    if (log.action === 'LOGIN') {
      return (
        <span className="text-xs text-slate-500 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 inline" /> Session JWT authenticated
        </span>
      );
    }

    // 5. User Creation / Registration
    if (log.entity_type === 'users' && newVal?.full_name) {
      return (
        <span className="text-xs text-slate-700">
          User provisioned: <strong className="text-slate-900">{newVal.full_name}</strong> ({newVal.email})
        </span>
      );
    }

    // 6. Generic Field Diff Pills
    const diffs = getFieldDiffs(oldVal, newVal);
    if (diffs.length > 0) {
      return (
        <div className="flex items-center gap-1.5 flex-wrap">
          {diffs.slice(0, 3).map((d) => (
            <span
              key={d.key}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-mono text-slate-700"
            >
              <span className="font-semibold text-slate-900">{d.key}:</span>
              {d.old !== undefined && (
                <span className="text-slate-400 line-through">{String(d.old)}</span>
              )}
              {d.old !== undefined && <ArrowRight className="w-2.5 h-2.5 text-slate-400" />}
              <span className="text-emerald-700 font-bold">{String(d.new)}</span>
            </span>
          ))}
          {diffs.length > 3 && (
            <span className="text-[10px] text-slate-400 font-mono font-medium">
              +{diffs.length - 3} more
            </span>
          )}
        </div>
      );
    }

    // Fallback truncated display
    return (
      <span className="text-[11px] font-mono text-slate-500 truncate max-w-sm block">
        {log.new_values || log.old_values || 'No state payload recorded'}
      </span>
    );
  };

  const parsedInspectingOld = useMemo(
    () => parseJson(inspectingLog?.old_values),
    [inspectingLog]
  );
  const parsedInspectingNew = useMemo(
    () => parseJson(inspectingLog?.new_values),
    [inspectingLog]
  );
  const inspectingDiffs = useMemo(
    () => getFieldDiffs(parsedInspectingOld, parsedInspectingNew),
    [parsedInspectingOld, parsedInspectingNew]
  );

  return (
    <div className="space-y-6">
      {/* Header with Live Telemetry Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-[#4F46E5] font-mono text-[10px] font-bold uppercase tracking-wider">
              Governance & Compliance
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live SSE Sync
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Platform Security & Audit Trail
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Immutable transaction history, state machine transitions, and access logs across the borrowing ecosystem
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-slate-400">Total Audit Logs</div>
            <div className="text-lg font-bold font-mono text-slate-900">
              {totalCount.toLocaleString()}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLogs}
            disabled={isLoading}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <Card className="p-4 bg-white space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by actor name, email, action, entity ID, or keyword..."
              className="w-full h-[36px] pl-9 pr-8 text-xs border border-slate-300 rounded-[6px] focus:outline-none focus:border-[#4F46E5] text-slate-800 placeholder-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Action Filter */}
          <div className="w-full md:w-48">
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="w-full h-[36px] bg-white border border-slate-300 rounded-[6px] px-3 text-xs text-slate-800 focus:outline-none focus:border-[#4F46E5]"
            >
              <option value="">All Actions</option>
              <option value="STATUS_CHANGE">STATUS_CHANGE</option>
              <option value="DISPUTE_ACTION">DISPUTE_ACTION</option>
              <option value="LOGIN">LOGIN</option>
              <option value="INSERT">INSERT</option>
              <option value="UPDATE">UPDATE</option>
              <option value="PAYMENT">PAYMENT</option>
              <option value="DELETE">DELETE</option>
              <option value="SUSPEND">SUSPEND</option>
            </select>
          </div>

          {/* Entity Filter */}
          <div className="w-full md:w-44">
            <select
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                setPage(1);
              }}
              className="w-full h-[36px] bg-white border border-slate-300 rounded-[6px] px-3 text-xs text-slate-800 focus:outline-none focus:border-[#4F46E5]"
            >
              <option value="">All Entities</option>
              <option value="rentals">rentals</option>
              <option value="disputes">disputes</option>
              <option value="reviews">reviews</option>
              <option value="inventory">inventory</option>
              <option value="listings">listings</option>
              <option value="users">users</option>
              <option value="wallets">wallets</option>
            </select>
          </div>

          {/* Reset Filters */}
          {(actionFilter || entityFilter || searchQuery) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="text-xs text-slate-500 hover:text-slate-800 shrink-0 gap-1"
            >
              <X className="w-3.5 h-3.5" /> Reset
            </Button>
          )}
        </div>
      </Card>

      {/* Main Audit Log Ledger Table */}
      <Card className="overflow-hidden border border-slate-200">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
            <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin" />
            <span>Streaming secure audit logs...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Shield className="w-8 h-8 text-slate-300 mx-auto" />
            <div className="text-sm font-semibold text-slate-700">No matching audit records</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No audit activities match the active search query or filter criteria.
            </p>
            {(actionFilter || entityFilter || searchQuery) && (
              <Button variant="outline" size="sm" onClick={resetFilters} className="mt-2 text-xs">
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-semibold label-caps">
                  <th className="py-3 px-4 w-36">Action</th>
                  <th className="py-3 px-4 w-36">Entity Target</th>
                  <th className="py-3 px-4 w-52">Actor</th>
                  <th className="py-3 px-4">State Narrative & Diffs</th>
                  <th className="py-3 px-4 w-32">Client Gateway</th>
                  <th className="py-3 px-4 w-40 text-right">Timestamp</th>
                  <th className="py-3 px-3 w-16 text-center">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr
                    key={log.audit_log_id}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    onClick={() => setInspectingLog(log)}
                  >
                    {/* Action */}
                    <td className="py-3.5 px-4 align-top">
                      {renderActionBadge(log.action)}
                      <div className="text-[10px] text-slate-400 font-mono mt-1">
                        #{log.audit_log_id}
                      </div>
                    </td>

                    {/* Entity Target */}
                    <td className="py-3.5 px-4 align-top" onClick={(e) => e.stopPropagation()}>
                      {renderEntityLink(log)}
                    </td>

                    {/* Actor */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-700 shrink-0 mt-0.5">
                          {log.actor_name ? log.actor_name.charAt(0).toUpperCase() : 'S'}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 truncate">
                            {log.actor_name || 'System Daemon'}
                          </div>
                          {log.actor_email && (
                            <div className="text-[11px] text-slate-400 truncate">
                              {log.actor_email}
                            </div>
                          )}
                          {log.actor_roles && log.actor_roles.length > 0 && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {log.actor_roles.map((r) => (
                                <span
                                  key={r}
                                  className="px-1 py-0.2 rounded text-[9px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200"
                                >
                                  {r}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* State Narrative & Diffs */}
                    <td className="py-3.5 px-4 align-top">
                      {renderChangeNarrative(log)}
                    </td>

                    {/* Client Gateway */}
                    <td className="py-3.5 px-4 align-top font-mono text-[11px] text-slate-500">
                      <div>{log.ip_address || '127.0.0.1'}</div>
                      <span className="text-[9px] text-slate-400">internal</span>
                    </td>

                    {/* Timestamp */}
                    <td className="py-3.5 px-4 align-top text-right font-mono text-[11px] text-slate-600">
                      <div>{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(log.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </td>

                    {/* Quick Inspect Button */}
                    <td className="py-3.5 px-3 align-top text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setInspectingLog(log)}
                        title="Inspect full JSON diff"
                        className="p-1.5 rounded text-slate-400 hover:text-[#4F46E5] hover:bg-indigo-50 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalCount > 0 && (
          <div className="px-5 py-3.5 bg-slate-50/60 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Showing <span className="font-semibold text-slate-900">{logs.length}</span> of{' '}
              <span className="font-semibold text-slate-900">{totalCount}</span> total audit entries
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isLoading}
                className="text-xs h-[30px]"
              >
                Previous
              </Button>
              <span className="font-mono text-xs px-2 text-slate-700">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isLoading}
                className="text-xs h-[30px]"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* INTERACTIVE STATE DIFF & JSON INSPECTOR MODAL */}
      <Modal
        isOpen={!!inspectingLog}
        onClose={() => setInspectingLog(null)}
        maxWidth="2xl"
        title="Audit Transaction Inspector"
        subtitle={
          inspectingLog
            ? `Audit #${inspectingLog.audit_log_id} • ${inspectingLog.action} on ${inspectingLog.entity_type} #${inspectingLog.entity_id || 'N/A'}`
            : undefined
        }
      >
        {inspectingLog && (
          <div className="space-y-4">
            {/* Meta Pill Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-slate-50 rounded-[6px] border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Action</span>
                <span className="font-mono font-bold text-slate-800">{inspectingLog.action}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Target Entity</span>
                <span className="font-mono font-semibold text-[#4F46E5]">
                  {inspectingLog.entity_type} #{inspectingLog.entity_id || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Actor User</span>
                <span className="text-slate-800 font-medium truncate block">
                  {inspectingLog.actor_name || 'System Daemon'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Gateway IP</span>
                <span className="font-mono text-slate-600">{inspectingLog.ip_address || '127.0.0.1'}</span>
              </div>
            </div>

            {/* View Mode Tabs */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-1">
              <div className="flex gap-2">
                <button
                  onClick={() => setInspectorTab('diff')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-t-md transition-colors ${
                    inspectorTab === 'diff'
                      ? 'border-b-2 border-[#4F46E5] text-[#4F46E5]'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Field Diffs ({inspectingDiffs.length})
                </button>
                <button
                  onClick={() => setInspectorTab('raw-json')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-t-md transition-colors ${
                    inspectorTab === 'raw-json'
                      ? 'border-b-2 border-[#4F46E5] text-[#4F46E5]'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Raw Payloads (JSON)
                </button>
              </div>

              <div className="text-[11px] text-slate-400 font-mono">
                {new Date(inspectingLog.created_at).toLocaleString()}
              </div>
            </div>

            {/* Tab 1: Field-by-Field Diff Comparison Table */}
            {inspectorTab === 'diff' && (
              <div className="space-y-3">
                {inspectingDiffs.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded border border-slate-100">
                    No discrete field transitions detected. View raw payloads for details.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-[6px]">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold label-caps">
                          <th className="py-2 px-3 w-36">Field</th>
                          <th className="py-2 px-3">Pre-Transition (Old)</th>
                          <th className="py-2 px-3">Post-Transition (New)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                        {inspectingDiffs.map((d) => (
                          <tr key={d.key} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 font-semibold text-slate-800 align-top">
                              {d.key}
                            </td>
                            <td className="py-2.5 px-3 text-rose-700 bg-rose-50/40 align-top">
                              {d.old !== undefined ? (
                                typeof d.old === 'object' ? (
                                  JSON.stringify(d.old)
                                ) : (
                                  String(d.old)
                                )
                              ) : (
                                <span className="text-slate-400 italic">null/undefined</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-emerald-800 bg-emerald-50/40 font-bold align-top">
                              {d.new !== undefined ? (
                                typeof d.new === 'object' ? (
                                  JSON.stringify(d.new)
                                ) : (
                                  String(d.new)
                                )
                              ) : (
                                <span className="text-slate-400 italic">null/undefined</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Raw Side-by-Side JSON Payloads */}
            {inspectorTab === 'raw-json' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Old Values */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                    <span>old_values</span>
                    {inspectingLog.old_values && (
                      <button
                        onClick={() => handleCopy(inspectingLog.old_values!, 'old')}
                        className="text-slate-400 hover:text-slate-700 flex items-center gap-1"
                      >
                        {copiedKey === 'old' ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        {copiedKey === 'old' ? 'Copied' : 'Copy'}
                      </button>
                    )}
                  </div>
                  <pre className="p-3 bg-slate-900 text-slate-100 rounded-[6px] font-mono text-[11px] max-h-60 overflow-auto whitespace-pre-wrap break-all">
                    {parsedInspectingOld
                      ? JSON.stringify(parsedInspectingOld, null, 2)
                      : inspectingLog.old_values || 'null'}
                  </pre>
                </div>

                {/* New Values */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                    <span>new_values</span>
                    {inspectingLog.new_values && (
                      <button
                        onClick={() => handleCopy(inspectingLog.new_values!, 'new')}
                        className="text-slate-400 hover:text-slate-700 flex items-center gap-1"
                      >
                        {copiedKey === 'new' ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        {copiedKey === 'new' ? 'Copied' : 'Copy'}
                      </button>
                    )}
                  </div>
                  <pre className="p-3 bg-slate-900 text-slate-100 rounded-[6px] font-mono text-[11px] max-h-60 overflow-auto whitespace-pre-wrap break-all">
                    {parsedInspectingNew
                      ? JSON.stringify(parsedInspectingNew, null, 2)
                      : inspectingLog.new_values || 'null'}
                  </pre>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <Button variant="secondary" size="sm" onClick={() => setInspectingLog(null)}>
                Close Inspector
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

