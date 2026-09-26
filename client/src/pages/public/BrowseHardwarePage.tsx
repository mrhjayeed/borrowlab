import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useRealtimeEvent } from '../../context/RealtimeContext';
import { ListingAvailabilityItem, ComponentCategory } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/Badge';
import { HardwareImage } from '../../components/ui/HardwareImage';
import {
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  Building,
  RotateCcw,
  CheckCircle2,
  X,
  Layers,
  ChevronDown,
} from 'lucide-react';

export const BrowseHardwarePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [listings, setListings] = useState<ListingAvailabilityItem[]>([]);
  const [categories, setCategories] = useState<ComponentCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

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
    api
      .getCategories()
      .then((res) => setCategories(res.categories))
      .catch(() => {});
  }, []);

  // Fetch listings with current filters
  const fetchListings = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, any> = {
        search: search.trim() || undefined,
        category_id: categoryId || undefined,
        condition: condition || undefined,
        is_rentable: isRentableOnly ? 'true' : undefined,
        max_price: maxPrice !== '3000' ? maxPrice : undefined,
        min_trust: minTrust !== '80' ? minTrust : undefined,
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
  }, [categoryId, condition, isRentableOnly, maxPrice, minTrust, sort]);

  useRealtimeEvent(['LISTING_UPDATED', 'RENTAL_UPDATED'], () => {
    fetchListings();
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
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

  const activeFiltersCount = [
    Boolean(search),
    Boolean(categoryId),
    Boolean(condition),
    isRentableOnly,
    maxPrice !== '3000',
    minTrust !== '80',
  ].filter(Boolean).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Hardware Catalog & Exchange
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Borrow verified laboratory equipment, FPGA kits, oscilloscopes, and robotics units from campus peers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sorting */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 shadow-2xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 font-medium">Sort:</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="bg-transparent border-none outline-none font-medium text-slate-800 cursor-pointer text-xs"
            >
              <option value="newest">Newest First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating_desc">Highest Owner Trust</option>
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`gap-1.5 text-xs ${showAdvancedFilters ? 'bg-indigo-50 border-indigo-200 text-[#4F46E5]' : ''}`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#4F46E5] text-white text-[10px] font-bold flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </Button>

          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              title="Reset all filters"
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
            </Button>
          )}
        </div>
      </div>

      {/* Horizontal Category Quick Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setCategoryId('')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 cursor-pointer ${
            !categoryId
              ? 'bg-[#4F46E5] text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-2xs'
          }`}
        >
          All Equipment
        </button>
        {categories.map((cat) => (
          <button
            key={cat.category_id}
            onClick={() => setCategoryId(String(cat.category_id))}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              categoryId === String(cat.category_id)
                ? 'bg-[#4F46E5] text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-2xs'
            }`}
          >
            <span>{cat.name}</span>
            {cat.component_count ? (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  categoryId === String(cat.category_id)
                    ? 'bg-indigo-700/60 text-white'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {cat.component_count}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Primary Search Bar & In-Stock Quick Toggle */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Main Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search oscilloscopes, Basys 3 FPGA, Jetson Orin, logic analyzers..."
            className="w-full h-[40px] pl-10 pr-20 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#4F46E5] focus:ring-3 focus:ring-[#4F46E5]/10 shadow-2xs transition-all"
          />
          <div className="absolute inset-y-0 right-1.5 flex items-center gap-1">
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  fetchListings();
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="submit"
              className="h-[28px] px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-xs transition-colors cursor-pointer"
            >
              Search
            </button>
          </div>
        </form>

        {/* Available Only Pill Toggle */}
        <button
          type="button"
          onClick={() => setIsRentableOnly(!isRentableOnly)}
          className={`h-[40px] px-3.5 rounded-xl border text-xs font-medium flex items-center gap-2 transition-all shrink-0 cursor-pointer shadow-2xs ${
            isRentableOnly
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isRentableOnly ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
            }`}
          />
          <span>Available Now</span>
        </button>
      </div>

      {/* Collapsible Advanced Refinement Drawer */}
      {showAdvancedFilters && (
        <Card className="p-4 sm:p-5 border-slate-200 bg-slate-50/50 space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#4F46E5]" />
              Refine Search Criteria
            </span>
            <button
              onClick={() => setShowAdvancedFilters(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Condition Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Hardware Condition
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full h-[36px] bg-white border border-slate-200 rounded-lg px-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#4F46E5] shadow-2xs cursor-pointer"
              >
                <option value="">Any Condition</option>
                <option value="EXCELLENT">Excellent (Like New)</option>
                <option value="GOOD">Good (Bench Operational)</option>
                <option value="FAIR">Fair (Minor cosmetic wear)</option>
              </select>
            </div>

            {/* Max Weekly Fee */}
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

            {/* Min Owner Trust */}
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
          </div>
        </Card>
      )}

      {/* Active Filter Chips */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs text-slate-400 font-medium">Applied:</span>
          {search && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium">
              Search: "{search}"
              <button onClick={() => setSearch('')} className="hover:text-slate-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {categoryId && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-medium">
              Category: {categories.find((c) => String(c.category_id) === categoryId)?.name || categoryId}
              <button onClick={() => setCategoryId('')} className="hover:text-indigo-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {condition && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium">
              Condition: {condition}
              <button onClick={() => setCondition('')} className="hover:text-slate-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {isRentableOnly && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
              Available Only
              <button onClick={() => setIsRentableOnly(false)} className="hover:text-emerald-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {maxPrice !== '3000' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium">
              Max {maxPrice} BDT
              <button onClick={() => setMaxPrice('3000')} className="hover:text-slate-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {minTrust !== '80' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium">
              Trust ≥ {minTrust}%
              <button onClick={() => setMinTrust('80')} className="hover:text-slate-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          <button
            onClick={handleResetFilters}
            className="text-xs text-[#4F46E5] hover:underline font-medium ml-1 cursor-pointer"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Main Hardware Grid */}
      <div>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-80 rounded-2xl border border-slate-200 bg-white animate-pulse p-4 space-y-4"
              >
                <div className="h-44 bg-slate-100 rounded-xl" />
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-5 bg-slate-200 rounded w-3/4" />
                <div className="h-8 bg-slate-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <Card className="p-12 text-center space-y-4 max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <Search className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">No hardware matches found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                No units match your active filter criteria. Try expanding the price range or clearing category filters.
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={handleResetFilters}>
              Clear All Filters
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {listings.map((item) => (
              <Card
                key={item.listing_id}
                className="group relative flex flex-col rounded-2xl border border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-card-hover transition-all duration-200 overflow-hidden"
              >
                {/* Image Container with Floating Badges */}
                <Link to={`/listings/${item.listing_id}`} className="block relative overflow-hidden bg-slate-50">
                  <HardwareImage
                    src={item.primary_image_url || item.inventory_image_url}
                    alt={item.listing_title}
                    categoryName={item.category_name}
                    inventoryCode={item.inventory_code}
                    className="h-48 w-full group-hover:scale-[1.02] transition-transform duration-300"
                  />
                  {/* Floating Category Pill */}
                  <div className="absolute top-3 left-3 z-10">
                    <span className="px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-md border border-slate-200/80 text-slate-700 text-[11px] font-medium shadow-2xs">
                      {item.category_name}
                    </span>
                  </div>
                  {/* Floating Availability Status */}
                  <div className="absolute top-3 right-3 z-10">
                    <StatusBadge status={item.availability_status} size="sm" />
                  </div>
                </Link>

                {/* Card Body */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    {/* Item Title */}
                    <Link to={`/listings/${item.listing_id}`} className="block">
                      <h3 className="text-sm font-semibold text-slate-900 group-hover:text-[#4F46E5] line-clamp-1 transition-colors">
                        {item.listing_title}
                      </h3>
                    </Link>

                    {/* Spec Summary */}
                    <div className="text-xs text-slate-500 flex items-center gap-1.5 truncate">
                      <span>{item.manufacturer || 'Lab Standard'}</span>
                      <span className="text-slate-300">•</span>
                      <span className="font-mono text-[11px]">{item.model}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-600 font-medium">{item.hardware_condition}</span>
                    </div>

                    {/* Owner & Department Context */}
                    <div className="pt-2.5 mt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-1.5 truncate">
                        <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">
                          {item.owner_name} ({item.department_code || item.university_short_name})
                        </span>
                      </div>
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold shrink-0">
                        {parseFloat(String(item.owner_trust_score)).toFixed(0)}% Trust
                      </span>
                    </div>
                  </div>

                  {/* Card Footer: Pricing & Action CTA */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Weekly Rate</div>
                      <div className="text-base font-bold font-mono text-slate-900 tabular-nums">
                        {item.weekly_rent} <span className="text-xs font-normal text-slate-500 font-sans">BDT</span>
                      </div>
                    </div>

                    <Link to={`/listings/${item.listing_id}`}>
                      <Button
                        variant={item.is_rentable ? 'primary' : 'secondary'}
                        size="sm"
                      >
                        {item.is_rentable ? 'Rent Now' : 'View Details'}
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
