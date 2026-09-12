import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useRealtimeEvent } from '../../context/RealtimeContext';
import { useToast } from '../../context/ToastContext';
import { ListingAvailabilityItem, InventoryItem } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import {
  Layers,
  PlusCircle,
  Pause,
  Play,
  Edit,
  Building,
  CheckCircle2,
} from 'lucide-react';

export const MyListingsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const preselectedInventoryId = searchParams.get('createForInventory');

  const { user } = useAuth();
  const { success, error } = useToast();

  const [listings, setListings] = useState<ListingAvailabilityItem[]>([]);
  const [unlistedInventory, setUnlistedInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create Listing Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>(preselectedInventoryId || '');
  const [weeklyRent, setWeeklyRent] = useState('750');
  const [minDays, setMinDays] = useState('3');
  const [maxDays, setMaxDays] = useState('30');
  const [listingTitle, setListingTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pickupInfo, setPickupInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchListingsData = async () => {
    setIsLoading(true);
    try {
      const [listRes, invRes] = await Promise.all([
        api.getMyListings(),
        api.getMyInventory(),
      ]);
      setListings(listRes.listings);
      // Filter inventory items without an active listing
      const unlisted = invRes.inventory.filter((item: InventoryItem) => !item.listing_id);
      setUnlistedInventory(unlisted);
    } catch {
      setListings([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchListingsData();
    if (preselectedInventoryId) {
      setSelectedInventoryId(preselectedInventoryId);
      setIsCreateModalOpen(true);
    }
  }, [preselectedInventoryId]);

  useRealtimeEvent(['LISTING_UPDATED', 'INVENTORY_UPDATED', 'RENTAL_UPDATED'], () => {
    fetchListingsData();
  });

  const handleToggleStatus = async (listingId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      await api.updateListing(listingId, { status: newStatus });
      success(`Listing ${newStatus.toLowerCase()}`);
      fetchListingsData();
    } catch (err: any) {
      error(err.message || 'Failed to update listing');
    }
  };

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInventoryId) {
      error('Please select an unlisted inventory unit');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createListing({
        inventory_id: parseInt(selectedInventoryId, 10),
        weekly_rent: parseFloat(weeklyRent),
        minimum_duration_days: parseInt(minDays, 10),
        maximum_duration_days: parseInt(maxDays, 10),
        listing_title: listingTitle.trim(),
        description: description.trim() || undefined,
        pickup_information: pickupInfo.trim() || undefined,
      });

      success('Hardware listing created', 'Your hardware is now discoverable in the public marketplace');
      setIsCreateModalOpen(false);
      fetchListingsData();
    } catch (err: any) {
      error(err.message || 'Failed to create listing');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Hardware Listings</h1>
          <p className="text-xs text-slate-500 mt-1">
            Publish, pause, and configure rental terms for your hardware items
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => setIsCreateModalOpen(true)} className="gap-1.5">
          <PlusCircle className="w-3.5 h-3.5" />
          Create New Listing
        </Button>
      </div>

      {/* Listings Grid */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-white rounded border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <Card className="p-12 text-center text-xs text-slate-500 space-y-3">
          <Layers className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="text-base font-semibold text-slate-900">No active marketplace listings</h3>
          <p className="max-w-xs mx-auto text-slate-400">
            You have not listed any hardware for lending yet. Create a listing to start earning peer rental revenue.
          </p>
          <Button variant="primary" size="sm" onClick={() => setIsCreateModalOpen(true)}>
            Create First Listing
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {listings.map((l) => (
            <Card key={l.listing_id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="mono-data-sm text-[#4F46E5] font-semibold">{l.inventory_code}</span>
                  <span className="text-slate-300">•</span>
                  <span className="label-caps text-slate-500">{l.category_name}</span>
                  <span className="text-slate-300">•</span>
                  <StatusBadge status={l.listing_status} size="sm" />
                </div>

                <Link to={`/listings/${l.listing_id}`} className="group block">
                  <h3 className="text-base font-semibold text-slate-900 group-hover:text-[#4F46E5] transition-colors">
                    {l.listing_title}
                  </h3>
                </Link>

                <div className="text-xs text-slate-500 line-clamp-1">
                  {l.listing_description || 'No description added.'}
                </div>
              </div>

              {/* Rates & Actions */}
              <div className="flex flex-col md:items-end gap-3 shrink-0">
                <div className="flex items-center gap-4 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-sans block">Weekly Rate</span>
                    <span className="font-bold text-slate-900 text-sm">{l.weekly_rent} BDT</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-sans block">Duration Limits</span>
                    <span className="text-slate-700">{l.minimum_duration_days} - {l.maximum_duration_days} days</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link to={`/listings/${l.listing_id}`}>
                    <Button variant="outline" size="sm">Public View</Button>
                  </Link>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleToggleStatus(l.listing_id, l.listing_status)}
                    className="gap-1.5 text-xs"
                  >
                    {l.listing_status === 'ACTIVE' ? (
                      <>
                        <Pause className="w-3 h-3 text-amber-600" /> Pause Listing
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 text-emerald-600 fill-emerald-600" /> Activate Listing
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Listing Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Marketplace Listing"
        subtitle="Publish your registered physical inventory for university lending"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateListing} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Select Unlisted Physical Hardware Unit *
            </label>
            <select
              value={selectedInventoryId}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedInventoryId(id);
                const found = unlistedInventory.find((u) => u.inventory_id.toString() === id);
                if (found) {
                  setListingTitle(`${found.manufacturer || ''} ${found.model} (${found.component_name})`.trim());
                }
              }}
              className="w-full h-[36px] bg-white border border-slate-300 rounded-[6px] px-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#4F46E5]"
              required
            >
              <option value="">-- Select Available Unit --</option>
              {unlistedInventory.map((item) => (
                <option key={item.inventory_id} value={item.inventory_id}>
                  {item.inventory_code} — {item.component_name} ({item.condition})
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Listing Title *"
            placeholder="e.g. Rigol DS1054Z 50MHz 4-Channel Digital Oscilloscope"
            value={listingTitle}
            onChange={(e) => setListingTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Weekly Rent (BDT) *"
              type="number"
              value={weeklyRent}
              onChange={(e) => setWeeklyRent(e.target.value)}
              required
              min="50"
            />
            <Input
              label="Min Duration (Days) *"
              type="number"
              value={minDays}
              onChange={(e) => setMinDays(e.target.value)}
              required
              min="1"
            />
            <Input
              label="Max Duration (Days) *"
              type="number"
              value={maxDays}
              onChange={(e) => setMaxDays(e.target.value)}
              required
              min="1"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Listing Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Highlight special firmware, pre-installed software, test leads included..."
              rows={3}
              className="w-full p-2.5 text-xs border border-slate-300 rounded-[6px] focus:outline-none focus:border-[#4F46E5]"
            />
          </div>

          <Input
            label="Pickup & Handover Instructions"
            placeholder="e.g. EEE Building Lab 402 on weekdays 2 PM - 5 PM"
            value={pickupInfo}
            onChange={(e) => setPickupInfo(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="secondary" type="button" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              Publish Listing
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
