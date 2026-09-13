import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useRealtimeEvent } from '../../context/RealtimeContext';
import { useToast } from '../../context/ToastContext';
import { InventoryItem, ComponentCatalog } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { HardwareImage } from '../../components/ui/HardwareImage';
import {
  Boxes,
  PlusCircle,
  Plus,
  Cpu,
  Layers,
  Wrench,
  CheckCircle2,
  Trash2,
  AlertCircle,
  Image as ImageIcon,
  UploadCloud,
  Camera,
  Loader2,
  Link as LinkIcon,
  RefreshCw,
  Sparkles,
  Store,
  Check,
  X,
} from 'lucide-react';

export const MyHardwarePage: React.FC = () => {
  const { user } = useAuth();
  const { success, error } = useToast();

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [catalogComponents, setCatalogComponents] = useState<ComponentCatalog[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add Hardware Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [componentId, setComponentId] = useState<number | ''>('');
  const [inventoryCode, setInventoryCode] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [condition, setCondition] = useState<'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED'>('EXCELLENT');
  const [replacementValue, setReplacementValue] = useState('25000');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [accessories, setAccessories] = useState<{ accessory_name: string; quantity: number; replacement_value: number; is_required: boolean }[]>([
    { accessory_name: 'Power Cable / Adapter', quantity: 1, replacement_value: 500, is_required: true },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // In-flow Custom Model Creation State
  const [isAddingCustomModel, setIsAddingCustomModel] = useState(false);
  const [newModelName, setNewModelName] = useState('');
  const [newModelCode, setNewModelCode] = useState('');
  const [newManufacturer, setNewManufacturer] = useState('');
  const [newCategoryId, setNewCategoryId] = useState<number | ''>('');
  const [newSpecs, setNewSpecs] = useState('');
  const [isSavingCustomModel, setIsSavingCustomModel] = useState(false);

  // In-flow Custom Category Creation State
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  // Unified 1-Step Marketplace Listing State
  const [publishImmediately, setPublishImmediately] = useState(true);
  const [listingRent, setListingRent] = useState('500');
  const [listingMinDays, setListingMinDays] = useState('1');
  const [listingMaxDays, setListingMaxDays] = useState('30');
  const [listingPickup, setListingPickup] = useState('UIU Campus / EEE Hardware Lab');

  // Conventional Photo Upload & URL State
  const [photoSourceMode, setPhotoSourceMode] = useState<'upload' | 'url'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-generate Asset Tag (e.g. BL-UIU-7X4K)
  const generateAssetCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let suffix = '';
    for (let i = 0; i < 4; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `BL-UIU-${suffix}`;
  };

  const handleOpenAddModal = () => {
    if (!inventoryCode) {
      setInventoryCode(generateAssetCode());
    }
    setIsAddModalOpen(true);
  };

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      error('Please select an image file (PNG, JPG, WEBP, GIF)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      error('Image size exceeds 5MB limit');
      return;
    }

    setSelectedFile(file);

    // Instant local preview
    const localUrl = URL.createObjectURL(file);
    setFilePreview(localUrl);

    // Upload to server
    setIsUploadingPhoto(true);
    try {
      const res = await api.uploadImage(file);
      setImageUrl(res.url);
      success('Image attached', `${file.name} uploaded successfully`);
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
    setImageUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const fetchInventory = async () => {
    setIsLoading(true);
    try {
      const res = await api.getMyInventory();
      setInventory(res.inventory);
    } catch {
      setInventory([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
    api.getComponents().then((res) => setCatalogComponents(res.components)).catch(() => {});
    api.getCategories().then((res) => setCategories(res.categories)).catch(() => {});
  }, []);

  useRealtimeEvent(['INVENTORY_UPDATED', 'RENTAL_UPDATED', 'LISTING_UPDATED'], () => {
    fetchInventory();
  });

  const handleAddAccessoryRow = () => {
    setAccessories([...accessories, { accessory_name: '', quantity: 1, replacement_value: 0, is_required: false }]);
  };

  const handleRemoveAccessoryRow = (index: number) => {
    setAccessories(accessories.filter((_, i) => i !== index));
  };

  const handleSaveNewCategory = async () => {
    if (!newCategoryName.trim()) {
      error('Please provide a category name');
      return;
    }
    setIsSavingCategory(true);
    try {
      const res = await api.createCategory({ name: newCategoryName.trim() });
      setCategories((prev) => [...prev, res.category]);
      setNewCategoryId(res.category.category_id);
      setNewCategoryName('');
      setIsAddingNewCategory(false);
      success('Category added', `Created category "${res.category.name}"`);
    } catch (err: any) {
      error(err.message || 'Failed to create category');
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleSaveCustomModel = async () => {
    if (!newModelName.trim()) {
      error('Please provide a hardware device name');
      return;
    }
    if (!newModelCode.trim()) {
      error('Please provide a model code or number');
      return;
    }
    if (!newCategoryId) {
      error('Please select a hardware category');
      return;
    }

    setIsSavingCustomModel(true);
    try {
      const res = await api.createComponent({
        category_id: Number(newCategoryId),
        model: newModelCode.trim(),
        component_name: newModelName.trim(),
        manufacturer: newManufacturer.trim() || undefined,
        specifications: newSpecs.trim() || undefined,
      });

      // Prepend to catalogComponents and auto-select
      setCatalogComponents((prev) => [res.component, ...prev]);
      setComponentId(res.component.component_id);
      setIsAddingCustomModel(false);
      // Reset fields
      setNewModelName('');
      setNewModelCode('');
      setNewManufacturer('');
      setNewSpecs('');
      success('New device model registered', `${res.component.component_name} is now selected!`);
    } catch (err: any) {
      error(err.message || 'Failed to register new hardware model');
    } finally {
      setIsSavingCustomModel(false);
    }
  };

  const handleCreateHardware = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!componentId) {
      error('Please select or add a hardware model');
      return;
    }
    if (!inventoryCode.trim()) {
      error('Asset tag ID is required');
      return;
    }
    if (isUploadingPhoto) {
      error('Photo is still uploading, please wait a moment');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        component_id: Number(componentId),
        inventory_code: inventoryCode.trim(),
        serial_number: serialNumber.trim() || undefined,
        condition,
        replacement_value: parseFloat(replacementValue),
        current_location: location.trim() || undefined,
        description: description.trim() || undefined,
        image_url: imageUrl.trim() || undefined,
        accessories: accessories.filter((a) => a.accessory_name.trim().length > 0),
      };

      if (publishImmediately) {
        payload.listing = {
          weekly_rent: parseFloat(listingRent) || 500,
          minimum_duration_days: parseInt(listingMinDays, 10) || 1,
          maximum_duration_days: parseInt(listingMaxDays, 10) || 30,
          pickup_information: listingPickup.trim() || undefined,
        };
      }

      const res = await api.createInventory(payload);

      if (res.listing) {
        success(
          'Hardware Registered & Listed!',
          `${inventoryCode} is now live on the student marketplace for ${payload.listing.weekly_rent} BDT/wk`
        );
      } else {
        success('Hardware unit registered', `${inventoryCode} added to your personal inventory`);
      }

      setIsAddModalOpen(false);
      // Reset form
      setInventoryCode('');
      setSerialNumber('');
      handleClearSelectedPhoto();
      fetchInventory();
    } catch (err: any) {
      error(err.message || 'Failed to register hardware');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Physical Hardware Inventory</h1>
          <p className="text-xs text-slate-500 mt-1">
            Register and manage your lab instruments, FPGA trainer boards, and accessories
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={handleOpenAddModal} className="gap-1.5">
          <PlusCircle className="w-3.5 h-3.5" />
          Register New Hardware Unit
        </Button>
      </div>

      {/* Inventory Grid */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-white rounded border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : inventory.length === 0 ? (
        <Card className="p-12 text-center text-xs text-slate-500 space-y-3">
          <Boxes className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="text-base font-semibold text-slate-900">No hardware units registered</h3>
          <p className="max-w-xs mx-auto text-slate-400">
            Add physical equipment you own to list it on the academic marketplace and earn rental revenue.
          </p>
          <Button variant="primary" size="sm" onClick={handleOpenAddModal}>
            Register First Unit
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {inventory.map((item) => (
            <Card key={item.inventory_id} className="flex flex-col justify-between hover:border-slate-300 transition-colors overflow-hidden">
              <HardwareImage
                src={item.image_url}
                alt={item.component_name}
                categoryName={item.category_name}
                inventoryCode={item.inventory_code}
                className="h-44 w-full"
              />
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="label-caps text-[#4F46E5]">{item.category_name}</span>
                    <div className="mono-data-sm text-slate-800 font-bold">{item.inventory_code}</div>
                  </div>
                  <StatusBadge status={item.status} size="sm" />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{item.component_name}</h3>
                  <div className="text-xs text-slate-500">
                    {item.manufacturer} • {item.model}
                  </div>
                  {item.serial_number && (
                    <div className="font-mono text-[11px] text-slate-400 mt-0.5">
                      SN: {item.serial_number}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] p-2 bg-slate-50 rounded border border-slate-100 font-mono">
                  <div>
                    <span className="text-slate-400 block font-sans text-[10px]">Condition</span>
                    <span className="font-semibold text-slate-700">{item.condition}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-sans text-[10px]">Replacement Val</span>
                    <span className="font-semibold text-slate-700">{parseFloat(String(item.replacement_value)).toLocaleString()} BDT</span>
                  </div>
                </div>

                {item.accessories && item.accessories.length > 0 && (
                  <div className="text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-700">Accessories: </span>
                    {item.accessories.map((a) => a.accessory_name).join(', ')}
                  </div>
                )}
              </div>

              {/* Card Footer: Listing status or action */}
              <div className="p-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs">
                {item.listing_id ? (
                  <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Listed ({item.weekly_rent} BDT/wk)</span>
                  </div>
                ) : (
                  <Link to={`/listings?createForInventory=${item.inventory_id}`}>
                    <Button variant="secondary" size="sm" className="gap-1 text-xs">
                      <Layers className="w-3 h-3 text-[#4F46E5]" /> Create Listing
                    </Button>
                  </Link>
                )}

                <span className="font-mono text-[10px] text-slate-400">
                  {new Date(item.added_at).toLocaleDateString()}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Hardware Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register Physical Hardware Unit"
        subtitle="Record equipment details, accessories, valuation, and optionally list it on the student marketplace"
        maxWidth="3xl"
      >
        <form onSubmit={handleCreateHardware} className="space-y-5">
          {/* Section 1: Hardware Model & Campus Identification */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-indigo-100 flex items-center justify-center text-indigo-600">
                  <Cpu className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  1. Hardware Model & Identification
                </h3>
              </div>

              {!isAddingCustomModel && (
                <button
                  type="button"
                  onClick={() => setIsAddingCustomModel(true)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md border border-indigo-200/70 transition-colors"
                >
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  + Can't find your model? Add New Device
                </button>
              )}
            </div>

            {/* Model Selector or In-Flow Definition Card */}
            {!isAddingCustomModel ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Hardware Model *
                </label>
                <select
                  value={componentId}
                  onChange={(e) => setComponentId(Number(e.target.value) || '')}
                  className="w-full h-[40px] bg-white border border-slate-300 rounded-lg px-3 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 shadow-xs"
                  required
                >
                  <option value="">-- Select Hardware Model from University Catalog --</option>
                  {catalogComponents.map((c) => (
                    <option key={c.component_id} value={c.component_id}>
                      {c.component_name} ({c.manufacturer ? `${c.manufacturer} ` : ''}{c.model})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Choose from pre-seeded lab equipment or click "Add New Device" to define a custom hardware model.
                </p>
              </div>
            ) : (
              /* Inline Custom Model Definition Card */
              <div className="bg-indigo-50/60 border border-indigo-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                  <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Define New Hardware Model
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddingCustomModel(false)}
                    className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium transition-colors"
                  >
                    <X className="w-3.5 h-3.5" /> Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider">
                      Model / Device Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ESP32-CAM AI-Thinker Module"
                      value={newModelName}
                      onChange={(e) => setNewModelName(e.target.value)}
                      className="w-full h-[38px] bg-white border border-slate-300 rounded-lg px-3 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider">
                      Manufacturer / Brand
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Espressif / AI-Thinker"
                      value={newManufacturer}
                      onChange={(e) => setNewManufacturer(e.target.value)}
                      className="w-full h-[38px] bg-white border border-slate-300 rounded-lg px-3 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider">
                      Model Number / SKU *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ESP32-CAM-PRO"
                      value={newModelCode}
                      onChange={(e) => setNewModelCode(e.target.value)}
                      className="w-full h-[38px] bg-white border border-slate-300 rounded-lg px-3 text-xs sm:text-sm font-mono text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Hardware Category *
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsAddingNewCategory(!isAddingNewCategory)}
                        className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold"
                      >
                        {isAddingNewCategory ? 'Back to list' : '+ New Category'}
                      </button>
                    </div>
                    {isAddingNewCategory ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          placeholder="New category name..."
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          className="flex-1 h-[38px] bg-white border border-slate-300 rounded-lg px-3 text-xs sm:text-sm text-slate-900"
                        />
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={handleSaveNewCategory}
                          isLoading={isSavingCategory}
                          className="h-[38px] px-3 text-xs shrink-0"
                        >
                          Add
                        </Button>
                      </div>
                    ) : (
                      <select
                        value={newCategoryId}
                        onChange={(e) => setNewCategoryId(Number(e.target.value) || '')}
                        className="w-full h-[38px] bg-white border border-slate-300 rounded-lg px-3 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="">-- Select Category --</option>
                        {categories.map((cat) => (
                          <option key={cat.category_id} value={cat.category_id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider">
                    Key Specifications (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dual-core 240MHz CPU, OV2640 2MP camera, 4MB PSRAM, Wi-Fi/BLE"
                    value={newSpecs}
                    onChange={(e) => setNewSpecs(e.target.value)}
                    className="w-full h-[38px] bg-white border border-slate-300 rounded-lg px-3 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleSaveCustomModel}
                    isLoading={isSavingCustomModel}
                    className="gap-1.5 w-full sm:w-auto"
                  >
                    <Check className="w-3.5 h-3.5" /> Save & Select Model
                  </Button>
                </div>
              </div>
            )}

            {/* Asset Tag & Serial Number Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Asset Tag ID *
                  </label>
                </div>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={inventoryCode}
                    onChange={(e) => setInventoryCode(e.target.value)}
                    placeholder="e.g. BL-UIU-7X4K"
                    className="w-full h-[40px] font-mono font-bold text-indigo-950 bg-white border border-slate-300 rounded-lg pl-3 pr-24 text-sm focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 shadow-xs"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setInventoryCode(generateAssetCode())}
                    className="absolute right-1.5 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md border border-indigo-200/80 flex items-center gap-1 transition-colors"
                    title="Generate a new random unique asset tag"
                  >
                    <RefreshCw className="w-3 h-3" /> Auto
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Unique campus tracking code assigned to this unit.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Hardware Serial Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. DS1ZA20489912 or board revision"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="w-full h-[40px] font-mono text-slate-900 bg-white border border-slate-300 rounded-lg px-3 text-sm focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 shadow-xs"
                />
                <p className="text-[11px] text-slate-500 mt-1">Manufacturer hardware serial number from physical label.</p>
              </div>
            </div>
          </div>

          {/* Section 2: Physical Specs, Valuation & Location */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3.5">
            <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2.5">
              <div className="w-6 h-6 rounded-md bg-amber-100 flex items-center justify-center text-amber-600">
                <Wrench className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                2. Condition, Valuation & Storage Location
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Physical Condition *
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as any)}
                  className="w-full h-[40px] bg-white border border-slate-300 rounded-lg px-3 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 shadow-xs"
                >
                  <option value="EXCELLENT">Excellent (Pristine)</option>
                  <option value="GOOD">Good (Bench Tested)</option>
                  <option value="FAIR">Fair (Minor Wear)</option>
                  <option value="POOR">Poor (Functional Defects)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Replacement Value (BDT) *
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-sm font-semibold text-slate-400">৳</span>
                  <input
                    type="number"
                    value={replacementValue}
                    onChange={(e) => setReplacementValue(e.target.value)}
                    required
                    className="w-full h-[40px] bg-white border border-slate-300 rounded-lg pl-7 pr-12 text-sm font-mono font-semibold text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 shadow-xs"
                  />
                  <span className="absolute right-3 text-xs font-semibold text-slate-400">BDT</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Lab / Storage Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. EEE Lab 3 / Student Dorm"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full h-[40px] bg-white border border-slate-300 rounded-lg px-3 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 shadow-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Photo & Accessories Checklist (2-Column Grid) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: Equipment Photo */}
            <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <div className="flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Equipment Photo
                  </span>
                </div>

                <div className="flex items-center bg-slate-200/70 p-0.5 rounded-md text-[11px] font-medium">
                  <button
                    type="button"
                    onClick={() => setPhotoSourceMode('upload')}
                    className={`px-2 py-0.5 rounded transition-all flex items-center gap-1 ${
                      photoSourceMode === 'upload'
                        ? 'bg-white text-slate-900 font-semibold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <UploadCloud className="w-3 h-3" /> Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhotoSourceMode('url')}
                    className={`px-2 py-0.5 rounded transition-all flex items-center gap-1 ${
                      photoSourceMode === 'url'
                        ? 'bg-white text-slate-900 font-semibold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <LinkIcon className="w-3 h-3" /> URL
                  </button>
                </div>
              </div>

              {photoSourceMode === 'upload' ? (
                <div className="flex-1 flex flex-col justify-center">
                  {!filePreview && !imageUrl ? (
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
                      className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-all ${
                        isDragOver
                          ? 'border-indigo-500 bg-indigo-50/60'
                          : 'border-slate-300 hover:border-slate-400 bg-white'
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
                      <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center mb-1">
                        <UploadCloud className="w-4 h-4" />
                      </div>
                      <div className="text-xs font-semibold text-slate-800">
                        Click or drag hardware photo
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        JPG, PNG, WEBP up to 5MB
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 bg-white p-2.5 rounded-lg border border-slate-200">
                      <div className="w-14 h-14 rounded-md overflow-hidden bg-slate-100 shrink-0 border border-slate-200 relative">
                        <img
                          src={filePreview || imageUrl}
                          alt="Hardware preview"
                          className="w-full h-full object-cover"
                        />
                        {isUploadingPhoto && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <Loader2 className="w-4 h-4 text-white animate-spin" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-xs">
                        <div className="font-semibold text-slate-800 truncate">
                          {selectedFile?.name || 'Attached Photo'}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {isUploadingPhoto ? (
                            <span className="text-indigo-600 font-medium flex items-center gap-1">
                              <Loader2 className="w-3 h-3 animate-spin" /> Uploading...
                            </span>
                          ) : (
                            <span className="text-emerald-600 font-medium flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Attached to unit
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                        >
                          Change
                        </button>
                        <button
                          type="button"
                          onClick={handleClearSelectedPhoto}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2 flex-1 flex flex-col justify-center">
                  <input
                    type="text"
                    placeholder="https://images.unsplash.com/... or image URL"
                    value={imageUrl}
                    onChange={(e) => {
                      setImageUrl(e.target.value);
                      setFilePreview(null);
                      setSelectedFile(null);
                    }}
                    className="w-full h-[36px] bg-white border border-slate-300 rounded-lg px-3 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Presets:</span>
                      <button
                        type="button"
                        onClick={() => setImageUrl('https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80')}
                        className="text-indigo-600 hover:underline font-medium"
                      >
                        Board Photo
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => setImageUrl('https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80')}
                        className="text-indigo-600 hover:underline font-medium"
                      >
                        Lab Bench Photo
                      </button>
                    </div>
                    {imageUrl && (
                      <button type="button" onClick={() => setImageUrl('')} className="text-slate-400 hover:underline">
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Accessories & Probes Checklist */}
            <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 flex flex-col justify-between space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Accessories & Probes
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAddAccessoryRow}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition-colors"
                >
                  + Add Item
                </button>
              </div>

              <div className="space-y-2 max-h-[130px] overflow-y-auto pr-1">
                {accessories.map((acc, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs">
                    <input
                      type="text"
                      placeholder="e.g. Power Cable, BNC Probe"
                      value={acc.accessory_name}
                      onChange={(e) => {
                        const copy = [...accessories];
                        copy[index].accessory_name = e.target.value;
                        setAccessories(copy);
                      }}
                      className="flex-1 h-[34px] px-2.5 border border-slate-300 rounded-md bg-white text-slate-900 focus:outline-none focus:border-indigo-600"
                    />
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-slate-400">Qty:</span>
                      <input
                        type="number"
                        value={acc.quantity}
                        onChange={(e) => {
                          const copy = [...accessories];
                          copy[index].quantity = parseInt(e.target.value, 10) || 1;
                          setAccessories(copy);
                        }}
                        className="w-12 h-[34px] px-1 border border-slate-300 rounded-md bg-white text-center font-mono font-medium text-slate-900"
                        min="1"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAccessoryRow(index)}
                      className="text-slate-400 hover:text-red-600 p-1 transition-colors"
                      title="Remove accessory"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 4: Unified 1-Step Marketplace Publishing Card */}
          <div className="border border-indigo-200/80 bg-gradient-to-br from-indigo-50/60 via-white to-purple-50/40 rounded-xl p-4 space-y-3.5 transition-all shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    Publish to Student Marketplace Immediately
                  </div>
                  <p className="text-xs text-slate-500">
                    Make this hardware instantly discoverable for verified campus peers to borrow.
                  </p>
                </div>
              </div>

              {/* Styled iOS Toggle Switch */}
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={publishImmediately}
                  onChange={(e) => setPublishImmediately(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {publishImmediately && (
              <div className="pt-3 border-t border-indigo-100 space-y-3 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                      Weekly Rental Rate *
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-sm font-semibold text-slate-400">৳</span>
                      <input
                        type="number"
                        value={listingRent}
                        onChange={(e) => setListingRent(e.target.value)}
                        placeholder="500"
                        required={publishImmediately}
                        className="w-full h-[40px] bg-white border border-slate-300 rounded-lg pl-7 pr-14 text-sm font-mono font-bold text-indigo-950 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 shadow-xs"
                      />
                      <span className="absolute right-3 text-[11px] font-semibold text-slate-400">/ week</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                      Min Duration (Days)
                    </label>
                    <input
                      type="number"
                      value={listingMinDays}
                      onChange={(e) => setListingMinDays(e.target.value)}
                      placeholder="1"
                      className="w-full h-[40px] bg-white border border-slate-300 rounded-lg px-3 text-sm font-mono text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 shadow-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                      Max Duration (Days)
                    </label>
                    <input
                      type="number"
                      value={listingMaxDays}
                      onChange={(e) => setListingMaxDays(e.target.value)}
                      placeholder="30"
                      className="w-full h-[40px] bg-white border border-slate-300 rounded-lg px-3 text-sm font-mono text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 shadow-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Campus Handover & Pickup Instructions
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UIU Campus / EEE Hardware Lab 3 or EEE Dept Student Desk"
                    value={listingPickup}
                    onChange={(e) => setListingPickup(e.target.value)}
                    className="w-full h-[40px] bg-white border border-slate-300 rounded-lg px-3 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 shadow-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 5: Modal Actions Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200">
            <div className="text-xs">
              {publishImmediately ? (
                <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Instant Marketplace Listing Enabled
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                  <Boxes className="w-3.5 h-3.5 text-slate-400" />
                  Private Personal Inventory Only
                </span>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <Button variant="secondary" type="button" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" isLoading={isSubmitting} className="gap-2 px-4 shadow-sm">
                {publishImmediately ? (
                  <>
                    <Store className="w-4 h-4" />
                    Register & Publish to Marketplace
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Register Hardware Unit
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

