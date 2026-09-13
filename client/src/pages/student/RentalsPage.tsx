import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useRealtimeEvent } from '../../context/RealtimeContext';
import { useToast } from '../../context/ToastContext';
import { Rental } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import {
  Repeat,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  RotateCcw,
  Clock,
  Lock,
  ArrowRight,
  Star,
  MessageSquare,
  Camera,
  UploadCloud,
  X,
  Loader2,
} from 'lucide-react';

export const RentalsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'owner' ? 'owner' : 'borrower';
  const { user } = useAuth();
  const { success, error } = useToast();

  const [rentals, setRentals] = useState<Rental[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Return Inspection Modal state
  const [inspectModalRental, setInspectModalRental] = useState<Rental | null>(null);
  const [conditionAfterReturn, setConditionAfterReturn] = useState('EXCELLENT');
  const [damageFound, setDamageFound] = useState(false);
  const [missingAccessories, setMissingAccessories] = useState(false);
  const [returnNotes, setReturnNotes] = useState('');
  const [damageType, setDamageType] = useState('PHYSICAL_DAMAGE');
  const [estimatedCost, setEstimatedCost] = useState('1500');
  const [isInspecting, setIsInspecting] = useState(false);

  // Evidence upload state for Return Inspection
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Review Modal state
  const [reviewModalRental, setReviewModalRental] = useState<Rental | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Cancellation Modal state
  const [cancelModalRental, setCancelModalRental] = useState<Rental | null>(null);
  const [cancelModalTitle, setCancelModalTitle] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

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

  const fetchRentals = async () => {
    setIsLoading(true);
    try {
      const res = await api.getMyRentals(activeTab);
      setRentals(res.rentals);
    } catch {
      setRentals([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRentals();
  }, [activeTab]);

  useRealtimeEvent(['RENTAL_UPDATED', 'WALLET_UPDATED'], () => {
    fetchRentals();
  });

  const handleApprove = async (rentalId: number) => {
    try {
      await api.approveRental(rentalId);
      success('Rental approved', 'Borrower can now activate the rental.');
      fetchRentals();
    } catch (err: any) {
      error(err.message || 'Failed to approve rental');
    }
  };

  const handleReject = async (rentalId: number) => {
    try {
      await api.rejectRental(rentalId);
      success('Rental rejected');
      fetchRentals();
    } catch (err: any) {
      error(err.message || 'Failed to reject rental');
    }
  };

  const handleActivate = async (rentalId: number) => {
    try {
      await api.activateRental(rentalId);
      success('Rental activated successfully', 'Physical inventory locked and escrow security deposit secured.');
      fetchRentals();
    } catch (err: any) {
      error(err.message || 'Failed to activate rental');
    }
  };

  const handleRequestReturn = async (rentalId: number) => {
    try {
      await api.requestReturn(rentalId);
      success('Return initiated', 'The owner has been notified to inspect and confirm handover.');
      fetchRentals();
    } catch (err: any) {
      error(err.message || 'Failed to initiate return');
    }
  };

  const handleFileSelect = async (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      error('Invalid image file', 'Please select a JPG, PNG, WEBP, or GIF image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      error('Image size exceeds 5MB limit');
      return;
    }

    setSelectedFile(file);
    const localUrl = URL.createObjectURL(file);
    setFilePreview(localUrl);

    setIsUploadingPhoto(true);
    try {
      const res = await api.uploadImage(file);
      setEvidenceUrl(res.url);
      success('Damage evidence attached', `${file.name} uploaded successfully`);
    } catch (err: any) {
      error(err.message || 'Failed to upload photo');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleClearSelectedPhoto = () => {
    if (filePreview && filePreview.startsWith('blob:')) {
      URL.revokeObjectURL(filePreview);
    }
    setSelectedFile(null);
    setFilePreview(null);
    setEvidenceUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirmReturnSubmit = async () => {
    if (!inspectModalRental) return;
    setIsInspecting(true);
    try {
      await api.confirmReturn(inspectModalRental.rental_id, {
        condition_after_return: conditionAfterReturn,
        damage_found: damageFound,
        missing_accessories: missingAccessories,
        return_notes: returnNotes,
        damage_type: damageFound ? damageType : undefined,
        estimated_cost: damageFound ? parseFloat(estimatedCost) : undefined,
        evidence_url: damageFound && evidenceUrl ? evidenceUrl : undefined,
      });

      if (damageFound) {
        success('Return recorded with damage', 'Damage report opened and escrow frozen for moderator arbitration.');
      } else {
        success('Return confirmed', 'Hardware inspected cleanly. Escrow released to borrower and payout credited.');
      }

      handleClearSelectedPhoto();
      setInspectModalRental(null);
      fetchRentals();
    } catch (err: any) {
      error(err.message || 'Failed to confirm return');
    } finally {
      setIsInspecting(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (!reviewModalRental) return;
    if (reviewComment.trim().length < 5) {
      error('Review comment too short', 'Please provide at least 5 characters sharing your peer lending experience.');
      return;
    }
    setIsSubmittingReview(true);
    try {
      await api.createReview({
        rental_id: reviewModalRental.rental_id,
        rating,
        comment: reviewComment.trim(),
      });
      success('Review published', 'Thank you for contributing to campus trust reputation.');
      setReviewModalRental(null);
      setReviewComment('');
      fetchRentals();
    } catch (err: any) {
      error(err.message || 'Failed to submit review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handlePromptCancel = (rental: Rental, isOwner: boolean) => {
    setCancelModalRental(rental);
    setCancelModalTitle(isOwner ? 'Revoke Approval' : 'Cancel Rental Request');
    setCancelReason('');
  };

  const handleExecuteCancel = async () => {
    if (!cancelModalRental) return;
    setIsCancelling(true);
    try {
      await api.cancelRental(cancelModalRental.rental_id, cancelReason.trim() || undefined);
      success(
        cancelModalTitle === 'Revoke Approval' ? 'Approval Revoked' : 'Rental Request Cancelled',
        'No escrow funds were locked and hardware status has been updated.'
      );
      setCancelModalRental(null);
      setCancelReason('');
      fetchRentals();
    } catch (err: any) {
      error(err.message || 'Failed to cancel rental');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Rentals & Returns</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track active lifecycles, handovers, escrow guarantees, and returns inspection
          </p>
        </div>

        {/* Dense Tabs Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-[6px] border border-slate-200">
          <button
            onClick={() => setSearchParams({ tab: 'borrower' })}
            className={`px-3.5 py-1.5 rounded-[4px] text-xs font-semibold transition-colors ${
              activeTab === 'borrower'
                ? 'bg-white text-slate-900 shadow-level-1'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Hardware I'm Borrowing
          </button>
          <button
            onClick={() => setSearchParams({ tab: 'owner' })}
            className={`px-3.5 py-1.5 rounded-[4px] text-xs font-semibold transition-colors ${
              activeTab === 'owner'
                ? 'bg-white text-slate-900 shadow-level-1'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            My Hardware Lending Units
          </button>
        </div>
      </div>

      {/* Rentals List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-white rounded border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : rentals.length === 0 ? (
        <Card className="p-12 text-center text-xs text-slate-500 space-y-3">
          <Repeat className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="text-base font-semibold text-slate-900">No rentals in this tab</h3>
          <p className="max-w-xs mx-auto text-slate-400">
            {activeTab === 'borrower'
              ? 'You have not borrowed any academic hardware yet.'
              : 'None of your listed hardware is currently in an active or requested rental state.'}
          </p>
          <Link to="/browse">
            <Button variant="primary" size="sm">Browse Hardware</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {rentals.map((rental) => {
            const isBorrower = Number(rental.borrower_id) === Number(user?.userId);
            const isOwner = Number(rental.owner_id) === Number(user?.userId);

            return (
              <Card
                key={rental.rental_id}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-5 hover:border-slate-300 transition-colors"
              >
                {/* Left info */}
                <div className="space-y-2 max-w-xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="mono-data-sm text-[#4F46E5] font-semibold">{rental.inventory_code}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs text-slate-500">{rental.component_name}</span>
                    <span className="text-slate-300">•</span>
                    <StatusBadge status={rental.status} size="sm" />
                    {rental.status === 'APPROVED' && rental.expires_at && (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200"
                        title={`Approval expires at ${new Date(rental.expires_at).toLocaleString()}`}
                      >
                        <Clock className="w-3 h-3 text-amber-600" />
                        {formatExpiryBadge(rental.expires_at)}
                      </span>
                    )}
                  </div>

                  <Link to={`/rentals/${rental.rental_id}`} className="group block">
                    <h3 className="text-base font-semibold text-slate-900 group-hover:text-[#4F46E5] transition-colors">
                      {rental.listing_title}
                    </h3>
                  </Link>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                    <div>
                      <span className="text-slate-400">Dates: </span>
                      <span className="font-mono font-medium">{rental.start_date} → {rental.due_date}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Party: </span>
                      <span className="font-medium">
                        {isBorrower ? `Owner: ${rental.owner_name}` : `Borrower: ${rental.borrower_name}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Financials & Action Buttons */}
                <div className="flex flex-col md:items-end gap-3 shrink-0">
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-sans">Rental Fee</div>
                      <div className="font-bold text-slate-900">{rental.rental_fee} BDT</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#0E7490] uppercase font-sans">Escrow Deposit</div>
                      <div className="font-bold text-[#0E7490]">{rental.security_deposit} BDT</div>
                    </div>
                  </div>

                  {/* Contextual Action Buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link to={`/rentals/${rental.rental_id}`}>
                      <Button variant="outline" size="sm">Audit Details</Button>
                    </Link>

                    <Link to={`/rentals/${rental.rental_id}#chat`}>
                      <Button variant="outline" size="sm" className="gap-1.5 text-slate-700 hover:text-[#4F46E5] hover:border-indigo-200">
                        <MessageSquare className="w-3.5 h-3.5 text-indigo-500" /> Chat
                      </Button>
                    </Link>

                    {/* Owner Approval Actions */}
                    {isOwner && rental.status === 'REQUESTED' && (
                      <>
                        <Button variant="primary" size="sm" onClick={() => handleApprove(rental.rental_id)}>
                          Approve Request
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleReject(rental.rental_id)}>
                          Reject
                        </Button>
                      </>
                    )}

                    {/* Owner Revoke Approval Action */}
                    {isOwner && rental.status === 'APPROVED' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 gap-1"
                        onClick={() => handlePromptCancel(rental, true)}
                      >
                        <XCircle className="w-3.5 h-3.5" /> Revoke Approval
                      </Button>
                    )}

                    {/* Borrower Activation Action */}
                    {isBorrower && rental.status === 'APPROVED' && (
                      <Button
                        variant="primary"
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 border-emerald-700 text-white"
                        onClick={() => handleActivate(rental.rental_id)}
                      >
                        <Play className="w-3 h-3 fill-white" /> Activate & Lock Escrow
                      </Button>
                    )}

                    {/* Borrower Cancel Request Action (REQUESTED or APPROVED before activation) */}
                    {isBorrower && ['REQUESTED', 'APPROVED'].includes(rental.status) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-slate-600 hover:text-red-600 hover:border-red-200 gap-1"
                        onClick={() => handlePromptCancel(rental, false)}
                      >
                        <XCircle className="w-3.5 h-3.5" /> Cancel Request
                      </Button>
                    )}

                    {/* Borrower Return Action */}
                    {isBorrower && ['ACTIVE', 'OVERDUE'].includes(rental.status) && (
                      <Button variant="secondary" size="sm" onClick={() => handleRequestReturn(rental.rental_id)}>
                        <RotateCcw className="w-3.5 h-3.5 text-[#4F46E5]" /> Initiate Return
                      </Button>
                    )}

                    {/* Owner Return Confirmation Action */}
                    {isOwner && ['ACTIVE', 'RETURN_PENDING', 'OVERDUE'].includes(rental.status) && (
                      <Button
                        variant="primary"
                        size="sm"
                        className="bg-indigo-600 text-white"
                        onClick={() => {
                          handleClearSelectedPhoto();
                          setInspectModalRental(rental);
                          setConditionAfterReturn('EXCELLENT');
                          setDamageFound(false);
                          setMissingAccessories(false);
                        }}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Inspect & Confirm Return
                      </Button>
                    )}

                    {/* Review Action for Completed Rental */}
                    {rental.status === 'COMPLETED' && (
                      <div className="flex flex-wrap items-center gap-2">
                        {rental.my_review ? (
                          <div
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium"
                            title={`Your review: "${rental.my_review.comment}"`}
                          >
                            <div className="flex items-center text-amber-500">
                              {[...Array(rental.my_review.rating)].map((_, i) => (
                                <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                              ))}
                            </div>
                            <span>Reviewed ({rental.my_review.rating}/5)</span>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-[#4F46E5] border-indigo-200 hover:bg-indigo-50 gap-1.5"
                            onClick={() => {
                              setRating(5);
                              setReviewComment('');
                              setReviewModalRental(rental);
                            }}
                          >
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            Leave Peer Review
                          </Button>
                        )}

                        {rental.peer_review && (
                          <div
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-slate-50 border border-slate-200 text-slate-700 text-xs"
                            title={`${rental.peer_review.reviewer_name || 'Counterparty'}'s review: "${rental.peer_review.comment}"`}
                          >
                            <span className="text-slate-400 text-[10px] uppercase font-semibold">Counterparty:</span>
                            <span className="text-amber-600 font-semibold flex items-center gap-0.5">
                              ★ {rental.peer_review.rating}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Return Inspection Modal */}
      <Modal
        isOpen={!!inspectModalRental}
        onClose={() => {
          handleClearSelectedPhoto();
          setInspectModalRental(null);
        }}
        title="Hardware Return Inspection"
        subtitle={`Rental #${inspectModalRental?.rental_id} • ${inspectModalRental?.inventory_code}`}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Physical Condition After Return
            </label>
            <select
              value={conditionAfterReturn}
              onChange={(e) => setConditionAfterReturn(e.target.value)}
              className="w-full h-[36px] bg-white border border-slate-300 rounded-[6px] px-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#4F46E5]"
            >
              <option value="EXCELLENT">Excellent (Exact Same As Handover)</option>
              <option value="GOOD">Good (Operational, Standard Bench Marks)</option>
              <option value="FAIR">Fair (Noticeable Cosmetic Wear)</option>
              <option value="POOR">Poor (Functional Degradation)</option>
              <option value="DAMAGED">Damaged (Requires Repair / Replacement)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 p-2.5 rounded bg-slate-50 border border-slate-200 text-xs font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={damageFound}
                onChange={(e) => setDamageFound(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
              />
              <span className="text-slate-800 font-semibold">Damage Found Upon Inspection</span>
            </label>

            <label className="flex items-center gap-2 p-2.5 rounded bg-slate-50 border border-slate-200 text-xs font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={missingAccessories}
                onChange={(e) => setMissingAccessories(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
              />
              <span className="text-slate-800 font-semibold">Missing Probes / Accessories</span>
            </label>
          </div>

          {damageFound && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-[6px] space-y-3 animate-in fade-in">
              <div className="text-xs font-semibold text-red-800 uppercase tracking-wider">
                Damage Report Details
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Damage Category</label>
                <select
                  value={damageType}
                  onChange={(e) => setDamageType(e.target.value)}
                  className="w-full h-[32px] bg-white border border-red-300 rounded text-xs px-2"
                >
                  <option value="PHYSICAL_DAMAGE">Physical Damage</option>
                  <option value="NON_FUNCTIONAL">Non-Functional / Electronics Blown</option>
                  <option value="MISSING_ACCESSORY">Missing Accessory</option>
                  <option value="BURNED">Burned / Overvoltage</option>
                  <option value="MAJOR_DAMAGE">Major Damage</option>
                </select>
              </div>

              <Input
                label="Estimated Repair / Replacement Cost (BDT)"
                type="number"
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(e.target.value)}
              />

              {/* Photographic Damage Evidence */}
              <div className="space-y-1.5 pt-1 border-t border-red-200">
                <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-red-600" />
                  Photographic Evidence (Recommended)
                </label>

                {!filePreview && !evidenceUrl ? (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragOver(true);
                    }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragOver(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleFileSelect(file);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-[6px] p-3 text-center cursor-pointer transition-all ${
                      isDragOver
                        ? 'border-red-500 bg-red-100/50'
                        : 'border-red-300 hover:border-red-400 bg-white'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(file);
                      }}
                    />
                    <UploadCloud className="w-5 h-5 text-red-500 mx-auto mb-1" />
                    <div className="text-xs font-semibold text-slate-800">
                      Upload hardware damage photo
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      JPG, PNG, WEBP up to 5MB
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 bg-white p-2 rounded-[6px] border border-red-200">
                    <div className="w-14 h-14 rounded overflow-hidden bg-slate-100 shrink-0 border border-slate-200 relative">
                      <img
                        src={filePreview || evidenceUrl}
                        alt="Evidence preview"
                        className="w-full h-full object-cover"
                      />
                      {isUploadingPhoto && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Loader2 className="w-4 h-4 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-800 truncate">
                        {selectedFile?.name || 'Evidence Image'}
                      </div>
                      <div className="text-[10px] text-emerald-600 font-medium">
                        {isUploadingPhoto ? 'Uploading to secure storage...' : 'Ready for report'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearSelectedPhoto}
                      className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-red-700">
                Filing damage freezes the escrow deposit ({inspectModalRental?.security_deposit} BDT) for dispute arbitration.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Return Inspection Notes
            </label>
            <textarea
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
              placeholder="Record any visual observations, probe conditions, or student feedback..."
              rows={2}
              className="w-full p-2.5 text-xs border border-slate-300 rounded-[6px] focus:outline-none focus:border-[#4F46E5]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setInspectModalRental(null)}>
              Cancel
            </Button>
            <Button
              variant={damageFound ? 'destructive' : 'primary'}
              isLoading={isInspecting}
              onClick={handleConfirmReturnSubmit}
            >
              {damageFound ? 'Submit Damage & Freeze Escrow' : 'Confirm Safe Return & Release Escrow'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Review Modal */}
      <Modal
        isOpen={!!reviewModalRental}
        onClose={() => setReviewModalRental(null)}
        title="Submit Peer Review"
        subtitle={`Rental #${reviewModalRental?.rental_id}`}
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
                  onClick={() => setRating(star)}
                  className="p-1 text-amber-500 hover:scale-110 transition-transform"
                >
                  <Star
                    className={`w-6 h-6 ${star <= rating ? 'fill-amber-500' : 'text-slate-300'}`}
                  />
                </button>
              ))}
              <span className="text-xs font-mono font-bold text-slate-700 ml-2">{rating} / 5</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Review Comment
              </label>
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
            {reviewComment.trim().length > 0 && reviewComment.trim().length < 5 && (
              <p className="text-[11px] text-amber-600 mt-1">
                Please enter at least 5 characters to submit review.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setReviewModalRental(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              isLoading={isSubmittingReview}
              disabled={reviewComment.trim().length < 5}
              onClick={handleReviewSubmit}
            >
              Publish Review
            </Button>
          </div>
        </div>
      </Modal>

      {/* Cancellation Confirmation Modal */}
      <Modal
        isOpen={!!cancelModalRental}
        onClose={() => {
          if (!isCancelling) {
            setCancelModalRental(null);
            setCancelReason('');
          }
        }}
        title={cancelModalTitle}
        subtitle={`Rental #${cancelModalRental?.rental_id} • ${cancelModalRental?.component_name}`}
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
                setCancelModalRental(null);
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
