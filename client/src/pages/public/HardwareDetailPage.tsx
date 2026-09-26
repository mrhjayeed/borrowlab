import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ListingAvailabilityItem } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { TrustGauge } from '../../components/ui/TrustGauge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { HardwareImage } from '../../components/ui/HardwareImage';
import {
  ShieldCheck,
  Lock,
  Building,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Cpu,
  Star,
  Layers,
  MapPin,
  HelpCircle,
} from 'lucide-react';

export const HardwareDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error } = useToast();

  const [listing, setListing] = useState<ListingAvailabilityItem | null>(null);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Rental Request Modal
  const [isRentModalOpen, setIsRentModalOpen] = useState(false);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [durationDays, setDurationDays] = useState(7);
  const [conditionNotes, setConditionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Waitlist Modal
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
  const [waitlistDays, setWaitlistDays] = useState(7);
  const [isJoiningWaitlist, setIsJoiningWaitlist] = useState(false);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    api.getListingDetail(id)
      .then((res) => setListing(res.listing))
      .catch((err) => error(err.message))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/3" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-white rounded border border-slate-200" />
          <div className="h-96 bg-white rounded border border-slate-200" />
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <Card className="p-12 text-center space-y-3">
        <h3 className="text-base font-semibold text-slate-900">Listing Not Found</h3>
        <p className="text-xs text-slate-500">The requested hardware listing does not exist or has been removed.</p>
        <Link to="/browse">
          <Button variant="secondary" size="sm">Back to Marketplace</Button>
        </Link>
      </Card>
    );
  }

  // Check if current user is owner
  const isOwner = !!(user && Number(user.userId) === Number(listing.owner_id));

  // Calculate rental calculations
  const dailyRate = parseFloat(String(listing.weekly_rent)) / 7.0;
  const calculatedRentalFee = Math.round(dailyRate * durationDays * 100) / 100;
  const calculatedDeposit = Math.max(1000.0, Math.round(parseFloat(String(listing.replacement_value)) * 0.15));
  const totalRequired = calculatedRentalFee + calculatedDeposit;
  const userBalance = user?.walletBalance || 0;
  const hasSufficientBalance = user ? userBalance >= totalRequired : false;

  const handleRentalSubmit = async () => {
    if (!user) {
      navigate(`/login?redirect=/listings/${listing.listing_id}`);
      return;
    }

    if (isOwner) {
      error('Cannot rent own hardware', 'You are the registered custodian of this unit in your personal inventory.');
      return;
    }

    if (!hasSufficientBalance) {
      error('Insufficient wallet balance', `You need ${totalRequired.toFixed(2)} BDT (Rental Fee + Security Deposit). Please top up.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const start = new Date(startDate);
      const due = new Date(start);
      due.setDate(due.getDate() + durationDays);

      const res = await api.requestRental({
        listing_id: Number(listing.listing_id),
        start_date: startDate,
        due_date: due.toISOString().split('T')[0],
        borrower_condition_notes: conditionNotes,
      });

      success('Rental request submitted', 'The owner has been notified and will approve shortly.');
      setIsRentModalOpen(false);
      navigate(`/rentals/${res.rental.rental_id}`);
    } catch (err: any) {
      error(err.message || 'Failed to submit rental request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinWaitlist = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    setIsJoiningWaitlist(true);
    try {
      await api.joinWaitlist({
        component_id: listing.component_id,
        requested_duration_days: waitlistDays,
      });
      success('Joined waitlist', 'You will be notified immediately when this unit returns to AVAILABLE status.');
      setIsWaitlistOpen(false);
    } catch (err: any) {
      error(err.message || 'Failed to join waitlist');
    } finally {
      setIsJoiningWaitlist(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link to="/browse" className="hover:text-slate-900">Hardware Marketplace</Link>
        <span>/</span>
        <span className="text-slate-400">{listing.category_name}</span>
        <span>/</span>
        <span className="text-slate-900 font-mono">{listing.inventory_code}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Main Details, Specs, Accessories, Reviews */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Card */}
          <Card className="overflow-hidden">
            {/* Header Banner */}
            <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="label-caps text-[#4F46E5]">{listing.category_name}</span>
                  <span className="text-slate-300">•</span>
                  <span className="mono-data text-slate-600">{listing.inventory_code}</span>
                </div>
                <h1 className="text-xl font-bold text-slate-900 leading-snug">
                  {listing.listing_title}
                </h1>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                  <span>{listing.manufacturer}</span>
                  <span>•</span>
                  <span>Model: {listing.model}</span>
                  {listing.serial_number && (
                    <>
                      <span>•</span>
                      <span className="font-mono">SN: {listing.serial_number}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <StatusBadge status={listing.availability_status} size="md" />
                <div className="text-[11px] font-medium text-slate-500">
                  Condition: <span className="font-semibold text-slate-800">{listing.hardware_condition}</span>
                </div>
              </div>
            </div>

            {/* Main Equipment Image Showcase */}
            <div className="relative border-b border-slate-200 bg-slate-900 flex flex-col items-center justify-center">
              <HardwareImage
                src={
                  listing.images && listing.images.length > 0
                    ? listing.images[selectedImageIdx]?.image_url
                    : (listing.primary_image_url || listing.inventory_image_url)
                }
                alt={listing.listing_title}
                categoryName={listing.category_name}
                inventoryCode={listing.inventory_code}
                className="h-72 sm:h-80 w-full"
                imgClassName="w-full h-full object-contain"
              />
              {listing.images && listing.images.length > 1 && (
                <div className="p-2 w-full bg-slate-900 border-t border-slate-800 flex items-center justify-center gap-2 overflow-x-auto">
                  {listing.images.map((img, idx) => (
                    <button
                      key={img.listing_image_id || idx}
                      type="button"
                      onClick={() => setSelectedImageIdx(idx)}
                      className={`relative w-14 h-10 rounded overflow-hidden border-2 transition-all ${
                        selectedImageIdx === idx ? 'border-[#4F46E5] scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-6">
              {/* Description */}
              <div>
                <div className="label-caps mb-2 text-slate-500">Description & Usage Notes</div>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  {listing.listing_description || 'No additional description provided.'}
                </p>
              </div>

              {/* Technical Specifications */}
              {listing.specifications && (
                <div>
                  <div className="label-caps mb-2 text-slate-500">Technical Specifications</div>
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {listing.specifications}
                  </div>
                </div>
              )}

              {/* Accessories Checklist */}
              <div>
                <div className="label-caps mb-2 text-slate-500">Included Accessories Checklist</div>
                {listing.accessories && listing.accessories.length > 0 ? (
                  <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden text-xs">
                    {listing.accessories.map((acc, idx) => (
                      <div key={idx} className="p-3 flex items-center justify-between bg-white hover:bg-slate-50">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className={`w-4 h-4 ${acc.is_required ? 'text-[#4F46E5]' : 'text-slate-400'}`} />
                          <span className="font-medium text-slate-800">{acc.accessory_name}</span>
                          <span className="font-mono text-[11px] text-slate-400">(Qty: {acc.quantity})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {acc.is_required && (
                            <span className="text-[10px] uppercase font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                              Required
                            </span>
                          )}
                          <span className="font-mono text-slate-500 text-[11px]">
                            Value: {parseFloat(String(acc.replacement_value)).toLocaleString()} BDT
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
                    Standard basic unit only; no extra accessories declared.
                  </div>
                )}
              </div>

              {/* Pickup Information */}
              {listing.pickup_information && (
                <div className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-xl flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-[#4F46E5] shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <span className="font-semibold text-slate-900 block mb-0.5">Campus Handover Location</span>
                    <span className="text-slate-700">{listing.pickup_information}</span>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Peer Reviews */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="label-caps text-slate-500">Verified Peer Reviews</div>
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="font-bold text-slate-900">{parseFloat(String(listing.owner_avg_rating)).toFixed(1)}</span>
                <span>({listing.owner_review_count} ratings)</span>
              </div>
            </div>

            {listing.recentReviews && listing.recentReviews.length > 0 ? (
              <div className="space-y-3 divide-y divide-slate-100">
                {listing.recentReviews.map((rev) => (
                  <div key={rev.review_id} className="pt-3 first:pt-0 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-900">{rev.reviewer_name}</span>
                      <div className="flex items-center gap-1">
                        {[...Array(rev.rating)].map((_, i) => (
                          <Star key={i} className="w-3 h-3 text-amber-500 fill-amber-500" />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-slate-600">{rev.comment}</p>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {new Date(rev.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-2">No reviews recorded yet for this lender.</p>
            )}
          </Card>
        </div>

        {/* Right 1 Column: Rental Action Card & Owner Trust Profile */}
        <div className="space-y-5">
          {/* Rent / Action Box */}
          <Card className="p-5 space-y-5 border-slate-300 shadow-level-2">
            <div>
              <div className="text-xs text-slate-500">Rental Rate</div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
                  {listing.weekly_rent}
                </span>
                <span className="text-xs font-semibold text-slate-500">BDT / week</span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 tabular-nums mt-0.5">
                Approx. {listing.daily_rent} BDT / day
              </div>
            </div>

            {/* Escrow Deposit Buffer Callout */}
            <div className="p-3 bg-cyan-50/70 border border-cyan-200/80 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-800">
                <Lock className="w-3.5 h-3.5 text-cyan-600" />
                Escrow Security Deposit
              </div>
              <div className="text-[11px] text-cyan-800 leading-snug">
                Requires <span className="font-bold font-mono">{calculatedDeposit} BDT</span> locked in virtual escrow. Refunded immediately upon safe, inspected return.
              </div>
            </div>

            {/* Duration Limits */}
            <div className="grid grid-cols-2 gap-2 text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-100 font-mono">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-sans">Min Duration</span>
                <span className="font-semibold text-slate-800">{listing.minimum_duration_days} days</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-sans">Max Duration</span>
                <span className="font-semibold text-slate-800">{listing.maximum_duration_days} days</span>
              </div>
            </div>

            {/* Main CTA */}
            {isOwner ? (
              <div className="space-y-2">
                <Button
                  variant="secondary"
                  size="lg"
                  disabled
                  className="w-full text-sm font-semibold opacity-80 cursor-not-allowed border-slate-300 bg-slate-100 text-slate-600"
                >
                  You Own This Hardware Unit
                </Button>
                <div className="text-[11px] text-center text-slate-500">
                  This physical hardware belongs to your personal inventory.
                </div>
              </div>
            ) : listing.is_rentable ? (
              <Button
                variant="primary"
                size="lg"
                className="w-full text-sm font-semibold"
                onClick={() => {
                  if (!user) {
                    navigate(`/login?redirect=/listings/${listing.listing_id}`);
                  } else {
                    setIsRentModalOpen(true);
                  }
                }}
              >
                {user ? 'Request Rental' : 'Sign In to Request Rental'}
              </Button>
            ) : (
              <div className="space-y-2">
                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full text-sm font-semibold border-amber-300 text-amber-800 bg-amber-50/60 hover:bg-amber-100"
                  onClick={() => {
                    if (!user) {
                      navigate(`/login?redirect=/listings/${listing.listing_id}`);
                    } else {
                      setIsWaitlistOpen(true);
                    }
                  }}
                >
                  Join Waitlist Queue
                </Button>
                <div className="text-[11px] text-center text-slate-500">
                  Item is currently {listing.availability_status}. You will be auto-notified when returned.
                </div>
              </div>
            )}
          </Card>

          {/* Owner Profile Card */}
          <Card className="p-5 space-y-4">
            <div className="label-caps text-slate-400">Hardware Custodian</div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-sm">
                {listing.owner_name.charAt(0)}
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">{listing.owner_name}</div>
                <div className="text-xs text-slate-500 flex items-center gap-1">
                  <Building className="w-3 h-3" />
                  {listing.department_name || listing.department_code || 'Engineering'}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">Verified Trust Score</span>
              <TrustGauge score={parseFloat(String(listing.owner_trust_score))} size="sm" />
            </div>

            <div className="text-[11px] text-slate-500 space-y-1 bg-slate-50 p-2.5 rounded border border-slate-100">
              <div className="flex justify-between">
                <span>University:</span>
                <span className="font-semibold text-slate-700">{listing.university_short_name}</span>
              </div>
              <div className="flex justify-between">
                <span>Completed Borrows:</span>
                <span className="font-mono text-slate-700">{listing.owner_review_count}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Rent Hardware Modal */}
      <Modal
        isOpen={isRentModalOpen}
        onClose={() => setIsRentModalOpen(false)}
        title="Request Hardware Rental"
        subtitle={`Listing #${listing.listing_id} • ${listing.inventory_code}`}
        maxWidth="md"
      >
        <div className="space-y-4">
          <Input
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />

          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-700 uppercase tracking-wider">Duration (Days)</span>
              <span className="font-mono font-bold text-[#4F46E5]">{durationDays} days</span>
            </div>
            <input
              type="range"
              min={listing.minimum_duration_days}
              max={listing.maximum_duration_days}
              value={durationDays}
              onChange={(e) => setDurationDays(parseInt(e.target.value, 10))}
              className="w-full accent-[#4F46E5]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Borrower Condition Notes / Intended Project
            </label>
            <textarea
              value={conditionNotes}
              onChange={(e) => setConditionNotes(e.target.value)}
              placeholder="e.g. Digital logic lab assignment, using standard Vivado 2023 on campus."
              rows={2}
              className="w-full p-2.5 text-xs border border-slate-300 rounded-[6px] focus:outline-none focus:border-[#4F46E5]"
            />
          </div>

          {/* Financial Breakdown Table */}
          <div className="p-3.5 bg-slate-50 rounded-[6px] border border-slate-200 text-xs space-y-1.5 font-mono">
            <div className="flex justify-between text-slate-600">
              <span>Rental Fee ({durationDays} days @ {listing.daily_rent}/day):</span>
              <span className="tabular-nums font-semibold text-slate-900">{calculatedRentalFee.toFixed(2)} BDT</span>
            </div>
            <div className="flex justify-between text-[#0E7490]">
              <span className="flex items-center gap-1"><Lock className="w-3 h-3 text-[#06B6D4]" /> Security Deposit (Held in Escrow):</span>
              <span className="tabular-nums font-semibold">{calculatedDeposit.toFixed(2)} BDT</span>
            </div>
            <div className="pt-1.5 border-t border-slate-200 flex justify-between text-slate-900 font-bold text-sm">
              <span>Total Upfront Required:</span>
              <span className="tabular-nums">{totalRequired.toFixed(2)} BDT</span>
            </div>
            <div className="flex justify-between text-[11px] pt-1 text-slate-500 font-sans">
              <span>Your Current Balance:</span>
              <span className={`font-mono font-bold ${hasSufficientBalance ? 'text-emerald-600' : 'text-red-600'}`}>
                {userBalance.toFixed(2)} BDT
              </span>
            </div>
          </div>

          {!user ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>Sign in with your university account to confirm rental.</span>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate(`/login?redirect=/listings/${listing.listing_id}`)}
              >
                Sign In
              </Button>
            </div>
          ) : !hasSufficientBalance ? (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>Insufficient funds. Top up your virtual wallet before submitting.</span>
              </div>
              <Link to="/wallet">
                <Button variant="secondary" size="sm" className="text-xs shrink-0 py-0.5 px-2 h-7">
                  Top Up
                </Button>
              </Link>
            </div>
          ) : null}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setIsRentModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!user || !hasSufficientBalance || isOwner}
              isLoading={isSubmitting}
              onClick={handleRentalSubmit}
            >
              Confirm Request
            </Button>
          </div>
        </div>
      </Modal>

      {/* Waitlist Modal */}
      <Modal
        isOpen={isWaitlistOpen}
        onClose={() => setIsWaitlistOpen(false)}
        title="Join Hardware Waitlist"
        subtitle={`Queue for ${listing.component_name}`}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            When any physical unit of this component is returned and inspected, the system prioritizes the waitlist FIFO queue and holds a 24-hour reservation window for you.
          </p>

          <Input
            label="Desired Rental Duration (Days)"
            type="number"
            value={waitlistDays}
            onChange={(e) => setWaitlistDays(parseInt(e.target.value, 10) || 7)}
            min="1"
            max="30"
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setIsWaitlistOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              isLoading={isJoiningWaitlist}
              onClick={handleJoinWaitlist}
            >
              Join Queue
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
