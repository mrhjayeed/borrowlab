import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { TrustGauge } from '../../components/ui/TrustGauge';
import {
  Calendar,
  Lock,
  Clock,
  Building,
  AlertTriangle,
  FileText,
  User,
  CheckCircle2,
  Cpu,
  ArrowRight,
} from 'lucide-react';

export const RentalDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [rental, setRental] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    api.getRentalDetail(id)
      .then((res) => setRental(res.rental))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return <div className="h-96 bg-white rounded border border-slate-200 animate-pulse" />;
  }

  if (!rental) {
    return (
      <Card className="p-12 text-center text-xs text-slate-500">
        <h3 className="text-base font-semibold text-slate-900">Rental Record Not Found</h3>
        <p className="mt-1">You may not be authorized to inspect this rental record.</p>
        <Link to="/rentals" className="mt-3 inline-block">
          <Button variant="secondary" size="sm">Back to Rentals</Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link to="/rentals" className="hover:text-slate-900">Rentals</Link>
            <span>/</span>
            <span className="font-mono text-slate-900">Rental #{rental.rental_id}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            {rental.listing_title}
            <StatusBadge status={rental.status} size="md" />
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {rental.status === 'DISPUTED' ? (
            <Link to={`/disputes?rentalId=${rental.rental_id}`}>
              <Button variant="destructive" size="sm" className="gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> View Dispute Case
              </Button>
            </Link>
          ) : ['ACTIVE', 'RETURN_PENDING', 'RETURNED', 'OVERDUE'].includes(rental.status) ? (
            <Link to={`/disputes?rentalId=${rental.rental_id}`}>
              <Button variant="outline" size="sm" className="gap-1.5 text-amber-700 hover:text-amber-800 border-amber-300 hover:bg-amber-50">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Report Issue / Dispute
              </Button>
            </Link>
          ) : null}
          <Link to={`/listings/${rental.listing_id}`}>
            <Button variant="outline" size="sm">View Public Listing</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Audit Trail, Return Inspection, Damage */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status History Timeline (Transactional Audit Trail) */}
          <Card className="p-5 space-y-4">
            <div className="label-caps text-slate-500 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#4F46E5]" />
              Immutable Lifecycle Status Audit Trail
            </div>

            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {rental.history && rental.history.map((h: any, idx: number) => (
                <div key={h.history_id} className="relative">
                  {/* Dot */}
                  <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-[#4F46E5] ring-4 ring-indigo-50" />
                  <div className="text-xs">
                    <div className="flex items-center gap-2 font-mono">
                      <span className="font-bold text-slate-900">
                        {h.old_status ? `${h.old_status} → ${h.new_status}` : h.new_status}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-500">{new Date(h.changed_at).toLocaleString()}</span>
                    </div>
                    <div className="text-slate-600 mt-0.5">
                      <span className="font-medium text-slate-800">{h.changed_by_name}: </span>
                      {h.reason || 'Status transition logged.'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Return Record (If returned) */}
          {rental.return_id && (
            <Card className="p-5 space-y-3 bg-slate-50/50">
              <div className="label-caps text-slate-500 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Return Inspection Documentation
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs p-3 bg-white rounded border border-slate-200 font-mono">
                <div>
                  <span className="text-slate-400 block font-sans text-[10px] uppercase">Inspection Condition</span>
                  <span className="font-bold text-slate-800">{rental.condition_after_return}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-sans text-[10px] uppercase">Damage Declared</span>
                  <span className={`font-bold ${rental.damage_found ? 'text-red-600' : 'text-emerald-600'}`}>
                    {rental.damage_found ? 'YES (Damage Noted)' : 'NONE (Clean)'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-sans text-[10px] uppercase">Confirmed At</span>
                  <span className="text-slate-700">{new Date(rental.return_confirmed_at).toLocaleDateString()}</span>
                </div>
              </div>

              {rental.return_notes && (
                <div className="text-xs text-slate-600 p-2.5 bg-white rounded border border-slate-200">
                  <span className="font-semibold text-slate-800">Inspector Notes: </span>
                  {rental.return_notes}
                </div>
              )}
            </Card>
          )}

          {/* Damage Reports (If any) */}
          {rental.damageReports && rental.damageReports.length > 0 && (
            <Card className="p-5 space-y-3 border-red-200 bg-red-50/30">
              <div className="label-caps text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                Reported Damage Incidents
              </div>

              {rental.damageReports.map((dmg: any) => (
                <div key={dmg.damage_report_id} className="p-3 bg-white rounded border border-red-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-red-800">{dmg.damage_type.replace('_', ' ')}</span>
                    <span className="font-mono text-red-600 font-semibold">
                      Estimated Cost: {parseFloat(dmg.estimated_cost).toLocaleString()} BDT
                    </span>
                  </div>
                  <p className="text-slate-700">{dmg.description}</p>
                </div>
              ))}
            </Card>
          )}
        </div>

        {/* Right 1 Column: Participants & Escrow Financial Ledger */}
        <div className="space-y-5">
          {/* Escrow Telemetry Box */}
          <Card className="p-5 space-y-4 border-cyan-200 bg-[#ECFEFF]/40">
            <div className="flex items-center justify-between">
              <span className="label-caps text-[#0E7490] flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#06B6D4]" />
                Escrow Settlement Status
              </span>
              <StatusBadge status={rental.escrow_status || 'PENDING'} size="sm" />
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-600">
                <span>Held Deposit:</span>
                <span className="font-bold text-[#0E7490]">{rental.security_deposit} BDT</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Rental Fee:</span>
                <span className="font-bold text-slate-900">{rental.rental_fee} BDT</span>
              </div>
              {parseFloat(rental.late_penalty || '0') > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Late Penalty:</span>
                  <span className="font-bold">+{rental.late_penalty} BDT</span>
                </div>
              )}
            </div>

            <div className="p-2.5 bg-white rounded border border-[#A5F3FC] text-[11px] text-[#0E7490]">
              All deposits are protected by BorrowLab Escrow contracts. Double bookings are serialized at database level.
            </div>
          </Card>

          {/* Participants */}
          <Card className="p-5 space-y-4">
            <div className="label-caps text-slate-400">Rental Counterparties</div>

            {/* Owner */}
            <div className="space-y-1.5 pb-3 border-b border-slate-100 text-xs">
              <div className="text-slate-400 text-[10px] uppercase font-semibold">Hardware Owner (Lender)</div>
              <div className="font-semibold text-slate-900 text-sm">{rental.owner_name}</div>
              <div className="text-slate-500">{rental.owner_email} • {rental.owner_phone || 'No phone'}</div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-400">Trust Score:</span>
                <span className="font-mono font-bold text-emerald-600">{parseFloat(rental.owner_trust_score).toFixed(1)}%</span>
              </div>
            </div>

            {/* Borrower */}
            <div className="space-y-1.5 text-xs">
              <div className="text-slate-400 text-[10px] uppercase font-semibold">Borrower (Student)</div>
              <div className="font-semibold text-slate-900 text-sm">{rental.borrower_name}</div>
              <div className="text-slate-500">{rental.borrower_email} • {rental.borrower_phone || 'No phone'}</div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-400">Trust Score:</span>
                <span className="font-mono font-bold text-emerald-600">{parseFloat(rental.borrower_trust_score).toFixed(1)}%</span>
              </div>
            </div>
          </Card>

          {/* Hardware Identifier */}
          <Card className="p-5 space-y-3 font-mono text-xs">
            <div className="label-caps font-sans text-slate-400">Physical Asset Tag</div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Inventory Code:</span>
              <span className="font-bold text-slate-900">{rental.inventory_code}</span>
            </div>
            {rental.serial_number && (
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Serial Number:</span>
                <span className="text-slate-700">{rental.serial_number}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Replacement Value:</span>
              <span className="text-slate-700">{parseFloat(rental.replacement_value).toLocaleString()} BDT</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
