import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
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

  // New Dispute Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [eligibleRentals, setEligibleRentals] = useState<Rental[]>([]);
  const [selectedRentalId, setSelectedRentalId] = useState<number | ''>('');
  const [disputeReason, setDisputeReason] = useState<string>('DAMAGE');
  const [requestedAmount, setRequestedAmount] = useState('1500');
  const [disputeDescription, setDisputeDescription] = useState('');
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);

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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDispute || !newMessage.trim()) return;

    setIsSendingMessage(true);
    try {
      await api.postDisputeMessage(selectedDispute.dispute_id, newMessage.trim());
      setNewMessage('');
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
      });

      success('Dispute submitted', 'Escrow deposit frozen and moderator assigned to review.');
      setIsCreateModalOpen(false);
      setDisputeDescription('');
      fetchDisputes();
      loadDisputeDetail(res.dispute.dispute_id);
    } catch (err: any) {
      const msg = err.response?.data?.details?.description?._errors?.[0]
        || err.response?.data?.error
        || err.message
        || 'Failed to open dispute';
      error(msg);
    } finally {
      setIsSubmittingDispute(false);
    }
  };

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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Dispute List (Left 1 col) */}
          <div className="space-y-3">
            <div className="label-caps text-slate-400 px-1">Active Cases ({disputes.length})</div>
            {disputes.map((d) => (
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
            ))}
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
                          {m.message}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Thread Message Input */}
                <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 bg-white flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type message for borrower, owner, and assigned moderator..."
                    className="flex-1 h-[36px] px-3 text-xs border border-slate-300 rounded-[6px] focus:outline-none focus:border-[#4F46E5]"
                  />
                  <Button type="submit" variant="primary" size="md" isLoading={isSendingMessage} className="gap-1">
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
      )}

      {/* File Dispute Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
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

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="secondary" type="button" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" type="submit" isLoading={isSubmittingDispute}>
              Submit Claim
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
