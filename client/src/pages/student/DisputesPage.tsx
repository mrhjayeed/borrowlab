import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useRealtimeEvent } from '../../context/RealtimeContext';
import { useToast } from '../../context/ToastContext';
import { Dispute, Rental } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import {
  AlertTriangle,
  MessageSquare,
  PlusCircle,
  Send,
  Lock,
  Clock,
  CheckCircle2,
  ShieldAlert,
  Camera,
  UploadCloud,
  X,
  Loader2,
  Paperclip,
  ZoomIn,
  ExternalLink,
  Search,
  SlidersHorizontal,
  RotateCcw,
  Filter,
} from 'lucide-react';

export const DisputesPage: React.FC = () => {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [searchParams] = useSearchParams();

  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Filters and Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'RESOLVED' | 'CLOSED'>('ALL');
  const [reasonFilter, setReasonFilter] = useState<string>('ALL');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'OPENED_BY_ME' | 'AGAINST_ME'>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest_claim' | 'lowest_claim'>('newest');

  // Evidence Lightbox modal
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);

  // Chat message photo attachment state
  const [chatAttachmentUrl, setChatAttachmentUrl] = useState('');
  const [chatAttachmentPreview, setChatAttachmentPreview] = useState<string | null>(null);
  const [chatAttachmentFile, setChatAttachmentFile] = useState<File | null>(null);
  const [isUploadingChatAttachment, setIsUploadingChatAttachment] = useState(false);
  const chatAttachmentInputRef = useRef<HTMLInputElement>(null);

  // New Dispute Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [eligibleRentals, setEligibleRentals] = useState<Rental[]>([]);
  const [selectedRentalId, setSelectedRentalId] = useState<number | ''>('');
  const [disputeReason, setDisputeReason] = useState<string>('DAMAGE');
  const [requestedAmount, setRequestedAmount] = useState('1500');
  const [disputeDescription, setDisputeDescription] = useState('');
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);

  // New Dispute Evidence Upload State
  const [createEvidenceUrl, setCreateEvidenceUrl] = useState('');
  const [createFilePreview, setCreateFilePreview] = useState<string | null>(null);
  const [createSelectedFile, setCreateSelectedFile] = useState<File | null>(null);
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);
  const [isEvidenceDragOver, setIsEvidenceDragOver] = useState(false);
  const evidenceInputRef = useRef<HTMLInputElement>(null);

  const handleCreateFileSelect = async (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      error('Invalid image format', 'Please select a JPG, PNG, WEBP, or GIF image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      error('File too large', 'Image size must be under 5MB');
      return;
    }

    setCreateSelectedFile(file);
    const localUrl = URL.createObjectURL(file);
    setCreateFilePreview(localUrl);

    setIsUploadingEvidence(true);
    try {
      const res = await api.uploadImage(file);
      setCreateEvidenceUrl(res.url);
      success('Evidence uploaded', `${file.name} ready for claim submission`);
    } catch (err: any) {
      error(err.message || 'Failed to upload evidence');
    } finally {
      setIsUploadingEvidence(false);
    }
  };

  const handleClearCreateEvidence = () => {
    if (createFilePreview && createFilePreview.startsWith('blob:')) {
      URL.revokeObjectURL(createFilePreview);
    }
    setCreateSelectedFile(null);
    setCreateFilePreview(null);
    setCreateEvidenceUrl('');
    if (evidenceInputRef.current) {
      evidenceInputRef.current.value = '';
    }
  };

  const handleChatAttachmentSelect = async (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      error('Invalid image format', 'Please select a JPG, PNG, WEBP, or GIF image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      error('File too large', 'Image size must be under 5MB');
      return;
    }

    setChatAttachmentFile(file);
    const localUrl = URL.createObjectURL(file);
    setChatAttachmentPreview(localUrl);

    setIsUploadingChatAttachment(true);
    try {
      const res = await api.uploadImage(file);
      setChatAttachmentUrl(res.url);
      success('Attachment ready', `${file.name} uploaded`);
    } catch (err: any) {
      error(err.message || 'Failed to attach image');
    } finally {
      setIsUploadingChatAttachment(false);
    }
  };

  const handleClearChatAttachment = () => {
    if (chatAttachmentPreview && chatAttachmentPreview.startsWith('blob:')) {
      URL.revokeObjectURL(chatAttachmentPreview);
    }
    setChatAttachmentFile(null);
    setChatAttachmentPreview(null);
    setChatAttachmentUrl('');
    if (chatAttachmentInputRef.current) {
      chatAttachmentInputRef.current.value = '';
    }
  };

  const fetchDisputes = async () => {
    setIsLoading(true);
    try {
      const res = await api.getMyDisputes();
      setDisputes(res.disputes);
      if (res.disputes.length > 0 && !selectedDispute) {
        loadDisputeDetail(res.disputes[0].dispute_id);
      }
    } catch {
      setDisputes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDisputeDetail = async (id: number) => {
    try {
      const res = await api.getDisputeDetail(id);
      setSelectedDispute(res.dispute);
    } catch (err: any) {
      error(err.message || 'Failed to load dispute conversation');
    }
  };

  useEffect(() => {
    fetchDisputes();
    // Load eligible rentals
    api.getMyRentals().then((res) => {
      // Allow disputes on rentals in return_pending, returned, active, or overdue
      const eligible = res.rentals.filter((r) =>
        ['ACTIVE', 'RETURN_PENDING', 'RETURNED', 'OVERDUE', 'DISPUTED'].includes(r.status)
      );
      setEligibleRentals(eligible);
    }).catch(() => {});
  }, []);

  // Handle URL query parameter ?rentalId=...
  const rentalIdFromQuery = searchParams.get('rentalId');
  useEffect(() => {
    if (rentalIdFromQuery) {
      setSelectedRentalId(Number(rentalIdFromQuery));
      setIsCreateModalOpen(true);
    }
  }, [rentalIdFromQuery]);

  // Real-time live dispute chat updates without page reload
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

  // Real-time status / ruling updates
  useRealtimeEvent(['DISPUTE_UPDATED', 'DISPUTE_RESOLVED'], (data: any) => {
    fetchDisputes();
    if (selectedDispute && Number(selectedDispute.dispute_id) === Number(data?.dispute_id)) {
      loadDisputeDetail(Number(data.dispute_id));
    }
  });

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newMessage.trim();
    if (!selectedDispute || (!text && !chatAttachmentUrl)) return;

    setIsSendingMessage(true);
    try {
      await api.postDisputeMessage(
        selectedDispute.dispute_id,
        text || 'Attached photographic evidence',
        chatAttachmentUrl || undefined
      );
      setNewMessage('');
      handleClearChatAttachment();
      loadDisputeDetail(selectedDispute.dispute_id);
    } catch (err: any) {
      error(err.message || 'Failed to post message');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleCreateDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRentalId) {
      error('Please select a rental to dispute');
      return;
    }
    if (disputeDescription.trim().length < 5) {
      error('Description too short', 'Please provide at least 5 characters detailing the case.');
      return;
    }

    setIsSubmittingDispute(true);
    try {
      const res = await api.createDispute({
        rental_id: Number(selectedRentalId),
        reason: disputeReason,
        description: disputeDescription.trim(),
        requested_amount: parseFloat(requestedAmount) || 0,
        evidence_url: createEvidenceUrl || undefined,
      });

      success('Dispute submitted', 'Escrow deposit frozen and moderator assigned to review.');
      setIsCreateModalOpen(false);
      setDisputeDescription('');
      handleClearCreateEvidence();
      fetchDisputes();
      loadDisputeDetail(res.dispute.dispute_id);
    } catch (err: any) {
      const msg = err.response?.data?.details?.description?._errors?.[0]
        || err.response?.data?.error
        || err.message
        || 'Failed to open dispute';
    } finally {
      setIsSubmittingDispute(false);
    }
  };

  const counts = useMemo(() => {
    return {
      all: disputes.length,
      active: disputes.filter((d) => ['OPEN', 'UNDER_REVIEW'].includes(d.status)).length,
      resolved: disputes.filter((d) =>
        ['RESOLVED_OWNER', 'RESOLVED_BORROWER', 'PARTIAL_SETTLEMENT'].includes(d.status)
      ).length,
      closed: disputes.filter((d) => ['CLOSED', 'REJECTED'].includes(d.status)).length,
    };
  }, [disputes]);

  const filteredDisputes = useMemo(() => {
    let result = [...disputes];

    // Status filter
    if (statusFilter === 'ACTIVE') {
      result = result.filter((d) => ['OPEN', 'UNDER_REVIEW'].includes(d.status));
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

    // Role filter
    if (roleFilter === 'OPENED_BY_ME') {
      result = result.filter((d) => Number(d.opened_by) === Number(user?.userId));
    } else if (roleFilter === 'AGAINST_ME') {
      result = result.filter((d) => Number(d.against_user_id) === Number(user?.userId) || Number(d.opened_by) !== Number(user?.userId));
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((d) => {
        const idMatch = String(d.dispute_id).includes(q) || `#${d.dispute_id}`.includes(q);
        const compMatch = d.component_name?.toLowerCase().includes(q);
        const titleMatch = d.listing_title?.toLowerCase().includes(q);
        const reasonMatch = d.reason?.toLowerCase().replace('_', ' ').includes(q);
        const openedByMatch = d.opened_by_name?.toLowerCase().includes(q);
        const againstMatch = d.against_user_name?.toLowerCase().includes(q);
        const descMatch = d.description?.toLowerCase().includes(q);
        return idMatch || compMatch || titleMatch || reasonMatch || openedByMatch || againstMatch || descMatch;
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
      if (sortBy === 'highest_claim') {
        return (parseFloat(String(b.requested_amount)) || 0) - (parseFloat(String(a.requested_amount)) || 0);
      }
      if (sortBy === 'lowest_claim') {
        return (parseFloat(String(a.requested_amount)) || 0) - (parseFloat(String(b.requested_amount)) || 0);
      }
      return 0;
    });

    return result;
  }, [disputes, statusFilter, reasonFilter, roleFilter, searchQuery, sortBy, user?.userId]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    statusFilter !== 'ALL' ||
    reasonFilter !== 'ALL' ||
    roleFilter !== 'ALL' ||
    sortBy !== 'newest';

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setReasonFilter('ALL');
    setRoleFilter('ALL');
    setSortBy('newest');
  };

  // Synchronize selection with filtered list
  useEffect(() => {
    if (filteredDisputes.length > 0) {
      const isSelectedInFiltered = filteredDisputes.some((d) => d.dispute_id === selectedDispute?.dispute_id);
      if (!isSelectedInFiltered) {
        loadDisputeDetail(filteredDisputes[0].dispute_id);
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dispute Resolution Workbench</h1>
          <p className="text-xs text-slate-500 mt-1">
            Arbitrated claims for damaged components, missing accessories, and deposit adjustments
          </p>
        </div>

        <Button variant="destructive" size="sm" onClick={() => setIsCreateModalOpen(true)} className="gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" />
          File New Dispute
        </Button>
      </div>

      {isLoading ? (
        <div className="h-96 bg-white rounded border border-slate-200 animate-pulse" />
      ) : disputes.length === 0 ? (
        <Card className="p-12 text-center text-xs text-slate-500 space-y-3">
          <ShieldAlert className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="text-base font-semibold text-slate-900">No active or past disputes</h3>
          <p className="max-w-xs mx-auto text-slate-400">
            Disputes freeze escrow security deposits and allow moderated multi-party communication.
          </p>
          <Button variant="secondary" size="sm" onClick={() => setIsCreateModalOpen(true)}>
            File a Dispute Claim
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Filter & Search Toolbar */}
          <Card className="p-3.5 space-y-3 bg-white border-slate-200 shadow-level-1">
            {/* Row 1: Search & Status Pills */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search Box */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search Case #, component, user, description..."
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
                  { id: 'ALL', label: 'All', count: counts.all },
                  { id: 'ACTIVE', label: 'Active', count: counts.active },
                  { id: 'RESOLVED', label: 'Resolved', count: counts.resolved },
                  { id: 'CLOSED', label: 'Closed', count: counts.closed },
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

            {/* Row 2: Secondary Dropdowns (Reason, Role, Sort) & Reset */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <span>Filter by:</span>
                </div>

                {/* Reason Dropdown */}
                <select
                  value={reasonFilter}
                  onChange={(e) => setReasonFilter(e.target.value)}
                  className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-[#4F46E5]"
                >
                  <option value="ALL">All Claim Reasons</option>
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

                {/* Role / Party Dropdown */}
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as any)}
                  className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-[#4F46E5]"
                >
                  <option value="ALL">All Roles</option>
                  <option value="OPENED_BY_ME">Filed by Me (Claimant)</option>
                  <option value="AGAINST_ME">Filed Against Me (Respondent)</option>
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
                    <option value="highest_claim">Sort: Claim (High to Low)</option>
                    <option value="lowest_claim">Sort: Claim (Low to High)</option>
                  </select>
                </div>
              </div>

              {/* Status / Reset Action */}
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
            {/* Dispute List (Left 1 col) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="label-caps text-slate-400">
                  {statusFilter === 'ALL' ? 'All Disputes' : `${statusFilter.toLowerCase()} Cases`} ({filteredDisputes.length})
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
                  <div className="font-semibold text-slate-800 text-sm">No matching disputes found</div>
                  <p className="text-slate-400 text-xs max-w-xs mx-auto">
                    No disputes match your current filter parameters or search keyword.
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
                    onClick={() => loadDisputeDetail(d.dispute_id)}
                    className={`p-4 cursor-pointer transition-all ${
                      selectedDispute?.dispute_id === d.dispute_id
                        ? 'border-[#4F46E5] ring-2 ring-indigo-50 shadow-level-2'
                        : 'hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <span className="mono-data-sm text-[#4F46E5] font-semibold">Case #{d.dispute_id}</span>
                      <StatusBadge status={d.status} size="sm" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 mt-1 line-clamp-1">
                      {d.reason.replace('_', ' ')} • {d.component_name}
                    </h3>
                    <div className="text-xs text-slate-500 mt-1 line-clamp-2">{d.description}</div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-100 mt-2">
                      <span>Claim: {d.requested_amount} BDT</span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> {d.message_count || 0}
                      </span>
                    </div>
                  </Card>
                ))
              )}
            </div>

          {/* Dispute Detail & Thread (Right 2 cols) */}
          <div className="lg:col-span-2">
            {selectedDispute ? (
              <Card className="flex flex-col h-[600px] overflow-hidden">
                {/* Thread Header */}
                <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#4F46E5]">Case #{selectedDispute.dispute_id}</span>
                      <span className="text-slate-300">•</span>
                      <span className="label-caps text-slate-600">{selectedDispute.reason}</span>
                      <span className="text-slate-300">•</span>
                      <StatusBadge status={selectedDispute.status} size="sm" />
                    </div>
                    <h2 className="text-sm font-bold text-slate-900 mt-0.5">{selectedDispute.listing_title}</h2>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Opened by: <span className="font-medium text-slate-700">{selectedDispute.opened_by_name}</span> against <span className="font-medium text-slate-700">{selectedDispute.against_user_name}</span>
                    </div>
                  </div>

                  <div className="text-right font-mono text-xs">
                    <div className="text-[10px] text-[#0E7490] uppercase font-sans font-semibold">Frozen Escrow</div>
                    <div className="font-bold text-[#0E7490]">{parseFloat(String(selectedDispute.escrow_held_amount || '0')).toFixed(2)} BDT</div>
                  </div>
                </div>

                {/* Primary Case Evidence Banner */}
                {selectedDispute.evidence_url && (
                  <div className="px-4 py-2.5 bg-indigo-50/70 border-b border-indigo-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-indigo-900 font-medium">
                      <Camera className="w-4 h-4 text-[#4F46E5] shrink-0" />
                      <span>Primary Claim Photographic Evidence</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setZoomImageUrl(selectedDispute.evidence_url!)}
                      className="flex items-center gap-2 px-2.5 py-1 rounded-[6px] bg-white border border-indigo-200 text-xs font-semibold text-[#4F46E5] hover:bg-indigo-50 shadow-sm transition-all"
                    >
                      <img
                        src={selectedDispute.evidence_url}
                        alt="Evidence thumbnail"
                        className="w-5 h-5 rounded object-cover border border-slate-200"
                      />
                      <span>View Claim Evidence</span>
                      <ZoomIn className="w-3.5 h-3.5 text-indigo-500" />
                    </button>
                  </div>
                )}

                {/* Messages Stream */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/20">
                  {selectedDispute.messages && selectedDispute.messages.map((m) => {
                    const isMe = Number(m.sender_id) === Number(user?.userId);
                    const isStaff = m.sender_roles?.some((r) => ['ADMIN', 'MODERATOR'].includes(r));

                    return (
                      <div
                        key={m.message_id}
                        className={`flex flex-col max-w-[85%] ${
                          isMe ? 'ml-auto items-end' : 'mr-auto items-start'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-0.5 font-mono">
                          <span className="font-semibold text-slate-700">{m.sender_name}</span>
                          {isStaff && (
                            <span className="px-1.5 py-0.2 rounded bg-indigo-50 border border-indigo-200 text-[#4F46E5] font-bold text-[9px]">
                              STAFF
                            </span>
                          )}
                          <span>•</span>
                          <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div
                          className={`p-3 rounded-lg text-xs leading-relaxed ${
                            isMe
                              ? 'bg-[#4F46E5] text-white shadow-level-1'
                              : isStaff
                              ? 'bg-indigo-50 border border-indigo-200 text-slate-900'
                              : 'bg-white border border-slate-200 text-slate-800 shadow-level-1'
                          }`}
                        >
                          {m.file_url && (
                            <div className="mb-2">
                              <div
                                onClick={() => setZoomImageUrl(m.file_url!)}
                                className="relative group cursor-pointer overflow-hidden rounded-[6px] border border-black/10 bg-black/5 max-w-[240px]"
                              >
                                <img
                                  src={m.file_url}
                                  alt="Attachment"
                                  className="w-full h-36 object-cover transition-transform group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-medium gap-1">
                                  <ZoomIn className="w-4 h-4" /> Click to enlarge
                                </div>
                              </div>
                            </div>
                          )}
                          <div>{m.message}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pending Attachment Banner */}
                {chatAttachmentPreview && (
                  <div className="px-3 py-2 flex items-center gap-2 bg-indigo-50/50 border-t border-indigo-100 animate-in fade-in">
                    <div className="relative w-10 h-10 rounded overflow-hidden border border-indigo-200 bg-white shrink-0">
                      <img src={chatAttachmentPreview} alt="Pending attachment" className="w-full h-full object-cover" />
                      {isUploadingChatAttachment && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-700 font-medium truncate flex-1">
                      {chatAttachmentFile?.name || 'Photo attached'}
                    </span>
                    <button
                      type="button"
                      onClick={handleClearChatAttachment}
                      className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-white"
                      title="Remove attachment"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Thread Message Input */}
                <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 bg-white flex gap-2 items-center">
                  <input
                    ref={chatAttachmentInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleChatAttachmentSelect(file);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => chatAttachmentInputRef.current?.click()}
                    className="p-2 rounded-[6px] border border-slate-200 text-slate-500 hover:text-[#4F46E5] hover:bg-indigo-50 transition-colors"
                    title="Attach photographic evidence"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type message or attach photo evidence for parties & moderator..."
                    className="flex-1 h-[36px] px-3 text-xs border border-slate-300 rounded-[6px] focus:outline-none focus:border-[#4F46E5]"
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={isSendingMessage || isUploadingChatAttachment}
                    className="gap-1"
                  >
                    <Send className="w-3.5 h-3.5" /> Send
                  </Button>
                </form>
              </Card>
            ) : (
              <Card className="p-12 text-center text-xs text-slate-400">
                Select a dispute case from the left panel to inspect the threaded communication.
              </Card>
            )}
          </div>
        </div>
      </div>
    )}

      {/* File Dispute Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          handleClearCreateEvidence();
          setIsCreateModalOpen(false);
        }}
        title="File a Rental Dispute Claim"
        subtitle="Freezes security deposit in escrow until resolution is reached"
        maxWidth="md"
      >
        <form onSubmit={handleCreateDispute} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Select Disputed Rental *
            </label>
            <select
              value={selectedRentalId}
              onChange={(e) => setSelectedRentalId(Number(e.target.value) || '')}
              className="w-full h-[36px] bg-white border border-slate-300 rounded-[6px] px-2 text-xs"
              required
            >
              <option value="">-- Choose Rental --</option>
              {eligibleRentals.map((r) => (
                <option key={r.rental_id} value={r.rental_id}>
                  Rental #{r.rental_id}: {r.listing_title} ({r.inventory_code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Dispute Reason *
              </label>
              <select
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                className="w-full h-[36px] bg-white border border-slate-300 rounded-[6px] px-2 text-xs"
              >
                <option value="DAMAGE">Physical Damage</option>
                <option value="LOST_ITEM">Lost Item</option>
                <option value="MISSING_ACCESSORY">Missing Probes / Accessory</option>
                <option value="DEFECTIVE_ITEM">Defective / Non-Functional Hardware</option>
                <option value="LATE_RETURN">Unreasonable Late Return</option>
                <option value="PAYMENT_ISSUE">Deposit Dispute</option>
                <option value="OTHER">Other Conflict</option>
              </select>
            </div>

            <Input
              label="Requested Deduction (BDT)"
              type="number"
              value={requestedAmount}
              onChange={(e) => setRequestedAmount(e.target.value)}
              min="0"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Detailed Case Explanation *
              </label>
              <span className="text-[10px] text-slate-400">Min 5 characters</span>
            </div>
            <textarea
              value={disputeDescription}
              onChange={(e) => setDisputeDescription(e.target.value)}
              placeholder="State what occurred, why the hardware is disputed, and requested remedy..."
              rows={3}
              minLength={5}
              className="w-full p-2.5 text-xs border border-slate-300 rounded-[6px] focus:outline-none focus:border-[#4F46E5]"
              required
            />
          </div>

          {/* Photographic Evidence Upload Dropzone */}
          <div className="space-y-1.5 border border-slate-200 rounded-[8px] p-3 bg-slate-50/60">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-[#4F46E5]" />
              Photographic / Document Evidence (Optional)
            </label>

            {!createFilePreview && !createEvidenceUrl ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsEvidenceDragOver(true);
                }}
                onDragLeave={() => setIsEvidenceDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsEvidenceDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleCreateFileSelect(file);
                }}
                onClick={() => evidenceInputRef.current?.click()}
                className={`border-2 border-dashed rounded-[6px] p-3.5 text-center cursor-pointer transition-all ${
                  isEvidenceDragOver
                    ? 'border-[#4F46E5] bg-indigo-50/50'
                    : 'border-slate-300 hover:border-slate-400 bg-white'
                }`}
              >
                <input
                  ref={evidenceInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleCreateFileSelect(file);
                  }}
                />
                <UploadCloud className="w-5 h-5 text-[#4F46E5] mx-auto mb-1" />
                <div className="text-xs font-semibold text-slate-800">
                  Upload damage photograph or hardware condition proof
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  JPG, PNG, WEBP up to 5MB
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-white p-2 rounded-[6px] border border-slate-200">
                <div className="w-14 h-14 rounded overflow-hidden bg-slate-100 shrink-0 border border-slate-200 relative">
                  <img
                    src={createFilePreview || createEvidenceUrl}
                    alt="Evidence preview"
                    className="w-full h-full object-cover"
                  />
                  {isUploadingEvidence && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-800 truncate">
                    {createSelectedFile?.name || 'Evidence Image'}
                  </div>
                  <div className="text-[10px] text-emerald-600 font-medium">
                    {isUploadingEvidence ? 'Uploading image...' : 'Evidence attached'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClearCreateEvidence}
                  className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                handleClearCreateEvidence();
                setIsCreateModalOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" type="submit" isLoading={isSubmittingDispute}>
              Submit Claim
            </Button>
          </div>
        </form>
      </Modal>

      {/* Lightbox / Evidence Viewer Modal */}
      {zoomImageUrl && (
        <Modal
          isOpen={!!zoomImageUrl}
          onClose={() => setZoomImageUrl(null)}
          title="Photographic Evidence Viewer"
          subtitle="High-resolution case artifact inspection"
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
