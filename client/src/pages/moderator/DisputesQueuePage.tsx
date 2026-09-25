import React, { useState, useEffect, useRef, useMemo } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useRealtimeEvent } from '../../context/RealtimeContext';
import { useToast } from '../../context/ToastContext';
import { Dispute } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import {
  ShieldAlert,
  Gavel,
  Lock,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Send,
  Camera,
  ZoomIn,
  ExternalLink,
  Paperclip,
  X,
  Loader2,
  Search,
  SlidersHorizontal,
  RotateCcw,
  Filter,
} from 'lucide-react';

export const DisputesQueuePage: React.FC = () => {
  const { user } = useAuth();
  const { success, error } = useToast();

  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filter and Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'NEEDS_ACTION' | 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'CLOSED'>('ALL');
  const [reasonFilter, setReasonFilter] = useState<string>('ALL');
  const [evidenceFilter, setEvidenceFilter] = useState<'ALL' | 'WITH_EVIDENCE' | 'NO_EVIDENCE'>('ALL');
  const [escrowFilter, setEscrowFilter] = useState<'ALL' | 'WITH_ESCROW' | 'NO_ESCROW'>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest_escrow' | 'highest_claim'>('newest');

  // Evidence Lightbox viewer
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);

  // Moderator attachment state
  const [modAttachmentUrl, setModAttachmentUrl] = useState('');
  const [modAttachmentPreview, setModAttachmentPreview] = useState<string | null>(null);
  const [modAttachmentFile, setModAttachmentFile] = useState<File | null>(null);
  const [isUploadingModAttachment, setIsUploadingModAttachment] = useState(false);
  const modAttachmentInputRef = useRef<HTMLInputElement>(null);

  const handleModAttachmentSelect = async (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      error('Invalid image format', 'Please select a JPG, PNG, WEBP, or GIF image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      error('File too large', 'Image size must be under 5MB');
      return;
    }

    setModAttachmentFile(file);
    const localUrl = URL.createObjectURL(file);
    setModAttachmentPreview(localUrl);

    setIsUploadingModAttachment(true);
    try {
      const res = await api.uploadImage(file);
      setModAttachmentUrl(res.url);
      success('Directive attachment ready', `${file.name} uploaded`);
    } catch (err: any) {
      error(err.message || 'Failed to attach image');
    } finally {
      setIsUploadingModAttachment(false);
    }
  };

  const handleClearModAttachment = () => {
    if (modAttachmentPreview && modAttachmentPreview.startsWith('blob:')) {
      URL.revokeObjectURL(modAttachmentPreview);
    }
    setModAttachmentFile(null);
    setModAttachmentPreview(null);
    setModAttachmentUrl('');
    if (modAttachmentInputRef.current) {
      modAttachmentInputRef.current.value = '';
    }
  };

  // Resolution Modal State
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [resolutionStatus, setResolutionStatus] = useState<any>('RESOLVED_OWNER');
  const [ownerSettlement, setOwnerSettlement] = useState('1500');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  // Message in thread
  const [modMessage, setModMessage] = useState('');
  const [isSendingModMsg, setIsSendingModMsg] = useState(false);

  const fetchQueue = async () => {
    setIsLoading(true);
    try {
      const res = await api.getDisputeQueue();
      setDisputes(res.disputes);
      if (res.disputes.length > 0 && !selectedDispute) {
        loadDetail(res.disputes[0].dispute_id);
      }
    } catch {
      setDisputes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDetail = async (id: number) => {
    try {
      const res = await api.getDisputeDetail(id);
      setSelectedDispute(res.dispute);
      setOwnerSettlement(String(res.dispute.requested_amount || '1000'));
    } catch (err: any) {
      error(err.message);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  // Real-time live queue and chat sync
  useRealtimeEvent('DISPUTE_MESSAGE', (message: any) => {
    setSelectedDispute((prev) => {
      if (!prev || Number(prev.dispute_id) !== Number(message?.dispute_id)) return prev;
      const exists = prev.messages?.some((m) => Number(m.message_id) === Number(message?.message_id));
      if (exists) return prev;
      return {
        ...prev,
        messages: [...(prev.messages || []), message],
      };
    });
  });

  useRealtimeEvent(['DISPUTE_UPDATED', 'DISPUTE_RESOLVED'], (data: any) => {
    fetchQueue();
    if (selectedDispute && Number(selectedDispute.dispute_id) === Number(data?.dispute_id)) {
      loadDetail(Number(data.dispute_id));
    }
  });

  const handleSendModeratorMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = modMessage.trim();
    if (!selectedDispute || (!text && !modAttachmentUrl)) return;

    setIsSendingModMsg(true);
    try {
      const directiveText = text
        ? `[MODERATOR DIRECTIVE]: ${text}`
        : '[MODERATOR DIRECTIVE]: Attached inspection artifact / document';
      await api.postDisputeMessage(selectedDispute.dispute_id, directiveText, modAttachmentUrl || undefined);
      setModMessage('');
      handleClearModAttachment();
      loadDetail(selectedDispute.dispute_id);
      success('Directive posted to thread');
    } catch (err: any) {
      error(err.message || 'Failed to post message');
    } finally {
      setIsSendingModMsg(false);
    }
  };

  const handleExecuteResolution = async () => {
    if (!selectedDispute) return;
    if (!resolutionNotes.trim()) {
      error('Please provide formal resolution findings and notes');
      return;
    }

    setIsResolving(true);
    try {
      await api.resolveDispute(selectedDispute.dispute_id, {
        status: resolutionStatus,
        settlement_amount_owner: parseFloat(ownerSettlement) || 0,
        resolution_notes: resolutionNotes.trim(),
      });

      success('Dispute resolved', 'Escrow funds distributed and ledger records generated.');
      setIsResolveModalOpen(false);
      fetchQueue();
      loadDetail(selectedDispute.dispute_id);
    } catch (err: any) {
      error(err.message || 'Failed to execute dispute resolution');
    } finally {
      setIsResolving(false);
    }
  };

  const kpis = useMemo(() => {
    const total = disputes.length;
    const needsAction = disputes.filter((d) => ['OPEN', 'UNDER_REVIEW'].includes(d.status)).length;
    const open = disputes.filter((d) => d.status === 'OPEN').length;
    const underReview = disputes.filter((d) => d.status === 'UNDER_REVIEW').length;
    const resolved = disputes.filter((d) =>
      ['RESOLVED_OWNER', 'RESOLVED_BORROWER', 'PARTIAL_SETTLEMENT'].includes(d.status)
    ).length;
    const closed = disputes.filter((d) => ['CLOSED', 'REJECTED'].includes(d.status)).length;
    const withEvidence = disputes.filter((d) => Boolean(d.evidence_url)).length;
    const totalEscrowAtRisk = disputes.reduce(
      (sum, d) => sum + (parseFloat(String(d.escrow_held_amount || '0')) || 0),
      0
    );

    return {
      total,
      needsAction,
      open,
      underReview,
      resolved,
      closed,
      withEvidence,
      totalEscrowAtRisk,
    };
  }, [disputes]);

  const filteredDisputes = useMemo(() => {
    let result = [...disputes];

    // Status filter
    if (statusFilter === 'NEEDS_ACTION') {
      result = result.filter((d) => ['OPEN', 'UNDER_REVIEW'].includes(d.status));
    } else if (statusFilter === 'OPEN') {
      result = result.filter((d) => d.status === 'OPEN');
    } else if (statusFilter === 'UNDER_REVIEW') {
      result = result.filter((d) => d.status === 'UNDER_REVIEW');
    } else if (statusFilter === 'RESOLVED') {
      result = result.filter((d) =>
        ['RESOLVED_OWNER', 'RESOLVED_BORROWER', 'PARTIAL_SETTLEMENT'].includes(d.status)
      );
    } else if (statusFilter === 'CLOSED') {
      result = result.filter((d) => ['CLOSED', 'REJECTED'].includes(d.status));
    }

    // Reason filter
    if (reasonFilter !== 'ALL') {
      result = result.filter((d) => d.reason === reasonFilter);
    }

    // Evidence filter
    if (evidenceFilter === 'WITH_EVIDENCE') {
      result = result.filter((d) => Boolean(d.evidence_url));
    } else if (evidenceFilter === 'NO_EVIDENCE') {
      result = result.filter((d) => !d.evidence_url);
    }

    // Escrow filter
    if (escrowFilter === 'WITH_ESCROW') {
      result = result.filter((d) => (parseFloat(String(d.escrow_held_amount || '0')) || 0) > 0);
    } else if (escrowFilter === 'NO_ESCROW') {
      result = result.filter((d) => (parseFloat(String(d.escrow_held_amount || '0')) || 0) === 0);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((d) => {
        const idMatch = String(d.dispute_id).includes(q) || `#${d.dispute_id}`.includes(q);
        const compMatch = d.component_name?.toLowerCase().includes(q);
        const titleMatch = d.listing_title?.toLowerCase().includes(q);
        const reasonMatch = d.reason?.toLowerCase().replace('_', ' ').includes(q);
        const ownerMatch = d.opened_by_name?.toLowerCase().includes(q);
        const counterMatch = d.against_user_name?.toLowerCase().includes(q);
        const descMatch = d.description?.toLowerCase().includes(q);
        return idMatch || compMatch || titleMatch || reasonMatch || ownerMatch || counterMatch || descMatch;
      });
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.opened_at).getTime() - new Date(b.opened_at).getTime();
      }
      if (sortBy === 'highest_escrow') {
        return (parseFloat(String(b.escrow_held_amount || '0')) || 0) - (parseFloat(String(a.escrow_held_amount || '0')) || 0);
      }
      if (sortBy === 'highest_claim') {
        return (parseFloat(String(b.requested_amount || '0')) || 0) - (parseFloat(String(a.requested_amount || '0')) || 0);
      }
      return 0;
    });

    return result;
  }, [disputes, statusFilter, reasonFilter, evidenceFilter, escrowFilter, searchQuery, sortBy]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    statusFilter !== 'ALL' ||
    reasonFilter !== 'ALL' ||
    evidenceFilter !== 'ALL' ||
    escrowFilter !== 'ALL' ||
    sortBy !== 'newest';

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setReasonFilter('ALL');
    setEvidenceFilter('ALL');
    setEscrowFilter('ALL');
    setSortBy('newest');
  };

  // Synchronize selection with filtered list
  useEffect(() => {
    if (filteredDisputes.length > 0) {
      const isSelectedInFiltered = filteredDisputes.some((d) => d.dispute_id === selectedDispute?.dispute_id);
      if (!isSelectedInFiltered) {
        loadDetail(filteredDisputes[0].dispute_id);
      }
    } else {
      setSelectedDispute(null);
    }
  }, [filteredDisputes]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dispute Arbitration Queue</h1>
            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[11px] font-bold uppercase tracking-wider border border-amber-200">
              Staff Surface
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Examine counterparty evidence, arbitrate damage liabilities, and execute escrow settlements
          </p>
        </div>
      </div>

      {/* Moderator KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <Card className="p-3.5 bg-white border-slate-200">
          <div className="text-[11px] font-medium text-slate-500">Total Cases</div>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono">{kpis.total}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Recorded in docket</div>
        </Card>
        <Card className="p-3.5 bg-amber-50/50 border-amber-200">
          <div className="text-[11px] font-medium text-amber-800">Needs Action</div>
          <div className="text-xl font-bold text-amber-900 mt-1 font-mono">{kpis.needsAction}</div>
          <div className="text-[10px] text-amber-700/80 mt-0.5">{kpis.open} open • {kpis.underReview} review</div>
        </Card>
        <Card className="p-3.5 bg-indigo-50/50 border-indigo-200">
          <div className="text-[11px] font-medium text-indigo-800">Photo Evidence</div>
          <div className="text-xl font-bold text-[#4F46E5] mt-1 font-mono">{kpis.withEvidence}</div>
          <div className="text-[10px] text-indigo-600 mt-0.5">Claims with images</div>
        </Card>
        <Card className="p-3.5 bg-emerald-50/50 border-emerald-200">
          <div className="text-[11px] font-medium text-emerald-800">Settled & Ruled</div>
          <div className="text-xl font-bold text-emerald-900 mt-1 font-mono">{kpis.resolved + kpis.closed}</div>
          <div className="text-[10px] text-emerald-600 mt-0.5">Disputes finalized</div>
        </Card>
        <Card className="p-3.5 bg-cyan-50/50 border-cyan-200 col-span-2 sm:col-span-1">
          <div className="text-[11px] font-medium text-[#0E7490]">Escrow at Stake</div>
          <div className="text-lg font-bold text-[#0E7490] mt-1 font-mono">
            {kpis.totalEscrowAtRisk.toLocaleString()} <span className="text-xs">BDT</span>
          </div>
          <div className="text-[10px] text-[#0E7490]/80 mt-0.5">Frozen security sum</div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-3.5 space-y-3 bg-white border-slate-200 shadow-level-1">
        {/* Row 1: Search & Status Pills */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search Case #, component, user names, description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#4F46E5] focus:border-[#4F46E5] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Segmented Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
            {[
              { id: 'ALL', label: 'All Cases', count: kpis.total },
              { id: 'NEEDS_ACTION', label: 'Needs Action', count: kpis.needsAction },
              { id: 'OPEN', label: 'Open', count: kpis.open },
              { id: 'UNDER_REVIEW', label: 'Reviewing', count: kpis.underReview },
              { id: 'RESOLVED', label: 'Resolved', count: kpis.resolved },
              { id: 'CLOSED', label: 'Closed', count: kpis.closed },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  statusFilter === tab.id
                    ? 'bg-[#4F46E5] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    statusFilter === tab.id
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Secondary Dropdowns (Reason, Evidence, Escrow, Sort) & Reset */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-slate-500 font-medium">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Filter:</span>
            </div>

            {/* Reason Dropdown */}
            <select
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value)}
              className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-[#4F46E5]"
            >
              <option value="ALL">All Dispute Reasons</option>
              <option value="DAMAGE">Physical Damage</option>
              <option value="LOST_ITEM">Lost Item</option>
              <option value="MISSING_ACCESSORY">Missing Accessory</option>
              <option value="PRE_EXISTING_DAMAGE">Pre-Existing Damage</option>
              <option value="DEFECTIVE_ITEM">Defective Hardware</option>
              <option value="INCORRECT_ITEM">Incorrect Item</option>
              <option value="LATE_RETURN">Late Return Penalty</option>
              <option value="PAYMENT_ISSUE">Payment / Escrow Issue</option>
              <option value="OTHER">Other Discrepancy</option>
            </select>

            {/* Evidence Filter */}
            <select
              value={evidenceFilter}
              onChange={(e) => setEvidenceFilter(e.target.value as any)}
              className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-[#4F46E5]"
            >
              <option value="ALL">All Evidence States</option>
              <option value="WITH_EVIDENCE">Has Photographic Evidence</option>
              <option value="NO_EVIDENCE">No Photo Attached</option>
            </select>

            {/* Escrow Filter */}
            <select
              value={escrowFilter}
              onChange={(e) => setEscrowFilter(e.target.value as any)}
              className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-[#4F46E5]"
            >
              <option value="ALL">All Escrow Balances</option>
              <option value="WITH_ESCROW">Has Frozen Escrow (&gt;0)</option>
              <option value="NO_ESCROW">No Held Escrow (0 BDT)</option>
            </select>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1 ml-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-[#4F46E5]"
              >
                <option value="newest">Sort: Newest First</option>
                <option value="oldest">Sort: Oldest First</option>
                <option value="highest_escrow">Sort: Escrow (High to Low)</option>
                <option value="highest_claim">Sort: Claim (High to Low)</option>
              </select>
            </div>
          </div>

          {/* Counts & Reset */}
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-500 font-mono">
              Showing <strong className="text-slate-800">{filteredDisputes.length}</strong> of{' '}
              <strong className="text-slate-800">{disputes.length}</strong>
            </span>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Filters
              </button>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Queue List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="label-caps text-slate-400">
              Case Roster ({filteredDisputes.length})
            </span>
            {hasActiveFilters && (
              <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded font-mono font-medium">
                Filtered
              </span>
            )}
          </div>

          {filteredDisputes.length === 0 ? (
            <Card className="p-8 text-center text-xs text-slate-500 space-y-3 bg-white">
              <Search className="w-8 h-8 text-slate-300 mx-auto" />
              <div className="font-semibold text-slate-800 text-sm">No matching dispute cases</div>
              <p className="text-slate-400 text-xs max-w-xs mx-auto">
                No cases match your active filter combination or search query.
              </p>
              <Button variant="secondary" size="sm" onClick={resetFilters} className="gap-1.5 mx-auto">
                <RotateCcw className="w-3.5 h-3.5" />
                Reset All Filters
              </Button>
            </Card>
          ) : (
            filteredDisputes.map((d) => (
              <Card
                key={d.dispute_id}
                onClick={() => loadDetail(d.dispute_id)}
                className={`p-4 cursor-pointer transition-all ${
                  selectedDispute?.dispute_id === d.dispute_id
                    ? 'border-[#4F46E5] ring-2 ring-indigo-50 shadow-level-2'
                    : 'hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="mono-data-sm text-[#4F46E5] font-bold">Case #{d.dispute_id}</span>
                  <StatusBadge status={d.status} size="sm" />
                </div>

                <div className="text-sm font-semibold text-slate-900 mt-1">{d.reason.replace('_', ' ')}</div>
                <div className="text-xs text-slate-500 mt-0.5">{d.component_name}</div>

                <div className="mt-2 text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                  <div>Owner: <span className="font-semibold text-slate-800">{d.opened_by_name}</span></div>
                  <div>Claim Against: <span className="font-semibold text-slate-800">{d.against_user_name}</span></div>
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-[#0E7490] pt-2 mt-1">
                  <span>Frozen Deposit: {d.escrow_held_amount} BDT</span>
                  <span className="text-slate-400 font-sans">Claim: {d.requested_amount} BDT</span>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Right: Arbitration Workbench */}
        <div className="lg:col-span-2 space-y-4">
          {selectedDispute ? (
            <Card className="flex flex-col h-[650px] overflow-hidden">
              {/* Header & Escrow Telemetry */}
              <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="mono-data text-xs font-bold text-[#4F46E5]">Case #{selectedDispute.dispute_id}</span>
                    <span className="text-slate-300">•</span>
                    <span className="label-caps">{selectedDispute.reason}</span>
                    <span className="text-slate-300">•</span>
                    <StatusBadge status={selectedDispute.status} size="sm" />
                  </div>
                  <h2 className="text-base font-bold text-slate-900 mt-1">{selectedDispute.listing_title}</h2>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#ECFEFF] border border-[#A5F3FC] rounded text-right font-mono">
                    <div className="text-[10px] text-[#0E7490] font-sans uppercase font-bold">Held Escrow</div>
                    <div className="text-sm font-bold text-[#0E7490]">{selectedDispute.escrow_held_amount} BDT</div>
                  </div>

                  {!['RESOLVED_OWNER', 'RESOLVED_BORROWER', 'CLOSED'].includes(selectedDispute.status) && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setIsResolveModalOpen(true)}
                      className="bg-amber-600 hover:bg-amber-700 border-amber-700 gap-1"
                    >
                      <Gavel className="w-3.5 h-3.5" /> Rule on Case
                    </Button>
                  )}
                </div>
              </div>

              {/* Primary Case Evidence Banner */}
              {selectedDispute.evidence_url && (
                <div className="px-4 py-2.5 bg-amber-50/80 border-b border-amber-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-amber-900 font-medium">
                    <Camera className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Primary Case Evidence Photograph Submitted</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setZoomImageUrl(selectedDispute.evidence_url!)}
                    className="flex items-center gap-2 px-2.5 py-1 rounded-[6px] bg-white border border-amber-300 text-xs font-semibold text-amber-800 hover:bg-amber-100/50 shadow-sm transition-all"
                  >
                    <img
                      src={selectedDispute.evidence_url}
                      alt="Evidence thumbnail"
                      className="w-5 h-5 rounded object-cover border border-amber-200"
                    />
                    <span>Inspect Evidence Photo</span>
                    <ZoomIn className="w-3.5 h-3.5 text-amber-600" />
                  </button>
                </div>
              )}

              {/* Thread of Multi-Party Messages */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/30">
                {selectedDispute.messages && selectedDispute.messages.map((m) => {
                  const isStaff = m.sender_roles?.some((r) => ['ADMIN', 'MODERATOR'].includes(r));
                  return (
                    <div key={m.message_id} className="p-3 rounded-lg border bg-white shadow-level-1 text-xs space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                          {m.sender_name}
                          {isStaff && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-mono text-[9px] font-bold">
                              MODERATOR
                            </span>
                          )}
                        </span>
                        <span className="font-mono text-slate-400">
                          {new Date(m.created_at).toLocaleString()}
                        </span>
                      </div>
                      {m.file_url && (
                        <div className="pt-1 pb-0.5">
                          <div
                            onClick={() => setZoomImageUrl(m.file_url!)}
                            className="relative group cursor-pointer overflow-hidden rounded-[6px] border border-slate-200 bg-slate-100 max-w-[240px]"
                          >
                            <img
                              src={m.file_url}
                              alt="Attachment"
                              className="w-full h-36 object-cover transition-transform group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-medium gap-1">
                              <ZoomIn className="w-4 h-4" /> Inspect artifact
                            </div>
                          </div>
                        </div>
                      )}
                      <p className="text-slate-700 leading-relaxed">{m.message}</p>
                    </div>
                  );
                })}
              </div>

              {/* Pending Moderator Attachment Banner */}
              {modAttachmentPreview && (
                <div className="px-3 py-2 flex items-center gap-2 bg-amber-50/70 border-t border-amber-200 animate-in fade-in">
                  <div className="relative w-10 h-10 rounded overflow-hidden border border-amber-200 bg-white shrink-0">
                    <img src={modAttachmentPreview} alt="Pending directive attachment" className="w-full h-full object-cover" />
                    {isUploadingModAttachment && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-700 font-medium truncate flex-1">
                    {modAttachmentFile?.name || 'Inspection artifact attached'}
                  </span>
                  <button
                    type="button"
                    onClick={handleClearModAttachment}
                    className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-white"
                    title="Remove attachment"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Moderator Directive Bar */}
              <form onSubmit={handleSendModeratorMessage} className="p-3 border-t border-slate-200 bg-white flex gap-2 items-center">
                <input
                  ref={modAttachmentInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleModAttachmentSelect(file);
                  }}
                />
                <button
                  type="button"
                  onClick={() => modAttachmentInputRef.current?.click()}
                  className="p-2 rounded-[6px] border border-slate-200 text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                  title="Attach inspection photograph or artifact"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <input
                  type="text"
                  value={modMessage}
                  onChange={(e) => setModMessage(e.target.value)}
                  placeholder="Post formal moderator request or evidence inquiry..."
                  className="flex-1 h-[36px] px-3 text-xs border border-slate-300 rounded focus:outline-none focus:border-[#4F46E5]"
                />
                <Button
                  type="submit"
                  variant="secondary"
                  size="md"
                  isLoading={isSendingModMsg || isUploadingModAttachment}
                  className="gap-1"
                >
                  <Send className="w-3.5 h-3.5" /> Intervene
                </Button>
              </form>
            </Card>
          ) : (
            <Card className="p-12 text-center text-xs text-slate-400">
              Select a dispute from the queue to review evidence and arbitrate settlement.
            </Card>
          )}
        </div>
      </div>

      {/* Arbitration Modal */}
      <Modal
        isOpen={isResolveModalOpen}
        onClose={() => setIsResolveModalOpen(false)}
        title="Execute Dispute Arbitration"
        subtitle={`Case #${selectedDispute?.dispute_id} • Held Escrow: ${selectedDispute?.escrow_held_amount} BDT`}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Arbitrated Ruling Outcome *
            </label>
            <select
              value={resolutionStatus}
              onChange={(e) => setResolutionStatus(e.target.value as any)}
              className="w-full h-[36px] bg-white border border-slate-300 rounded-[6px] px-2.5 text-xs text-slate-900 font-medium"
            >
              <option value="RESOLVED_OWNER">Ruling for Owner (Damage substantiated)</option>
              <option value="PARTIAL_SETTLEMENT">Partial Settlement (Shared liability)</option>
              <option value="RESOLVED_BORROWER">Ruling for Borrower (Damage unfounded)</option>
            </select>
          </div>

          <Input
            label="Owner Settlement Payout from Escrow (BDT) *"
            type="number"
            value={ownerSettlement}
            onChange={(e) => setOwnerSettlement(e.target.value)}
            max={selectedDispute?.escrow_held_amount}
            min="0"
          />

          <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-1 font-mono">
            <div className="flex justify-between">
              <span>Owner Payout:</span>
              <span className="font-bold text-slate-900">{parseFloat(ownerSettlement || '0').toFixed(2)} BDT</span>
            </div>
            <div className="flex justify-between text-emerald-700">
              <span>Borrower Deposit Refund:</span>
              <span className="font-bold">
                {Math.max(0, parseFloat(String(selectedDispute?.escrow_held_amount || '0')) - parseFloat(ownerSettlement || '0')).toFixed(2)} BDT
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Official Resolution Findings & Notes *
            </label>
            <textarea
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Detail laboratory inspection outcome, technical rationale, and payout breakdown..."
              rows={3}
              className="w-full p-2.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-[#4F46E5]"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setIsResolveModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" isLoading={isResolving} onClick={handleExecuteResolution}>
              Execute Settlement & Release
            </Button>
          </div>
        </div>
      </Modal>

      {/* Evidence Lightbox Viewer */}
      {zoomImageUrl && (
        <Modal
          isOpen={!!zoomImageUrl}
          onClose={() => setZoomImageUrl(null)}
          title="Arbitration Photographic Evidence Viewer"
          subtitle="Full-resolution inspection artifact"
          maxWidth="lg"
        >
          <div className="space-y-3">
            <div className="max-h-[70vh] flex items-center justify-center bg-slate-900/90 rounded-lg overflow-hidden p-2">
              <img
                src={zoomImageUrl}
                alt="Enlarged Evidence"
                className="max-h-[68vh] w-auto max-w-full object-contain rounded"
              />
            </div>
            <div className="flex justify-between items-center text-xs text-slate-500">
              <a
                href={zoomImageUrl}
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 hover:underline flex items-center gap-1 font-medium"
              >
                Open original file in new tab <ExternalLink className="w-3 h-3" />
              </a>
              <Button variant="secondary" size="sm" onClick={() => setZoomImageUrl(null)}>
                Close Viewer
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
