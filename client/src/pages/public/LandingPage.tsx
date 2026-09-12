import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { ListingAvailabilityItem } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/Badge';
import { TrustGauge } from '../../components/ui/TrustGauge';
import { HardwareImage } from '../../components/ui/HardwareImage';
import {
  Search,
  Cpu,
  ArrowRight,
  ShieldCheck,
  Lock,
  Layers,
  CheckCircle,
  Building,
  Zap,
  Activity,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [featuredListings, setFeaturedListings] = useState<ListingAvailabilityItem[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [kpis, setKpis] = useState<any>(null);

  useEffect(() => {
    api.getListings({ limit: 6 }).then((res) => setFeaturedListings(res.listings)).catch(() => {});
    api.getCategories().then((res) => setCategories(res.categories)).catch(() => {});
    api.getAdminOverview().then((res) => setKpis(res.overview)).catch(() => {});
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/browse?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/browse');
    }
  };

  return (
    <div className="space-y-16 pb-12">
      {/* Hero Section */}
      <section className="relative pt-6 pb-12 overflow-hidden">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-[#4F46E5] text-xs font-semibold tracking-wide uppercase animate-in fade-in slide-in-from-top-2">
            <Zap className="w-3.5 h-3.5" />
            Institutional P2P Hardware Lending
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
            Peer-to-Peer Academic Hardware
            <span className="block text-[#4F46E5]">With Escrow-Backed Integrity</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            BorrowLab connects engineering students, researchers, and university labs. Rent calibrated oscilloscopes, FPGAs, logic analyzers, and robotics kits with verified trust scores and simulated escrow security.
          </p>

          {/* Search Hero Bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="max-w-2xl mx-auto flex items-center bg-white border border-slate-300 rounded-[8px] p-1.5 shadow-level-2 focus-within:border-[#4F46E5] focus-within:ring-4 focus-within:ring-[#4F46E5]/15 transition-all"
          >
            <div className="pl-3 pr-2 text-slate-400">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search oscilloscopes, Basys 3 FPGA, Jetson Orin, logic analyzers..."
              className="flex-1 text-sm bg-transparent border-none outline-none text-slate-900 placeholder:text-slate-400 py-2"
            />
            <Button type="submit" variant="primary" size="md">
              Search Hardware
            </Button>
          </form>

          {/* Quick Category Chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <span className="text-xs text-slate-400 font-medium">Trending:</span>
            {categories.slice(0, 5).map((cat) => (
              <button
                key={cat.category_id}
                onClick={() => navigate(`/browse?category_id=${cat.category_id}`)}
                className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs transition-colors"
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Telemetry Counter Strip */}
      <section className="border-y border-slate-200 py-6 bg-white shadow-level-1">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-x divide-slate-100">
          <div>
            <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
              {kpis?.active_listings_count || '10+'}
            </div>
            <div className="label-caps mt-1 text-slate-400">Active Listings</div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-emerald-600 tabular-nums">
              {kpis?.active_rentals_count || '2'}
            </div>
            <div className="label-caps mt-1 text-slate-400">Hardware Units in Field</div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-[#0E7490] tabular-nums">
              {kpis?.current_escrow_pool ? `${parseFloat(kpis.current_escrow_pool).toLocaleString()} BDT` : '10,000 BDT'}
            </div>
            <div className="label-caps mt-1 text-slate-400">Escrow Security Pool</div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-[#4F46E5] tabular-nums">
              98.8%
            </div>
            <div className="label-caps mt-1 text-slate-400">Average Trust Score</div>
          </div>
        </div>
      </section>

      {/* Featured Hardware Grid */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Featured Academic Hardware
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Calibrated test instruments, FPGA trainers, and edge computing kits ready for dispatch
            </p>
          </div>
          <Link to="/browse">
            <Button variant="outline" size="sm" className="gap-1">
              View All Hardware <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {featuredListings.map((listing) => (
            <Card
              key={listing.listing_id}
              className="flex flex-col hover:border-slate-300 transition-all hover:shadow-level-2 overflow-hidden"
            >
              <Link to={`/listings/${listing.listing_id}`} className="block relative group">
                <HardwareImage
                  src={listing.primary_image_url || listing.inventory_image_url}
                  alt={listing.listing_title}
                  categoryName={listing.category_name}
                  inventoryCode={listing.inventory_code}
                  className="h-44 w-full group-hover:opacity-95 transition-opacity"
                />
                <div className="absolute top-2.5 right-2.5 z-10">
                  <StatusBadge status={listing.availability_status} size="sm" />
                </div>
              </Link>

              {/* Asset Header */}
              <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <span className="label-caps text-[#4F46E5] truncate max-w-[170px]">
                  {listing.category_name}
                </span>
                <span className="font-mono text-xs text-slate-500">
                  {listing.inventory_code}
                </span>
              </div>

              {/* Asset Body */}
              <div className="p-4 flex-1 space-y-3">
                <Link to={`/listings/${listing.listing_id}`} className="group block">
                  <h3 className="text-sm font-semibold text-slate-900 group-hover:text-[#4F46E5] line-clamp-2 transition-colors">
                    {listing.listing_title}
                  </h3>
                </Link>

                <div className="text-xs text-slate-500 line-clamp-2">
                  {listing.listing_description}
                </div>

                {/* Spec Matrix */}
                <div className="grid grid-cols-2 gap-2 text-[11px] p-2.5 rounded bg-slate-50 border border-slate-100">
                  <div>
                    <span className="text-slate-400 block">Model</span>
                    <span className="font-medium text-slate-700 truncate block">
                      {listing.manufacturer} {listing.model}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Condition</span>
                    <span className="font-medium text-slate-700 block">
                      {listing.hardware_condition}
                    </span>
                  </div>
                </div>
              </div>

              {/* Asset Footer */}
              <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-400">Weekly Rent</div>
                  <div className="text-base font-bold font-mono text-slate-900 tabular-nums">
                    {listing.weekly_rent} <span className="text-xs font-normal text-slate-500">BDT</span>
                  </div>
                </div>

                <Link to={`/listings/${listing.listing_id}`}>
                  <Button variant="secondary" size="sm">
                    View Details
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Institutional Architecture Highlights */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
        <Card className="p-5 space-y-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4F46E5]">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">Escrow Security Deposits</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Borrower security deposits are held in atomic virtual escrow upon rental activation. Funds are released automatically only after the owner inspects and confirms condition.
          </p>
        </Card>

        <Card className="p-5 space-y-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">Conflict-Free Hardware Reservation</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Real-time inventory serialization guarantees that hardware requested by your project team cannot be double-booked or claimed by concurrent borrowers.
          </p>
        </Card>

        <Card className="p-5 space-y-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <Activity className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">Arbitrated Disputes</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Damage reports include photo evidence and inventory accessory checks. Lab managers arbitrate disputes with partial or full escrow deductions and immutable ledger trails.
          </p>
        </Card>
      </section>
    </div>
  );
};
