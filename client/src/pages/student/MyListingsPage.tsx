import React, { useState, useEffect, useRef } from 'react';
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
  AlertTriangle,
  Camera,
  UploadCloud,
  X,
  Loader2,
  ExternalLink,
  Cpu,
} from 'lucide-react';

export const MyListingsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const preselectedInventoryId = searchParams.get('createForInventory');

  const { user } = useAuth();
  const { success, error } = useToast();

  const [listings, setListings] = useState<ListingAvailabilityItem[]>([]);
  const [unlistedInventory, setUnlistedInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create Listing Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>(preselectedInventoryId || '');
  const [weeklyRent, setWeeklyRent] = useState('750');
  const [minDays, setMinDays] = useState('3');
  const [maxDays, setMaxDays] = useState('30');
  const [listingTitle, setListingTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pickupInfo, setPickupInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Photo Upload State for Create Listing
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit Listing Modal State
  const [editListing, setEditListing] = useState<ListingAvailabilityItem | null>(null);
  const [editWeeklyRent, setEditWeeklyRent] = useState('');
  const [editMinDays, setEditMinDays] = useState('');
  const [editMaxDays, setEditMaxDays] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPickupInfo, setEditPickupInfo] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

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
      return unlisted;
    } catch {
      setListings([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchListingsData().then((unlisted) => {
      if (preselectedInventoryId && unlisted) {
        const found = unlisted.find((u: InventoryItem) => u.inventory_id.toString() === preselectedInventoryId);
        if (found) {
          selectInventoryUnit(found);
        } else {
          setSelectedInventoryId(preselectedInventoryId);
        }
        setIsCreateModalOpen(true);
      }
    });
  }, [preselectedInventoryId]);

  useRealtimeEvent(['LISTING_UPDATED', 'INVENTORY_UPDATED', 'RENTAL_UPDATED'], () => {
    fetchListingsData();
  });

  const selectInventoryUnit = (item: InventoryItem) => {
    setSelectedInventoryId(item.inventory_id.toString());
    const title = `${item.manufacturer || ''} ${item.model} (${item.component_name})`.trim();
    setListingTitle(title);
    if (item.description && !description) {
      setDescription(item.description);
    }
    if (item.image_url && !uploadedImageUrl) {
      setUploadedImageUrl(item.image_url);
      setFilePreview(item.image_url);
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

    const localUrl = URL.createObjectURL(file);
    setFilePreview(localUrl);

    setIsUploadingPhoto(true);
    try {
      const res = await api.uploadImage(file);
      setUploadedImageUrl(res.url);
      success('Listing photo uploaded', `${file.name} attached`);
    } catch (err: any) {
      error(err.message || 'Failed to upload photo');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleClearPhoto = () => {
    if (filePreview && filePreview.startsWith('blob:')) {
      URL.revokeObjectURL(filePreview);
    }
    setFilePreview(null);
    setUploadedImageUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const resetCreateForm = () => {
    setSelectedInventoryId('');
    setListingTitle('');
    setDescription('');
    setPickupInfo('');
    setWeeklyRent('750');
    setMinDays('3');
    setMaxDays('30');
    handleClearPhoto();
    setIsCreateModalOpen(false);
  };

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

    if (listingTitle.trim().length < 5) {
      error('Listing title too short', 'Listing title must be at least 5 characters');
      return;
    }

    const minD = parseInt(minDays, 10);
    const maxD = parseInt(maxDays, 10);
    if (isNaN(minD) || minD < 1) {
      error('Invalid duration', 'Minimum duration must be at least 1 day');
      return;
    }
    if (isNaN(maxD) || maxD < minD) {
      error('Invalid duration range', 'Maximum duration cannot be less than minimum duration');
      return;
    }

    const rent = parseFloat(weeklyRent);
    if (isNaN(rent) || rent < 0) {
      error('Invalid weekly rent', 'Weekly rent must be 0 or greater');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createListing({
        inventory_id: parseInt(selectedInventoryId, 10),
        weekly_rent: rent,
        minimum_duration_days: minD,
        maximum_duration_days: maxD,
        listing_title: listingTitle.trim(),
        description: description.trim() || undefined,
        pickup_information: pickupInfo.trim() || undefined,
        image_urls: uploadedImageUrl ? [uploadedImageUrl] : undefined,
      });

      success('Hardware listing created', 'Your hardware is now discoverable in the public marketplace');
      resetCreateForm();
      fetchListingsData();
    } catch (err: any) {
      error(err.message || 'Failed to create listing');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (l: ListingAvailabilityItem) => {
    setEditListing(l);
    setEditWeeklyRent(l.weekly_rent.toString());
    setEditMinDays(l.minimum_duration_days.toString());
    setEditMaxDays(l.maximum_duration_days.toString());
    setEditTitle(l.listing_title);
    setEditDescription(l.listing_description || '');
    setEditPickupInfo(l.pickup_information || '');
  };

  const handleUpdateListingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editListing) return;

    if (editTitle.trim().length < 5) {
      error('Title too short', 'Title must be at least 5 characters');
      return;
    }

    const minD = parseInt(editMinDays, 10);
    const maxD = parseInt(editMaxDays, 10);
    if (isNaN(minD) || minD < 1) {
      error('Invalid duration', 'Minimum duration must be at least 1 day');
      return;
    }
    if (isNaN(maxD) || maxD < minD) {
      error('Invalid duration range', 'Maximum duration cannot be less than minimum duration');
      return;
    }

    const rent = parseFloat(editWeeklyRent);
    if (isNaN(rent) || rent < 0) {
      error('Invalid weekly rent', 'Weekly rent must be 0 or greater');
      return;
    }

    setIsUpdating(true);
    try {
      await api.updateListing(editListing.listing_id, {
        weekly_rent: rent,
        minimum_duration_days: minD,
        maximum_duration_days: maxD,
        listing_title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        pickup_information: editPickupInfo.trim() || undefined,
      });

      success('Listing updated successfully');
      setEditListing(null);
      fetchListingsData();
    } catch (err: any) {
      error(err.message || 'Failed to update listing');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Hardware Listings</h1>
          <p className="text-xs text-slate-500 mt-1">
            Publish, pause, edit, and configure rental terms for your hardware items
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/inventory">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Cpu className="w-3.5 h-3.5" />
              Manage Inventory ({unlistedInventory.length} unlisted)
            </Button>
          </Link>
          <Button variant="primary" size="sm" onClick={() => setIsCreateModalOpen(true)} className="gap-1.5">
            <PlusCircle className="w-3.5 h-3.5" />
            Create New Listing
          </Button>
        </div>
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
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="mono-data-sm text-[#4F46E5] font-semibold">{l.inventory_code}</span>
                  <span className="text-slate-300">•</span>
                  <span className="label-caps text-slate-500">{l.category_name}</span>
                  <span className="text-slate-300">•</span>
                  <StatusBadge status={l.listing_status} size="sm" />
                  <span className="text-slate-300">•</span>
                  <span className="text-xs text-slate-500 font-mono">
                    Availability: <strong className="text-slate-700">{l.availability_status}</strong>
                  </span>
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

                <div className="flex items-center gap-2 flex-wrap">
                  <Link to={`/listings/${l.listing_id}`}>
                    <Button variant="outline" size="sm">Public View</Button>
                  </Link>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEdit(l)}
                    className="gap-1 text-xs text-slate-700 hover:text-indigo-600"
                  >
                    <Edit className="w-3 h-3 text-indigo-500" /> Edit
                  </Button>

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
        onClose={resetCreateForm}
        title="Create Marketplace Listing"
        subtitle="Publish your registered physical inventory for university lending"
        maxWidth="lg"
      >
        {unlistedInventory.length === 0 ? (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-[6px] bg-amber-50 border border-amber-200 space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-semibold text-sm">
                <AlertTriangle className="w-4.5 h-4.5 text-amber-600 shrink-0" />
                No Unlisted Physical Hardware Units Available
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                All physical hardware registered to your account already has an active or paused marketplace listing, or you have not registered any hardware units yet.
              </p>
              <p className="text-xs text-amber-700">
                To create a new marketplace listing, please first register your hardware unit (serial number, condition, accessories) in your inventory.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="secondary" onClick={resetCreateForm}>
                Close
              </Button>
              <Link to="/inventory">
                <Button variant="primary" className="gap-1.5">
                  <Cpu className="w-3.5 h-3.5" /> Go to My Hardware Inventory
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateListing} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Select Unlisted Physical Hardware Unit *
              </label>
              <select
                value={selectedInventoryId}
                onChange={(e) => {
                  const id = e.target.value;
                  const found = unlistedInventory.find((u) => u.inventory_id.toString() === id);
                  if (found) {
                    selectInventoryUnit(found);
                  } else {
                    setSelectedInventoryId('');
                  }
                }}
                className="w-full h-[36px] bg-white border border-slate-300 rounded-[6px] px-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#4F46E5]"
                required
              >
                <option value="">-- Select Available Unit ({unlistedInventory.length} unlisted) --</option>
                {unlistedInventory.map((item) => (
                  <option key={item.inventory_id} value={item.inventory_id}>
                    {item.inventory_code} — {item.component_name} ({item.condition}) • Serial: {item.serial_number || 'N/A'}
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
                min="0"
                step="10"
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
                placeholder="Highlight included probes, pre-installed drivers, accessories, or lab test tips..."
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

            {/* Listing Photo Dropzone */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Listing Photo <span className="text-slate-400 font-normal lowercase">(optional, inherits from inventory if empty)</span>
              </label>

              {filePreview ? (
                <div className="relative rounded-[6px] border border-slate-200 bg-slate-50 p-2 flex items-center gap-3">
                  <img
                    src={filePreview}
                    alt="Listing Preview"
                    className="w-16 h-16 object-cover rounded-[4px] border border-slate-300 bg-white"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-800 truncate">
                      {uploadedImageUrl ? 'Custom Listing Photo Attached' : 'Inherited from registered inventory unit'}
                    </p>
                    <p className="text-[10px] text-emerald-600 font-medium mt-0.5">
                      ✓ Ready for marketplace display
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearPhoto}
                    className="p-1 text-slate-400 hover:text-red-500 rounded"
                    title="Remove Photo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    const files = e.dataTransfer.files;
                    if (files && files.length > 0) {
                      handleFileSelect(files[0]);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-[6px] p-4 text-center cursor-pointer transition-colors ${
                    isDragOver
                      ? 'border-[#4F46E5] bg-indigo-50/50'
                      : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        handleFileSelect(files[0]);
                      }
                    }}
                  />
                  {isUploadingPhoto ? (
                    <div className="flex items-center justify-center gap-2 text-xs text-indigo-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Uploading photo...</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Camera className="w-5 h-5 text-slate-400 mx-auto" />
                      <div className="text-xs text-slate-600 font-medium">
                        Click or drag a photo here to upload
                      </div>
                      <div className="text-[10px] text-slate-400">
                        JPG, PNG, WEBP up to 5MB
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="secondary" type="button" onClick={resetCreateForm}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" isLoading={isSubmitting}>
                Publish Listing
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Edit Listing Modal */}
      <Modal
        isOpen={!!editListing}
        onClose={() => setEditListing(null)}
        title="Edit Hardware Listing"
        subtitle={`Listing #${editListing?.listing_id} • ${editListing?.inventory_code}`}
        maxWidth="lg"
      >
        <form onSubmit={handleUpdateListingSubmit} className="space-y-4">
          <Input
            label="Listing Title *"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Weekly Rent (BDT) *"
              type="number"
              value={editWeeklyRent}
              onChange={(e) => setEditWeeklyRent(e.target.value)}
              required
              min="0"
              step="10"
            />
            <Input
              label="Min Duration (Days) *"
              type="number"
              value={editMinDays}
              onChange={(e) => setEditMinDays(e.target.value)}
              required
              min="1"
            />
            <Input
              label="Max Duration (Days) *"
              type="number"
              value={editMaxDays}
              onChange={(e) => setEditMaxDays(e.target.value)}
              required
              min="1"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Listing Description
            </label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Highlight special features, accessories, or lab test tips..."
              rows={3}
              className="w-full p-2.5 text-xs border border-slate-300 rounded-[6px] focus:outline-none focus:border-[#4F46E5]"
            />
          </div>

          <Input
            label="Pickup & Handover Instructions"
            placeholder="e.g. EEE Building Lab 402 on weekdays 2 PM - 5 PM"
            value={editPickupInfo}
            onChange={(e) => setEditPickupInfo(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="secondary" type="button" onClick={() => setEditListing(null)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isUpdating}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
