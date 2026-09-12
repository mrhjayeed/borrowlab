import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';

export const DisputesQueuePage: React.FC = () => {
  const { user } = useAuth();
  const { success, error } = useToast();

  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
    if (!selectedDispute || !modMessage.trim()) return;

    setIsSendingModMsg(true);
    try {
      await api.postDisputeMessage(selectedDispute.dispute_id, `[MODERATOR DIRECTIVE]: ${modMessage.trim()}`);
      setModMessage('');
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Queue List */}
        <div className="space-y-3">
          <div className="label-caps text-slate-400 px-1">Case Roster ({disputes.length})</div>
          {disputes.map((d) => (
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
          ))}
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

              {/* Thread of Multi-Party Messages */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/30">
                {selectedDispute.messages && selectedDispute.messages.map((m) => {
                  const isStaff = m.sender_roles?.some((r) => ['ADMIN', 'MODERATOR'].includes(r));
                  return (
                    <div key={m.message_id} className="p-3 rounded-lg border bg-white shadow-level-1 text-xs space-y-1">
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
                      <p className="text-slate-700 leading-relaxed">{m.message}</p>
                    </div>
                  );
                })}
              </div>

              {/* Moderator Directive Bar */}
              <form onSubmit={handleSendModeratorMessage} className="p-3 border-t border-slate-200 bg-white flex gap-2">
                <input
                  type="text"
                  value={modMessage}
                  onChange={(e) => setModMessage(e.target.value)}
                  placeholder="Post formal moderator request or evidence inquiry..."
                  className="flex-1 h-[36px] px-3 text-xs border border-slate-300 rounded focus:outline-none focus:border-[#4F46E5]"
                />
                <Button type="submit" variant="secondary" size="md" isLoading={isSendingModMsg} className="gap-1">
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
    </div>
  );
};
