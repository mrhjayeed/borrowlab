import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useRealtimeEvent } from '../../context/RealtimeContext';
import { DamageReport } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import {
  AlertTriangle,
  FileImage,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ZoomIn,
  Camera,
  Search,
  SlidersHorizontal,
  RotateCcw,
  Filter,
  X,
} from 'lucide-react';

export const DamageQueuePage: React.FC = () => {
  const { success, error } = useToast();
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<DamageReport | null>(null);
  const [approvedCost, setApprovedCost] = useState('1500');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);

  // Filter and Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'REPORTED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'SETTLED' | 'REJECTED'>('ALL');
  const [damageTypeFilter, setDamageTypeFilter] = useState<string>('ALL');
  const [evidenceFilter, setEvidenceFilter] = useState<'ALL' | 'WITH_EVIDENCE' | 'NO_EVIDENCE'>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest_cost' | 'lowest_cost' | 'highest_approved'>('newest');

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const res = await api.getDamageQueue();
      setReports(res.reports);
    } catch {
      setReports([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  useRealtimeEvent(['RENTAL_UPDATED', 'DAMAGE_REPORT_UPDATED'], () => {
    fetchReports();
  });

  const handleReviewAction = async (status: 'ACCEPTED' | 'REJECTED' | 'UNDER_REVIEW') => {
    if (!selectedReport) return;
    setIsUpdating(true);
    try {
      await api.reviewDamageReport(selectedReport.damage_report_id, {
        status,
        approved_cost: status === 'ACCEPTED' ? parseFloat(approvedCost) : undefined,
      });

      success(`Report status updated to ${status}`);
      setSelectedReport(null);
      fetchReports();
    } catch (err: any) {
      error(err.message || 'Failed to update report');
    } finally {
      setIsUpdating(false);
    }
  };

  const kpis = useMemo(() => {
    const total = reports.length;
    const pending = reports.filter((r) => ['REPORTED', 'UNDER_REVIEW'].includes(r.status)).length;
    const reported = reports.filter((r) => r.status === 'REPORTED').length;
    const underReview = reports.filter((r) => r.status === 'UNDER_REVIEW').length;
    const accepted = reports.filter((r) => r.status === 'ACCEPTED').length;
    const settled = reports.filter((r) => r.status === 'SETTLED').length;
    const rejected = reports.filter((r) => r.status === 'REJECTED').length;
    const withEvidence = reports.filter((r) => r.evidence && r.evidence.length > 0).length;
    const totalEstimatedCost = reports.reduce(
      (sum, r) => sum + (parseFloat(String(r.estimated_cost || '0')) || 0),
      0
    );
    const totalApprovedCost = reports.reduce(
      (sum, r) => sum + (parseFloat(String(r.approved_cost || '0')) || 0),
      0
    );

    return {
      total,
      pending,
      reported,
      underReview,
      accepted,
      settled,
      rejected,
      withEvidence,
      totalEstimatedCost,
      totalApprovedCost,
    };
  }, [reports]);

  const filteredReports = useMemo(() => {
    let result = [...reports];

    // Status filter
    if (statusFilter === 'PENDING') {
      result = result.filter((r) => ['REPORTED', 'UNDER_REVIEW'].includes(r.status));
    } else if (statusFilter !== 'ALL') {
      result = result.filter((r) => r.status === statusFilter);
    }

    // Damage type filter
    if (damageTypeFilter !== 'ALL') {
      result = result.filter((r) => r.damage_type === damageTypeFilter);
    }

    // Evidence filter
    if (evidenceFilter === 'WITH_EVIDENCE') {
      result = result.filter((r) => r.evidence && r.evidence.length > 0);
    } else if (evidenceFilter === 'NO_EVIDENCE') {
      result = result.filter((r) => !r.evidence || r.evidence.length === 0);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((r) => {
        const idMatch = String(r.damage_report_id).includes(q) || `#${r.damage_report_id}`.includes(q);
        const codeMatch = r.inventory_code?.toLowerCase().includes(q);
        const titleMatch = r.listing_title?.toLowerCase().includes(q);
        const compMatch = r.component_name?.toLowerCase().includes(q);
        const reporterMatch = r.reported_by_name?.toLowerCase().includes(q);
        const ownerMatch = r.owner_name?.toLowerCase().includes(q);
        const borrowerMatch = r.borrower_name?.toLowerCase().includes(q);
        const typeMatch = r.damage_type?.toLowerCase().replace('_', ' ').includes(q);
        const descMatch = r.description?.toLowerCase().includes(q);
        return idMatch || codeMatch || titleMatch || compMatch || reporterMatch || ownerMatch || borrowerMatch || typeMatch || descMatch;
      });
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.reported_at).getTime() - new Date(a.reported_at).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.reported_at).getTime() - new Date(b.reported_at).getTime();
      }
      if (sortBy === 'highest_cost') {
        return (parseFloat(String(b.estimated_cost || '0')) || 0) - (parseFloat(String(a.estimated_cost || '0')) || 0);
      }
      if (sortBy === 'lowest_cost') {
        return (parseFloat(String(a.estimated_cost || '0')) || 0) - (parseFloat(String(b.estimated_cost || '0')) || 0);
      }
      if (sortBy === 'highest_approved') {
        return (parseFloat(String(b.approved_cost || '0')) || 0) - (parseFloat(String(a.approved_cost || '0')) || 0);
      }
      return 0;
    });

    return result;
  }, [reports, statusFilter, damageTypeFilter, evidenceFilter, searchQuery, sortBy]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    statusFilter !== 'ALL' ||
    damageTypeFilter !== 'ALL' ||
    evidenceFilter !== 'ALL' ||
    sortBy !== 'newest';

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setDamageTypeFilter('ALL');
    setEvidenceFilter('ALL');
    setSortBy('newest');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Damage Reports Queue</h1>
            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[11px] font-bold uppercase tracking-wider border border-amber-200">
              Staff Surface
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Review physical equipment degradation, photo evidence, and calibrate approved repair costs
          </p>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <Card className="p-3.5 bg-white border-slate-200">
          <div className="text-[11px] font-medium text-slate-500">Total Claims</div>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono">{kpis.total}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Reported incidents</div>
        </Card>
        <Card className="p-3.5 bg-amber-50/50 border-amber-200">
          <div className="text-[11px] font-medium text-amber-800">Pending Review</div>
          <div className="text-xl font-bold text-amber-900 mt-1 font-mono">{kpis.pending}</div>
          <div className="text-[10px] text-amber-700/80 mt-0.5">{kpis.reported} new • {kpis.underReview} reviewing</div>
        </Card>
        <Card className="p-3.5 bg-indigo-50/50 border-indigo-200">
          <div className="text-[11px] font-medium text-indigo-800">With Photos</div>
          <div className="text-xl font-bold text-[#4F46E5] mt-1 font-mono">{kpis.withEvidence}</div>
          <div className="text-[10px] text-indigo-600 mt-0.5">Uploaded proof</div>
        </Card>
        <Card className="p-3.5 bg-emerald-50/50 border-emerald-200">
          <div className="text-[11px] font-medium text-emerald-800">Accepted Claims</div>
          <div className="text-xl font-bold text-emerald-900 mt-1 font-mono">{kpis.accepted + kpis.settled}</div>
          <div className="text-[10px] text-emerald-600 mt-0.5">{kpis.settled} already settled</div>
        </Card>
        <Card className="p-3.5 bg-rose-50/50 border-rose-200 col-span-2 sm:col-span-1">
          <div className="text-[11px] font-medium text-rose-800">Claimed Value</div>
          <div className="text-lg font-bold text-rose-900 mt-1 font-mono">
            {kpis.totalEstimatedCost.toLocaleString()} <span className="text-xs">BDT</span>
          </div>
          <div className="text-[10px] text-rose-600/80 mt-0.5">Total estimated loss</div>
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
              placeholder="Search Report #, inventory code, user names, description..."
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
              { id: 'ALL', label: 'All Reports', count: kpis.total },
              { id: 'PENDING', label: 'Pending Review', count: kpis.pending },
              { id: 'REPORTED', label: 'Reported', count: kpis.reported },
              { id: 'UNDER_REVIEW', label: 'Reviewing', count: kpis.underReview },
              { id: 'ACCEPTED', label: 'Accepted', count: kpis.accepted },
              { id: 'SETTLED', label: 'Settled', count: kpis.settled },
              { id: 'REJECTED', label: 'Rejected', count: kpis.rejected },
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

        {/* Row 2: Secondary Dropdowns (Damage Type, Evidence, Sort) & Reset */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-slate-500 font-medium">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Filter:</span>
            </div>

            {/* Damage Type Dropdown */}
            <select
              value={damageTypeFilter}
              onChange={(e) => setDamageTypeFilter(e.target.value)}
              className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-[#4F46E5]"
            >
              <option value="ALL">All Damage Classifications</option>
              <option value="MINOR_DAMAGE">Minor Degradation</option>
              <option value="MAJOR_DAMAGE">Major Damage</option>
              <option value="MISSING_ACCESSORY">Missing Accessory</option>
              <option value="LOST">Lost Equipment</option>
              <option value="NON_FUNCTIONAL">Non Functional</option>
              <option value="BURNED">Burned / Electrical Defect</option>
              <option value="PHYSICAL_DAMAGE">Cracked / Physical Damage</option>
              <option value="OTHER">Other Discrepancy</option>
            </select>

            {/* Evidence Filter */}
            <select
              value={evidenceFilter}
              onChange={(e) => setEvidenceFilter(e.target.value as any)}
              className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-[#4F46E5]"
            >
              <option value="ALL">All Evidence Statuses</option>
              <option value="WITH_EVIDENCE">Has Photographic Evidence</option>
              <option value="NO_EVIDENCE">No Photos Uploaded</option>
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
                <option value="highest_cost">Sort: Estimated Cost (High to Low)</option>
                <option value="lowest_cost">Sort: Estimated Cost (Low to High)</option>
                <option value="highest_approved">Sort: Approved Cost (High to Low)</option>
              </select>
            </div>
          </div>

          {/* Counts & Reset */}
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-500 font-mono">
              Showing <strong className="text-slate-800">{filteredReports.length}</strong> of{' '}
              <strong className="text-slate-800">{reports.length}</strong>
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

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-28 bg-white rounded border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <Card className="p-12 text-center text-xs text-slate-500 space-y-3">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
          <h3 className="text-base font-semibold text-slate-900">No damage reports under review</h3>
          <p className="max-w-xs mx-auto text-slate-400">
            All returned hardware units have either passed inspection or been settled.
          </p>
        </Card>
      ) : filteredReports.length === 0 ? (
        <Card className="p-10 text-center text-xs text-slate-500 space-y-3 bg-white border-slate-200 shadow-level-1">
          <Search className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="text-base font-semibold text-slate-800">No damage reports match filters</h3>
          <p className="max-w-xs mx-auto text-slate-400">
            No incident reports meet your search keyword or selected filter parameters.
          </p>
          <Button variant="secondary" size="sm" onClick={resetFilters} className="gap-1.5 mx-auto">
            <RotateCcw className="w-3.5 h-3.5" />
            Reset All Filters
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((rep) => (
            <Card key={rep.damage_report_id} className="p-5 space-y-4 hover:border-slate-300 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="mono-data-sm text-red-600 font-bold">Report #{rep.damage_report_id}</span>
                  <span className="text-slate-300">•</span>
                  <span className="mono-data-sm text-slate-700">{rep.inventory_code}</span>
                  <span className="text-slate-300">•</span>
                  <span className="label-caps text-slate-600">{rep.damage_type.replace('_', ' ')}</span>
                  <span className="text-slate-300">•</span>
                  <StatusBadge status={rep.status} size="sm" />
                </div>

                <div className="flex items-center gap-3 text-xs font-mono">
                  <span>Claimed: <strong className="text-slate-900">{parseFloat(String(rep.estimated_cost)).toLocaleString()} BDT</strong></span>
                  {rep.approved_cost && (
                    <span className="text-emerald-700">Approved: <strong>{parseFloat(String(rep.approved_cost)).toLocaleString()} BDT</strong></span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="md:col-span-2 space-y-2">
                  <h3 className="text-sm font-semibold text-slate-900">{rep.listing_title}</h3>
                  <p className="text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-100 leading-relaxed">
                    {rep.description}
                  </p>

                  <div className="text-[11px] text-slate-500">
                    Reported by: <span className="font-semibold text-slate-700">{rep.reported_by_name}</span> (Owner: {rep.owner_name} / Borrower: {rep.borrower_name})
                  </div>
                </div>

                {/* Evidence Column */}
                <div className="space-y-2">
                  <span className="label-caps text-slate-400 block">Uploaded Evidence</span>
                  {rep.evidence && rep.evidence.length > 0 ? (
                    <div className="space-y-2">
                      {rep.evidence.map((ev) => (
                        <div
                          key={ev.evidence_id}
                          onClick={() => setZoomImageUrl(ev.file_url)}
                          className="flex items-center gap-2.5 p-2 rounded bg-slate-50 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 cursor-pointer transition-all group"
                        >
                          <div className="w-10 h-10 rounded overflow-hidden bg-slate-200 shrink-0 border border-slate-300 relative">
                            <img src={ev.file_url} alt="Evidence" className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-slate-800 truncate group-hover:text-[#4F46E5]">
                              {ev.description || 'Inspection photograph'}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1">
                              <ZoomIn className="w-3 h-3 text-indigo-500" /> Click to inspect photo
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-slate-400 text-xs italic">No digital photo uploaded</div>
                  )}
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSelectedReport(rep);
                    setApprovedCost(String(rep.estimated_cost));
                  }}
                >
                  Calibrate Approved Cost & Ruling
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Review Modal */}
      <Modal
        isOpen={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        title="Calibrate Damage Claim"
        subtitle={`Report #${selectedReport?.damage_report_id} • ${selectedReport?.inventory_code}`}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <Input
            label="Approved Repair Cost (BDT)"
            type="number"
            value={approvedCost}
            onChange={(e) => setApprovedCost(e.target.value)}
            min="0"
          />

          <div className="flex flex-col gap-2 pt-2">
            <Button
              variant="primary"
              isLoading={isUpdating}
              onClick={() => handleReviewAction('ACCEPTED')}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Accept Report & Approve Cost
            </Button>
            <Button
              variant="destructive"
              isLoading={isUpdating}
              onClick={() => handleReviewAction('REJECTED')}
            >
              Reject Damage Claim
            </Button>
            <Button
              variant="secondary"
              onClick={() => setSelectedReport(null)}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Evidence Lightbox Viewer */}
      {zoomImageUrl && (
        <Modal
          isOpen={!!zoomImageUrl}
          onClose={() => setZoomImageUrl(null)}
          title="Hardware Damage Evidence Viewer"
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
