import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { ListingAvailabilityItem } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/Badge';
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
  CheckCircle2,
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
    <div className="space-y-16 pb-16 max-w-7xl mx-auto">
      {/* Hero Section */}
      <section className="relative pt-8 pb-12 overflow-hidden text-center">
        {/* Subtle Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-indigo-500/10 via-purple-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50/80 border border-indigo-200/80 text-[#4F46E5] text-xs font-semibold tracking-wide uppercase shadow-2xs">
            <Zap className="w-3.5 h-3.5" />
            <span>Campus Peer-to-Peer Hardware Network</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.12]">
            Don’t buy it for one semester.{' '}
            <span className="block text-[#4F46E5] mt-1">Borrow it from a senior.</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            BorrowLab connects engineering students, researchers, and university labs. Rent calibrated oscilloscopes, FPGAs, logic analyzers, and robotics kits with verified trust scores and simulated escrow security.
          </p>

          {/* Search Hero Bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="max-w-2xl mx-auto flex items-center bg-white border border-slate-200/90 rounded-2xl p-1.5 shadow-level-2 focus-within:border-[#4F46E5] focus-within:ring-4 focus-within:ring-[#4F46E5]/10 transition-all"
          >
            <div className="pl-3.5 pr-2 text-slate-400">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search oscilloscopes, Basys 3 FPGA, Jetson Orin, sensors..."
              className="flex-1 text-sm bg-transparent border-none outline-none text-slate-900 placeholder:text-slate-400 py-2.5"
            />
            <Button type="submit" variant="primary" size="md" className="rounded-xl px-5 text-xs sm:text-sm font-semibold">
              Search Hardware
            </Button>
          </form>

          {/* Quick Category Chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <span className="text-xs text-slate-400 font-medium">Popular:</span>
            {categories.slice(0, 5).map((cat) => (
              <button
                key={cat.category_id}
                onClick={() => navigate(`/browse?category_id=${cat.category_id}`)}
                className="px-3 py-1 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-medium transition-all shadow-2xs hover:text-slate-900 cursor-pointer"
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Telemetry Counter Strip */}
      <section className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-y md:divide-y-0 md:divide-x divide-slate-100">
          <div className="pt-2 md:pt-0">
            <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 tabular-nums">
              {kpis?.active_listings_count || '10+'}
            </div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">
              Active Listings
            </div>
          </div>
          <div className="pt-4 md:pt-0">
            <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-600 tabular-nums">
              {kpis?.active_rentals_count || '2'}
            </div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">
              Hardware Units in Field
            </div>
          </div>
          <div className="pt-4 md:pt-0">
            <div className="text-2xl sm:text-3xl font-bold font-mono text-cyan-700 tabular-nums">
              {kpis?.current_escrow_pool ? `${parseFloat(kpis.current_escrow_pool).toLocaleString()} BDT` : '10,000 BDT'}
            </div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">
              Escrow Security Pool
            </div>
          </div>
          <div className="pt-4 md:pt-0">
            <div className="text-2xl sm:text-3xl font-bold font-mono text-[#4F46E5] tabular-nums">
              98.8%
            </div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">
              Average Trust Score
            </div>
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
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Calibrated test instruments, FPGA trainers, and edge computing kits ready for immediate dispatch
            </p>
          </div>
          <Link to="/browse">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold">
              Browse All <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {featuredListings.map((listing) => (
            <Card
              key={listing.listing_id}
              className="group relative flex flex-col rounded-2xl border border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-card-hover transition-all duration-200 overflow-hidden"
            >
              {/* Image Container with Floating Badges */}
              <Link to={`/listings/${listing.listing_id}`} className="block relative overflow-hidden bg-slate-50">
                <HardwareImage
                  src={listing.primary_image_url || listing.inventory_image_url}
                  alt={listing.listing_title}
                  categoryName={listing.category_name}
                  inventoryCode={listing.inventory_code}
                  className="h-48 w-full group-hover:scale-[1.02] transition-transform duration-300"
                />
                {/* Floating Category Pill */}
                <div className="absolute top-3 left-3 z-10">
                  <span className="px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-md border border-slate-200/80 text-slate-700 text-[11px] font-medium shadow-2xs">
                    {listing.category_name}
                  </span>
                </div>
                {/* Floating Availability Status */}
                <div className="absolute top-3 right-3 z-10">
                  <StatusBadge status={listing.availability_status} size="sm" />
                </div>
              </Link>

              {/* Card Body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <Link to={`/listings/${listing.listing_id}`} className="block">
                    <h3 className="text-sm font-semibold text-slate-900 group-hover:text-[#4F46E5] line-clamp-1 transition-colors">
                      {listing.listing_title}
                    </h3>
                  </Link>

                  <div className="text-xs text-slate-500 flex items-center gap-1.5 truncate">
                    <span>{listing.manufacturer || 'Lab Standard'}</span>
                    <span className="text-slate-300">•</span>
                    <span className="font-mono text-[11px]">{listing.model}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-600 font-medium">{listing.hardware_condition}</span>
                  </div>

                  {/* Owner & Department Context */}
                  <div className="pt-2.5 mt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1.5 truncate">
                      <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {listing.owner_name} ({listing.department_code || listing.university_short_name})
                      </span>
                    </div>
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold shrink-0">
                      {parseFloat(String(listing.owner_trust_score)).toFixed(0)}% Trust
                    </span>
                  </div>
                </div>

                {/* Pricing & CTA */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Weekly Rate</div>
                    <div className="text-base font-bold font-mono text-slate-900 tabular-nums">
                      {listing.weekly_rent} <span className="text-xs font-normal text-slate-500 font-sans">BDT</span>
                    </div>
                  </div>

                  <Link to={`/listings/${listing.listing_id}`}>
                    <Button variant="secondary" size="sm">
                      View Details
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Institutional Architecture Highlights */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        <Card className="p-6 rounded-2xl border-slate-200/80 space-y-3 hover:border-slate-300 hover:shadow-card-hover transition-all">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100/80 flex items-center justify-center text-[#4F46E5]">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Escrow Security Deposits</h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Borrower security deposits are held in atomic virtual escrow upon rental activation. Funds are released automatically only after the owner inspects and confirms condition.
          </p>
        </Card>

        <Card className="p-6 rounded-2xl border-slate-200/80 space-y-3 hover:border-slate-300 hover:shadow-card-hover transition-all">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100/80 flex items-center justify-center text-emerald-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Conflict-Free Hardware Reservation</h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Real-time inventory serialization guarantees that hardware requested by your project team cannot be double-booked or claimed by concurrent borrowers.
          </p>
        </Card>

        <Card className="p-6 rounded-2xl border-slate-200/80 space-y-3 hover:border-slate-300 hover:shadow-card-hover transition-all">
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100/80 flex items-center justify-center text-amber-600">
            <Activity className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Arbitrated Disputes</h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Damage reports include photo evidence and inventory accessory checks. Lab managers arbitrate disputes with partial or full escrow deductions and immutable ledger trails.
          </p>
        </Card>
      </section>
    </div>
  );
};
