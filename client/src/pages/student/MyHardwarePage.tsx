import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
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
  Cpu,
  Layers,
  Wrench,
  CheckCircle2,
  Trash2,
  AlertCircle,
  Image as ImageIcon,
} from 'lucide-react';

export const MyHardwarePage: React.FC = () => {
  const { user } = useAuth();
  const { success, error } = useToast();

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [catalogComponents, setCatalogComponents] = useState<ComponentCatalog[]>([]);
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
  }, []);

  const handleAddAccessoryRow = () => {
    setAccessories([...accessories, { accessory_name: '', quantity: 1, replacement_value: 0, is_required: false }]);
  };

  const handleRemoveAccessoryRow = (index: number) => {
    setAccessories(accessories.filter((_, i) => i !== index));
  };

  const handleCreateHardware = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!componentId) {
      error('Please select a catalog component');
      return;
    }
    if (!inventoryCode.trim()) {
      error('Inventory code is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createInventory({
        component_id: Number(componentId),
        inventory_code: inventoryCode.trim(),
        serial_number: serialNumber.trim() || undefined,
        condition,
        replacement_value: parseFloat(replacementValue),
        current_location: location.trim() || undefined,
        description: description.trim() || undefined,
        image_url: imageUrl.trim() || undefined,
        accessories: accessories.filter((a) => a.accessory_name.trim().length > 0),
      });

      success('Hardware unit registered', `${inventoryCode} added to your personal inventory`);
      setIsAddModalOpen(false);
      // Reset form
      setInventoryCode('');
      setSerialNumber('');
      setImageUrl('');
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

        <Button variant="primary" size="sm" onClick={() => setIsAddModalOpen(true)} className="gap-1.5">
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
          <Button variant="primary" size="sm" onClick={() => setIsAddModalOpen(true)}>
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
        subtitle="Record individual asset tags, accessories, image photo, and valuation"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateHardware} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Canonical Catalog Component *
            </label>
            <select
              value={componentId}
              onChange={(e) => setComponentId(Number(e.target.value) || '')}
              className="w-full h-[36px] bg-white border border-slate-300 rounded-[6px] px-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#4F46E5]"
              required
            >
              <option value="">-- Select Catalog Component --</option>
              {catalogComponents.map((c) => (
                <option key={c.component_id} value={c.component_id}>
                  {c.component_name} ({c.manufacturer} {c.model})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Inventory Asset Code *"
              placeholder="e.g. INV-UIU-OSC-02"
              value={inventoryCode}
              onChange={(e) => setInventoryCode(e.target.value)}
              required
            />
            <Input
              label="Hardware Serial Number"
              placeholder="e.g. DS1ZA20489912"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
            />
          </div>

          {/* Asset Photo URL with blueprint placeholder preview hint */}
          <div className="space-y-1.5">
            <Input
              label="Equipment Photo URL (Optional)"
              placeholder="https://images.unsplash.com/... or leave blank for placeholder"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className="text-slate-400">Presets:</span>
              <button
                type="button"
                onClick={() => setImageUrl('https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80')}
                className="text-[#4F46E5] hover:underline font-medium"
              >
                Board Photo
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => setImageUrl('https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80')}
                className="text-[#4F46E5] hover:underline font-medium"
              >
                Lab Bench Photo
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => setImageUrl('')}
                className="text-slate-500 hover:underline"
              >
                Leave Empty (Use Placeholder)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Condition *
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as any)}
                className="w-full h-[36px] bg-white border border-slate-300 rounded-[6px] px-2 text-xs"
              >
                <option value="EXCELLENT">Excellent (Pristine)</option>
                <option value="GOOD">Good (Bench Operational)</option>
                <option value="FAIR">Fair (Minor Wear)</option>
              </select>
            </div>

            <Input
              label="Replacement Value (BDT) *"
              type="number"
              value={replacementValue}
              onChange={(e) => setReplacementValue(e.target.value)}
              required
            />

            <Input
              label="Current Location"
              placeholder="e.g. EEE Lab 3 / Dorm"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          {/* Accessories Checklist */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Accessories & Probes Checklist
              </label>
              <button
                type="button"
                onClick={handleAddAccessoryRow}
                className="text-xs text-[#4F46E5] hover:underline font-medium"
              >
                + Add Accessory
              </button>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto">
              {accessories.map((acc, index) => (
                <div key={index} className="flex items-center gap-2 text-xs">
                  <input
                    type="text"
                    placeholder="Accessory name (e.g. BNC Probe)"
                    value={acc.accessory_name}
                    onChange={(e) => {
                      const copy = [...accessories];
                      copy[index].accessory_name = e.target.value;
                      setAccessories(copy);
                    }}
                    className="flex-1 h-[32px] px-2 border border-slate-300 rounded"
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    value={acc.quantity}
                    onChange={(e) => {
                      const copy = [...accessories];
                      copy[index].quantity = parseInt(e.target.value, 10) || 1;
                      setAccessories(copy);
                    }}
                    className="w-14 h-[32px] px-2 border border-slate-300 rounded text-center"
                    min="1"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveAccessoryRow(index)}
                    className="text-slate-400 hover:text-red-600 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="secondary" type="button" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              Register Unit
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
