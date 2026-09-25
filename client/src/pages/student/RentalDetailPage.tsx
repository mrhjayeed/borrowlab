import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useRealtimeEvent } from '../../context/RealtimeContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { StatusBadge } from '../../components/ui/Badge';
import { TrustGauge } from '../../components/ui/TrustGauge';
import { useToast } from '../../context/ToastContext';
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
  Star,
  MessageSquare,
  MessageCircle,
  Send,
  ZoomIn,
  Camera,
  ExternalLink,
  XCircle,
  Play,
  Pencil,
  Trash2,
} from 'lucide-react';

export const RentalDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { success, error } = useToast();
  const [rental, setRental] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);

  // Review Modal State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<number | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Review Delete Confirmation State
  const [isDeleteReviewModalOpen, setIsDeleteReviewModalOpen] = useState(false);
  const [deletingReviewId, setDeletingReviewId] = useState<number | null>(null);
  const [isDeletingReview, setIsDeletingReview] = useState(false);

  // Cancellation Modal State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelModalTitle, setCancelModalTitle] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // Action loading states
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  const formatExpiryBadge = (expiresAt?: string) => {
    if (!expiresAt) return null;
    const diffMs = new Date(expiresAt).getTime() - Date.now();
    if (diffMs <= 0) return 'Approval Expired';
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) {
      return `Expires in ${hours}h ${minutes}m`;
    }
    return `Expires in ${minutes}m`;
  };

  // Chat State
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const loadRental = useCallback(async () => {
    if (!id) return;
    try {
      const res = await api.getRentalDetail(id);
      setRental(res.rental);
      if (res.rental?.messages) {
        setMessages(res.rental.messages);
      }
      return res.rental;
    } catch {
      // Not found or unauthorized
    }
  }, [id]);

  const handleOpenCreateReview = () => {
    setEditingReviewId(null);
    setReviewRating(5);
    setReviewComment('');
    setIsReviewModalOpen(true);
  };

  const handleOpenEditReview = (reviewId: number, rating: number, comment: string) => {
    setEditingReviewId(reviewId);
    setReviewRating(rating);
    setReviewComment(comment || '');
    setIsReviewModalOpen(true);
  };

  const handleReviewSubmit = async () => {
    if (!rental) return;
    if (reviewComment.trim().length < 5) {
      error('Review comment too short', 'Please provide at least 5 characters sharing your peer lending experience.');
      return;
    }
    setIsSubmittingReview(true);
    try {
      if (editingReviewId) {
        await api.updateReview(editingReviewId, {
          rating: reviewRating,
          comment: reviewComment.trim(),
        });
        success('Review updated', 'Your feedback and reputation rating have been revised.');
      } else {
        await api.createReview({
          rental_id: rental.rental_id,
          rating: reviewRating,
          comment: reviewComment.trim(),
        });
        success('Review published', 'Thank you for contributing to campus trust reputation.');
      }
      setIsReviewModalOpen(false);
      setEditingReviewId(null);
      setReviewComment('');
      loadRental();
    } catch (err: any) {
      error(err.message || 'Failed to submit review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handlePromptDeleteReview = (reviewId: number) => {
    setDeletingReviewId(reviewId);
    setIsDeleteReviewModalOpen(true);
  };

  const handleConfirmDeleteReview = async () => {
    if (!deletingReviewId) return;
    setIsDeletingReview(true);
    try {
      await api.deleteReview(deletingReviewId);
      success('Review deleted', 'Your review was removed and peer trust score adjusted.');
      setIsDeleteReviewModalOpen(false);
      setDeletingReviewId(null);
      loadRental();
    } catch (err: any) {
      error(err.message || 'Failed to delete review');
    } finally {
      setIsDeletingReview(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    loadRental().finally(() => setIsLoading(false));
  }, [id, user?.userId, loadRental]);

  useEffect(() => {
    if (window.location.hash === '#chat') {
      const timer = setTimeout(() => {
        document.getElementById('chat')?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [rental?.rental_id]);

  useRealtimeEvent(['RENTAL_UPDATED', 'DISPUTE_UPDATED', 'WALLET_UPDATED'], (data: any) => {
    if (!data?.rental_id || Number(data.rental_id) === Number(id)) {
      loadRental();
    }
  });

  useRealtimeEvent('RENTAL_MESSAGE', (message: any) => {
    if (Number(message?.rental_id) === Number(id)) {
      setMessages((prev) => {
        if (prev.some((m) => Number(m.message_id) === Number(message.message_id))) return prev;
        return [...prev, message];
      });
    }
  });

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSendingMessage || !rental) return;

    const text = newMessage.trim();
    setIsSendingMessage(true);
    try {
      const res = await api.sendRentalMessage(rental.rental_id, text);
      setNewMessage('');
      setMessages((prev) => {
        if (prev.some((m) => Number(m.message_id) === Number(res.message.message_id))) return prev;
        return [...prev, res.message];
      });
    } catch (err: any) {
      error(err.message || 'Failed to send message');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleApprove = async () => {
    if (!rental) return;
    setIsApproving(true);
    try {
      await api.approveRental(rental.rental_id);
      success('Rental approved', 'Borrower can now activate the rental.');
      loadRental();
    } catch (err: any) {
      error(err.message || 'Failed to approve rental');
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rental) return;
    setIsRejecting(true);
    try {
      await api.rejectRental(rental.rental_id);
      success('Rental rejected');
      loadRental();
    } catch (err: any) {
      error(err.message || 'Failed to reject rental');
    } finally {
      setIsRejecting(false);
    }
  };

  const handleActivate = async () => {
    if (!rental) return;
    setIsActivating(true);
    try {
      await api.activateRental(rental.rental_id);
      success('Rental activated successfully', 'Physical inventory locked and escrow security deposit secured.');
      loadRental();
    } catch (err: any) {
      error(err.message || 'Failed to activate rental');
    } finally {
      setIsActivating(false);
    }
  };

  const handlePromptCancel = (isOwnerAction: boolean) => {
    setCancelModalTitle(isOwnerAction ? 'Revoke Approval' : 'Cancel Rental Request');
    setCancelReason('');
    setIsCancelModalOpen(true);
  };

  const handleExecuteCancel = async () => {
    if (!rental) return;
    setIsCancelling(true);
    try {
      await api.cancelRental(rental.rental_id, cancelReason.trim() || undefined);
      success(
        cancelModalTitle === 'Revoke Approval' ? 'Approval Revoked' : 'Rental Request Cancelled',
        'No escrow funds were locked and hardware status has been updated.'
      );
      setIsCancelModalOpen(false);
      setCancelReason('');
      loadRental();
    } catch (err: any) {
      error(err.message || 'Failed to cancel rental');
    } finally {
      setIsCancelling(false);
    }
  };

  const formatMessageTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      if (isToday) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return dateStr;
    }
  };

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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex flex-wrap items-center gap-3">
            {rental.listing_title}
            <StatusBadge status={rental.status} size="md" />
            {rental.status === 'APPROVED' && rental.expires_at && (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200"
                title={`Approval expires at ${new Date(rental.expires_at).toLocaleString()}`}
              >
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                {formatExpiryBadge(rental.expires_at)}
              </span>
            )}
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

      {/* 24-Hour Expiry Window & Action Alert for APPROVED state */}
      {rental.status === 'APPROVED' && (
        <Card className="p-4 border-amber-200 bg-amber-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 shrink-0 mt-0.5 sm:mt-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-amber-900 text-sm">Rental Approved — Activation Window Open</span>
                {rental.expires_at && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-200 text-amber-900 border border-amber-300">
                    {formatExpiryBadge(rental.expires_at)}
                  </span>
                )}
              </div>
              <p className="text-xs text-amber-800 mt-0.5">
                {Number(rental.borrower_id) === Number(user?.userId)
                  ? 'The owner approved your request. Activate now to lock your escrow deposit and confirm hardware handover.'
                  : 'You approved this rental. If the borrower does not activate within 24 hours, the approval will auto-expire.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {Number(rental.borrower_id) === Number(user?.userId) && (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                  onClick={handleActivate}
                  isLoading={isActivating}
                >
                  <Play className="w-3.5 h-3.5 fill-white" /> Activate & Lock Escrow
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-slate-700 hover:text-red-600 hover:border-red-200 gap-1"
                  onClick={() => handlePromptCancel(false)}
                >
                  <XCircle className="w-3.5 h-3.5" /> Cancel Request
                </Button>
              </>
            )}
            {Number(rental.owner_id) === Number(user?.userId) && (
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 gap-1"
                onClick={() => handlePromptCancel(true)}
              >
                <XCircle className="w-3.5 h-3.5" /> Revoke Approval
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Action Alert for REQUESTED state */}
      {rental.status === 'REQUESTED' && (
        <Card className="p-4 border-blue-200 bg-blue-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-[#4F46E5] shrink-0 mt-0.5 sm:mt-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="font-semibold text-slate-900 text-sm">Rental Request Pending Owner Review</span>
              <p className="text-xs text-slate-600 mt-0.5">
                {Number(rental.borrower_id) === Number(user?.userId)
                  ? 'Waiting for the hardware owner to approve your request. You can cancel at any time.'
                  : 'The borrower has requested this equipment. Review terms and approve to open the 24-hour activation window.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {Number(rental.owner_id) === Number(user?.userId) && (
              <>
                <Button variant="primary" size="sm" onClick={handleApprove} isLoading={isApproving}>
                  Approve Request
                </Button>
                <Button variant="destructive" size="sm" onClick={handleReject} isLoading={isRejecting}>
                  Reject
                </Button>
              </>
            )}
            {Number(rental.borrower_id) === Number(user?.userId) && (
              <Button
                variant="outline"
                size="sm"
                className="text-slate-700 hover:text-red-600 hover:border-red-200 gap-1"
                onClick={() => handlePromptCancel(false)}
              >
                <XCircle className="w-3.5 h-3.5" /> Cancel Request
              </Button>
            )}
          </div>
        </Card>
      )}

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

          {/* Direct Peer Communication & Coordination Chat */}
          <Card id="chat" className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-[6px] bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4F46E5]">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                    Peer Handover & Coordination Chat
                    <span className="text-xs text-slate-400 font-mono font-normal">
                      ({messages.length})
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Direct communication between borrower and lender for meetup location, accessories, and return
                  </p>
                </div>
              </div>

              {/* Counterparty indicator */}
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-[6px] bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700">
                {Number(rental.owner_id) === Number(user?.userId) ? (
                  <>
                    <span className="text-slate-400 text-[10px] uppercase font-semibold">Borrower:</span>
                    <span className="font-semibold text-slate-900">{rental.borrower_name}</span>
                  </>
                ) : Number(rental.borrower_id) === Number(user?.userId) ? (
                  <>
                    <span className="text-slate-400 text-[10px] uppercase font-semibold">Lender:</span>
                    <span className="font-semibold text-slate-900">{rental.owner_name}</span>
                  </>
                ) : (
                  <>
                    <span className="text-slate-400 text-[10px] uppercase font-semibold">Parties:</span>
                    <span className="font-semibold text-slate-900">{rental.borrower_name} & {rental.owner_name}</span>
                  </>
                )}
              </div>
            </div>

            {/* Messages Stream */}
            <div
              ref={messagesContainerRef}
              className="max-h-[360px] min-h-[160px] overflow-y-auto space-y-3 p-4 bg-slate-50/50 rounded-[6px] border border-slate-100"
            >
              {messages.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <MessageCircle className="w-7 h-7 text-slate-300 mx-auto" />
                  <p className="text-xs font-medium text-slate-600">No messages exchanged yet</p>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    Use this direct thread to coordinate on-campus meeting times, test hardware accessories, or ask technical questions.
                  </p>
                </div>
              ) : (
                messages.map((m: any) => {
                  const isMe = Number(m.sender_id) === Number(user?.userId);
                  const isLender = Number(m.sender_id) === Number(rental.owner_id);

                  return (
                    <div
                      key={m.message_id}
                      className={`flex flex-col max-w-[85%] ${
                        isMe ? 'ml-auto items-end' : 'mr-auto items-start'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1 font-mono">
                        <span className="font-semibold text-slate-700">
                          {isMe ? 'You' : m.sender_name}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${
                            isLender
                              ? 'bg-amber-50 border-amber-200 text-amber-800'
                              : 'bg-cyan-50 border-cyan-200 text-cyan-800'
                          }`}
                        >
                          {isLender ? 'LENDER' : 'BORROWER'}
                        </span>
                        <span>•</span>
                        <span>{formatMessageTime(m.created_at)}</span>
                      </div>
                      <div
                        className={`p-3 rounded-lg text-xs leading-relaxed ${
                          isMe
                            ? 'bg-[#4F46E5] text-white rounded-tr-none shadow-sm'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm'
                        }`}
                      >
                        {m.message}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="flex gap-2 pt-1">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message to coordinate pickup location, accessories, or return..."
                className="flex-1 h-[38px] px-3 text-xs border border-slate-300 rounded-[6px] focus:outline-none focus:border-[#4F46E5]"
              />
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSendingMessage}
                disabled={!newMessage.trim()}
                className="gap-1.5 shrink-0"
              >
                <Send className="w-3.5 h-3.5" /> Send
              </Button>
            </form>
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
                  {dmg.evidence && dmg.evidence.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 space-y-1.5">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                        Inspection Evidence Photos ({dmg.evidence.length})
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {dmg.evidence.map((ev: any) => (
                          <div
                            key={ev.evidence_id}
                            onClick={() => setZoomImageUrl(ev.file_url)}
                            className="relative group cursor-pointer overflow-hidden rounded-[6px] border border-slate-200 bg-slate-100 w-24 h-20"
                          >
                            <img
                              src={ev.file_url}
                              alt={ev.description || 'Damage photo'}
                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-medium gap-1">
                              <ZoomIn className="w-3.5 h-3.5" /> View
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </Card>
          )}

          {/* Active Disputes (If any) */}
          {rental.disputes && rental.disputes.length > 0 && (
            <Card className="p-5 space-y-3 border-amber-200 bg-amber-50/30">
              <div className="label-caps text-amber-800 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Arbitration & Dispute Cases
                </span>
                <Link
                  to="/disputes"
                  className="text-xs text-[#4F46E5] font-semibold hover:underline flex items-center gap-1"
                >
                  Open Dispute Workbench <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {rental.disputes.map((disp: any) => (
                <div key={disp.dispute_id} className="p-3 bg-white rounded border border-amber-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">Case #{disp.dispute_id} • {disp.reason}</span>
                    <StatusBadge status={disp.status} size="sm" />
                  </div>
                  <p className="text-slate-700">{disp.description}</p>
                  {disp.evidence_url && (
                    <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Attached Claim Photo:
                      </span>
                      <div
                        onClick={() => setZoomImageUrl(disp.evidence_url)}
                        className="relative group cursor-pointer overflow-hidden rounded-[6px] border border-slate-200 bg-slate-100 w-16 h-12 inline-block"
                      >
                        <img
                          src={disp.evidence_url}
                          alt="Dispute evidence"
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-medium">
                          <ZoomIn className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </Card>
          )}

          {/* Peer Reviews & Trust Section */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <h3 className="font-semibold text-slate-900 text-sm">Peer Reviews & Reputation</h3>
                <span className="text-xs text-slate-400 font-mono">
                  ({(rental.reviews || []).length})
                </span>
              </div>

              {rental.status === 'COMPLETED' && (
                <div>
                  {rental.my_review ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[6px] bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
                        <div className="flex items-center text-amber-500">
                          {[...Array(rental.my_review.rating)].map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                        Reviewed ({rental.my_review.rating}/5)
                      </span>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-600 hover:text-[#4F46E5] h-7 px-2 text-xs gap-1 border border-slate-200 hover:bg-slate-50"
                        onClick={() =>
                          handleOpenEditReview(
                            rental.my_review.review_id,
                            rental.my_review.rating,
                            rental.my_review.comment
                          )
                        }
                      >
                        <Pencil className="w-3 h-3" /> Edit
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-500 hover:text-rose-600 h-7 px-2 text-xs gap-1 border border-slate-200 hover:bg-rose-50"
                        onClick={() => handlePromptDeleteReview(rental.my_review.review_id)}
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[#4F46E5] border-indigo-200 hover:bg-indigo-50 gap-1.5"
                      onClick={handleOpenCreateReview}
                    >
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      Leave Peer Review
                    </Button>
                  )}
                </div>
              )}
            </div>

            {rental.reviews && rental.reviews.length > 0 ? (
              <div className="space-y-3">
                {rental.reviews.map((rev: any) => (
                  <div
                    key={rev.review_id}
                    className="p-3.5 rounded-[6px] bg-slate-50 border border-slate-200 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="font-semibold text-slate-800 flex items-center gap-2">
                        <span>{rev.reviewer_name}</span>
                        {Number(rev.reviewer_id) === Number(user?.userId) && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-50 text-[#4F46E5] font-normal">
                            You
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center text-amber-500">
                          {[...Array(rev.rating)].map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          ))}
                          <span className="ml-1 text-[11px] font-mono text-slate-500">
                            {rev.rating}/5
                          </span>
                        </div>

                        {Number(rev.reviewer_id) === Number(user?.userId) && (
                          <div className="flex items-center gap-1 ml-2 border-l border-slate-200 pl-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEditReview(rev.review_id, rev.rating, rev.comment)}
                              className="p-1 rounded text-slate-400 hover:text-[#4F46E5] hover:bg-white transition-colors"
                              title="Edit review"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePromptDeleteReview(rev.review_id)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete review"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">{rev.comment}</p>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1.5 font-mono">
                      <span>
                        {new Date(rev.created_at).toLocaleDateString()} at{' '}
                        {new Date(rev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {rev.updated_at && (
                        <span className="text-slate-400 italic font-sans">(edited)</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-2">
                {rental.status === 'COMPLETED'
                  ? 'No peer reviews submitted yet for this completed rental.'
                  : 'Peer reviews unlock once this hardware rental is safely returned and completed.'}
              </p>
            )}
          </Card>
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

      {/* Review Modal */}
      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => {
          setIsReviewModalOpen(false);
          setEditingReviewId(null);
        }}
        title={editingReviewId ? 'Edit Your Peer Review' : 'Submit Peer Review'}
        subtitle={`Rental #${rental?.rental_id} • ${rental?.component_name}`}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Rating (1 to 5 Stars)
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setReviewRating(star)}
                  className="p-1 text-amber-500 hover:scale-110 transition-transform"
                >
                  <Star className={`w-6 h-6 ${star <= reviewRating ? 'fill-amber-500' : 'text-slate-300'}`} />
                </button>
              ))}
              <span className="text-xs font-mono font-bold text-slate-700 ml-2">{reviewRating} / 5</span>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Review Comment</label>
              <span className={`text-[11px] font-mono ${reviewComment.trim().length < 5 ? 'text-amber-600 font-semibold' : 'text-slate-400'}`}>
                {reviewComment.trim().length}/5 chars min
              </span>
            </div>
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Describe punctuality, hardware cleanliness, communication, and overall peer experience..."
              rows={3}
              className="w-full p-2.5 text-xs border border-slate-300 rounded-[6px] focus:outline-none focus:border-[#4F46E5]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="secondary"
              onClick={() => {
                setIsReviewModalOpen(false);
                setEditingReviewId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              isLoading={isSubmittingReview}
              disabled={reviewComment.trim().length < 5}
              onClick={handleReviewSubmit}
            >
              {editingReviewId ? 'Save Changes' : 'Publish Review'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Review Confirmation Modal */}
      <Modal
        isOpen={isDeleteReviewModalOpen}
        onClose={() => {
          if (!isDeletingReview) {
            setIsDeleteReviewModalOpen(false);
            setDeletingReviewId(null);
          }
        }}
        title="Delete Your Review?"
        subtitle="Permanent removal of rating"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-900">Are you sure you want to remove your review?</p>
              <p className="mt-1 text-rose-700">
                This will delete your review and reverse the trust reputation adjustment previously given to your peer.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="secondary"
              onClick={() => {
                setIsDeleteReviewModalOpen(false);
                setDeletingReviewId(null);
              }}
              disabled={isDeletingReview}
            >
              Keep Review
            </Button>
            <Button
              variant="destructive"
              isLoading={isDeletingReview}
              onClick={handleConfirmDeleteReview}
              className="gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Review
            </Button>
          </div>
        </div>
      </Modal>

      {/* Evidence Lightbox Viewer */}
      {zoomImageUrl && (
        <Modal
          isOpen={!!zoomImageUrl}
          onClose={() => setZoomImageUrl(null)}
          title="Inspection & Damage Evidence"
          subtitle="Full-resolution photographic artifact"
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

      {/* Cancellation Confirmation Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => {
          if (!isCancelling) {
            setIsCancelModalOpen(false);
            setCancelReason('');
          }
        }}
        title={cancelModalTitle}
        subtitle={`Rental #${rental?.rental_id} • ${rental?.component_name}`}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 rounded-[6px] border border-amber-200 text-xs text-amber-800 space-y-1">
            <div className="font-semibold flex items-center gap-1.5 text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              {cancelModalTitle === 'Revoke Approval'
                ? 'Revoke approval before activation'
                : 'Cancel rental request'}
            </div>
            <p className="text-amber-700">
              {cancelModalTitle === 'Revoke Approval'
                ? 'This rental has not been activated yet. Revoking approval will return the hardware to available inventory and cancel the reservation.'
                : 'No escrow deposit or rental fees have been charged. Hardware will immediately become available for other campus peers.'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Reason for Cancellation <span className="text-slate-400 font-normal lowercase">(optional)</span>
            </label>
            <Input
              type="text"
              placeholder={
                cancelModalTitle === 'Revoke Approval'
                  ? 'e.g., Equipment needed for urgent project, schedule conflict'
                  : 'e.g., Found alternative equipment, project scope changed'
              }
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsCancelModalOpen(false);
                setCancelReason('');
              }}
              disabled={isCancelling}
            >
              Keep Rental
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleExecuteCancel}
              isLoading={isCancelling}
              className="gap-1.5"
            >
              <XCircle className="w-3.5 h-3.5" />
              {cancelModalTitle === 'Revoke Approval' ? 'Confirm Revoke' : 'Confirm Cancel'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
