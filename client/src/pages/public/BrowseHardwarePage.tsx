import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../../api/client';
import { ListingAvailabilityItem, ComponentCategory } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/Badge';
import { TrustGauge } from '../../components/ui/TrustGauge';
import { HardwareImage } from '../../components/ui/HardwareImage';
import { Input } from '../../components/ui/Input';
import {
  Search,
  Filter,
  SlidersHorizontal,
  Lock,
  ArrowUpDown,
  Building,
  RotateCcw,
} from 'lucide-react';

export const BrowseHardwarePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [listings, setListings] = useState<ListingAvailabilityItem[]>([]);
  const [categories, setCategories] = useState<ComponentCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters state from URL or defaults
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [categoryId, setCategoryId] = useState(searchParams.get('category_id') || '');
  const [condition, setCondition] = useState(searchParams.get('condition') || '');
  const [isRentableOnly, setIsRentableOnly] = useState(searchParams.get('is_rentable') === 'true');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max_price') || '3000');
  const [minTrust, setMinTrust] = useState(searchParams.get('min_trust') || '80');
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');

  // Load categories
  useEffect(() => {
    api.getCategories().then((res) => setCategories(res.categories)).catch(() => {});
  }, []);

  // Fetch listings with current filters
  const fetchListings = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, any> = {
        search: search || undefined,
        category_id: categoryId || undefined,
        condition: condition || undefined,
        is_rentable: isRentableOnly ? 'true' : undefined,
        max_price: maxPrice || undefined,
        min_trust: minTrust || undefined,
        sort: sort || undefined,
      };

      const res = await api.getListings(params);
      setListings(res.listings);
    } catch {
      setListings([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [categoryId, condition, isRentableOnly, sort]);

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    fetchListings();
  };

  const handleResetFilters = () => {
    setSearch('');
    setCategoryId('');
    setCondition('');
    setIsRentableOnly(false);
    setMaxPrice('3000');
    setMinTrust('80');
    setSort('newest');
    setSearchParams({});
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Hardware Marketplace
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time catalog availability across engineering departments and labs
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sorting */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-[6px] px-2.5 py-1.5 text-xs text-slate-700 shadow-level-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">Sort:</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="bg-transparent border-none outline-none font-medium text-slate-800 cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating_desc">Highest Owner Trust</option>
            </select>
          </div>

          <Button variant="outline" size="sm" onClick={handleResetFilters} title="Reset all filters">
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Filter Panel */}
        <div className="lg:col-span-1 space-y-5">
          <Card className="p-4 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#4F46E5]" />
                Refine Search
              </span>
              <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                {listings.length} Results
              </span>
            </div>

            <form onSubmit={handleApplyFilters} className="space-y-4">
              {/* Search text input */}
              <Input
                label="Search Keyword"
                placeholder="Component, model, brand..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full h-[36px] bg-white border border-slate-300 rounded-[6px] px-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#4F46E5]"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.category_id} value={cat.category_id}>
                      {cat.name} ({cat.component_count || 0})
                    </option>
                  ))}
                </select>
              </div>

              {/* Hardware Condition */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Hardware Condition
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full h-[36px] bg-white border border-slate-300 rounded-[6px] px-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#4F46E5]"
                >
                  <option value="">Any Condition</option>
                  <option value="EXCELLENT">Excellent (Like New)</option>
                  <option value="GOOD">Good (Bench Operational)</option>
                  <option value="FAIR">Fair (Minor cosmetic wear)</option>
                </select>
              </div>

              {/* Availability Toggle */}
              <div className="flex items-center justify-between p-2.5 rounded bg-slate-50 border border-slate-200">
                <span className="text-xs font-medium text-slate-700">Available Only</span>
                <input
                  type="checkbox"
                  checked={isRentableOnly}
                  onChange={(e) => setIsRentableOnly(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#4F46E5] focus:ring-[#4F46E5]"
                />
              </div>

              {/* Max Weekly Rent Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 uppercase tracking-wider">Max Weekly Fee</span>
                  <span className="font-mono font-semibold text-[#4F46E5] tabular-nums">{maxPrice} BDT</span>
                </div>
                <input
                  type="range"
                  min="200"
                  max="3000"
                  step="50"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full accent-[#4F46E5] cursor-pointer"
                />
              </div>

              {/* Min Owner Trust Score */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 uppercase tracking-wider">Min Owner Trust</span>
                  <span className="font-mono font-semibold text-emerald-600 tabular-nums">≥ {minTrust}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  step="5"
                  value={minTrust}
                  onChange={(e) => setMinTrust(e.target.value)}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              <Button type="submit" variant="primary" size="md" className="w-full">
                Apply Filters
              </Button>
            </form>
          </Card>
        </div>

        {/* Right Hardware Listing Cards Grid */}
        <div className="lg:col-span-3">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-64 rounded-[6px] border border-slate-200 bg-white animate-pulse p-4 space-y-4">
                  <div className="h-4 bg-slate-200 rounded w-1/3" />
                  <div className="h-5 bg-slate-200 rounded w-3/4" />
                  <div className="h-16 bg-slate-100 rounded" />
                  <div className="h-8 bg-slate-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : listings.length === 0 ? (
            <Card className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">No hardware found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No units match your current filter criteria. Try expanding the price range or resetting filters.
              </p>
              <Button variant="secondary" size="sm" onClick={handleResetFilters}>
                Clear All Filters
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {listings.map((item) => (
                <Card
                  key={item.listing_id}
                  className="flex flex-col hover:border-slate-300 transition-all hover:shadow-level-2 overflow-hidden"
                >
                  <Link to={`/listings/${item.listing_id}`} className="block relative group">
                    <HardwareImage
                      src={item.primary_image_url || item.inventory_image_url}
                      alt={item.listing_title}
                      categoryName={item.category_name}
                      inventoryCode={item.inventory_code}
                      className="h-44 w-full group-hover:opacity-95 transition-opacity"
                    />
                    <div className="absolute top-2.5 right-2.5 z-10">
                      <StatusBadge status={item.availability_status} size="sm" />
                    </div>
                  </Link>

                  {/* Card Header: Category + Inventory Code */}
                  <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <span className="label-caps text-[#4F46E5] truncate max-w-[170px]">
                      {item.category_name}
                    </span>
                    <span className="mono-data-sm text-slate-500 font-mono text-[11px]">
                      {item.inventory_code}
                    </span>
                  </div>

                  {/* Card Body: Title, Specs, Owner Info */}
                  <div className="p-4 flex-1 space-y-3">
                    <Link to={`/listings/${item.listing_id}`} className="group block">
                      <h3 className="text-sm font-semibold text-slate-900 group-hover:text-[#4F46E5] line-clamp-2 transition-colors">
                        {item.listing_title}
                      </h3>
                    </Link>

                    {/* Spec Matrix */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] p-2.5 rounded bg-slate-50 border border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Model</span>
                        <span className="font-medium text-slate-700 truncate block">
                          {item.manufacturer} {item.model}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Condition</span>
                        <span className="font-medium text-slate-700 block">
                          {item.hardware_condition}
                        </span>
                      </div>
                    </div>

                    {/* Owner & Department telemetry */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <div className="flex items-center gap-1.5 text-slate-600 truncate">
                        <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{item.owner_name} ({item.department_code || item.university_short_name})</span>
                      </div>
                      <span className="font-mono text-[11px] font-semibold text-emerald-600 shrink-0">
                        {parseFloat(String(item.owner_trust_score)).toFixed(0)}% Trust
                      </span>
                    </div>
                  </div>

                  {/* Card Footer: Pricing + Escrow + Action CTA */}
                  <div className="p-3.5 border-t border-slate-100 bg-white flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider">Weekly Rent</div>
                      <div className="text-sm font-bold font-mono text-slate-900 tabular-nums">
                        {item.weekly_rent} <span className="text-[10px] font-normal text-slate-500">BDT</span>
                      </div>
                    </div>

                    <Link to={`/listings/${item.listing_id}`}>
                      <Button
                        variant={item.is_rentable ? 'primary' : 'secondary'}
                        size="sm"
                      >
                        {item.is_rentable ? 'Rent Now' : 'Details'}
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
