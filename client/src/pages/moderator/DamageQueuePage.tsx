import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';

export const DamageQueuePage: React.FC = () => {
  const { success, error } = useToast();
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<DamageReport | null>(null);
  const [approvedCost, setApprovedCost] = useState('1500');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);

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
      ) : (
        <div className="space-y-4">
          {reports.map((rep) => (
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
