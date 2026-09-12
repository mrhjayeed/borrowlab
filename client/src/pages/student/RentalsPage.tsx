import React, { useState, useEffect } from 'react';
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

  // Review Modal state
  const [reviewModalRental, setReviewModalRental] = useState<Rental | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

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
      });

      if (damageFound) {
        success('Return recorded with damage', 'Damage report opened and escrow frozen for moderator arbitration.');
      } else {
        success('Return confirmed', 'Hardware inspected cleanly. Escrow released to borrower and payout credited.');
      }

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
                  <div className="flex items-center gap-2">
                    <span className="mono-data-sm text-[#4F46E5] font-semibold">{rental.inventory_code}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs text-slate-500">{rental.component_name}</span>
                    <span className="text-slate-300">•</span>
                    <StatusBadge status={rental.status} size="sm" />
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

                    {/* Borrower Activation Action (CONCURRENCY LOCK DEMO) */}
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
        onClose={() => setInspectModalRental(null)}
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
    </div>
  );
};
