import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import {
  BarChart3,
  TrendingUp,
  Building,
  Layers,
  DollarSign,
  PackageCheck,
  CheckCircle2,
} from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const [hardwarePopularity, setHardwarePopularity] = useState<any>(null);
  const [deptRevenue, setDeptRevenue] = useState<any>(null);
  const [highTrust, setHighTrust] = useState<any>(null);
  const [pristineHardware, setPristineHardware] = useState<any>(null);
  const [unbooked, setUnbooked] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'category-revenue' | 'pricing-outliers' | 'audit-log'>('category-revenue');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      api.getHardwarePopularity(),
      api.getDepartmentRevenue(),
      api.getHighTrustStudents(),
      api.getPristineHardware(),
      api.getUnbookedListings(),
    ])
      .then(([pop, dept, trust, pristine, unb]) => {
        setHardwarePopularity(pop);
        setDeptRevenue(dept);
        setHighTrust(trust);
        setPristineHardware(pristine);
        setUnbooked(unb);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  // Compute summary KPI metrics from category data
  const totalRevenue = hardwarePopularity?.categories?.reduce(
    (acc: number, c: any) => acc + parseFloat(c.total_revenue || 0),
    0
  ) || 0;
  const totalRentals = hardwarePopularity?.categories?.reduce(
    (acc: number, c: any) => acc + parseInt(c.rental_count || 0),
    0
  ) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Platform Reports & Analytics</h1>
            <span className="px-2 py-0.5 rounded bg-indigo-100 text-[#4F46E5] text-[11px] font-bold uppercase tracking-wider border border-indigo-200">
              Admin Reports
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Campus-wide hardware utilization, department lending benchmarks, and financial telemetry
          </p>
        </div>

        {/* Business Concept Tab Navigation */}
        <div className="flex bg-slate-100 p-1 rounded-[6px] border border-slate-200 text-xs">
          <button
            onClick={() => setActiveTab('category-revenue')}
            className={`px-3 py-1.5 rounded-[4px] font-semibold transition-colors ${
              activeTab === 'category-revenue' ? 'bg-white text-slate-900 shadow-level-1' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Revenue by Category
          </button>
          <button
            onClick={() => setActiveTab('pricing-outliers')}
            className={`px-3 py-1.5 rounded-[4px] font-semibold transition-colors ${
              activeTab === 'pricing-outliers' ? 'bg-white text-slate-900 shadow-level-1' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pricing & Quality Benchmarks
          </button>
          <button
            onClick={() => setActiveTab('audit-log')}
            className={`px-3 py-1.5 rounded-[4px] font-semibold transition-colors ${
              activeTab === 'audit-log' ? 'bg-white text-slate-900 shadow-level-1' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Rental & Escrow Audit Log
          </button>
        </div>
      </div>

      {/* Top Executive Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>Total Rental Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {totalRevenue.toLocaleString()} <span className="text-xs text-slate-500 font-sans font-normal">BDT</span>
          </div>
          <div className="text-[11px] text-slate-500">Across all catalog categories</div>
        </Card>

        <Card className="p-4 space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>Completed Rentals</span>
            <PackageCheck className="w-4 h-4 text-[#4F46E5]" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {totalRentals}
          </div>
          <div className="text-[11px] text-slate-500">Recorded on university network</div>
        </Card>

        <Card className="p-4 space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>Active Categories</span>
            <Layers className="w-4 h-4 text-[#0E7490]" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {hardwarePopularity?.categories?.length || 0}
          </div>
          <div className="text-[11px] text-slate-500">With listed physical equipment</div>
        </Card>

        <Card className="p-4 space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>Leading Department</span>
            <Building className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-lg font-bold text-slate-900 truncate">
            {deptRevenue?.departments?.[0]?.department_name || 'CSE'}
          </div>
          <div className="text-[11px] text-slate-500">Top equipment sharing volume</div>
        </Card>
      </div>

      {isLoading ? (
        <div className="h-96 bg-white rounded border border-slate-200 animate-pulse" />
      ) : (
        <div className="space-y-6">
          {/* TAB 1: REVENUE BY CATEGORY */}
          {activeTab === 'category-revenue' && (
            <div className="space-y-6">
              {/* Category Performance Summary */}
              <Card className="overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Hardware Category Volume & Revenue Summary</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Aggregated utilization breakdown across equipment types and lending durations
                    </p>
                  </div>
                  <Badge variant="indigo" size="sm">Active Categories</Badge>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/40 text-slate-500 font-semibold label-caps">
                        <th className="py-2.5 px-4">Equipment Category</th>
                        <th className="py-2.5 px-4 text-center">Completed Rentals</th>
                        <th className="py-2.5 px-4 text-right">Total Revenue</th>
                        <th className="py-2.5 px-4 text-right">Average Fee</th>
                        <th className="py-2.5 px-4 text-right">Min Weekly Rent</th>
                        <th className="py-2.5 px-4 text-right">Max Weekly Rent</th>
                        <th className="py-2.5 px-4 text-center">Average Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {hardwarePopularity?.categories?.map((c: any) => (
                        <tr key={c.category_id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 font-sans font-semibold text-slate-900">{c.category_name}</td>
                          <td className="py-3 px-4 text-center font-bold text-[#4F46E5]">{c.rental_count}</td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-700">{parseFloat(c.total_revenue).toLocaleString()} BDT</td>
                          <td className="py-3 px-4 text-right text-slate-700">{c.avg_rental_fee} BDT</td>
                          <td className="py-3 px-4 text-right text-slate-500">{c.min_weekly_rent} BDT</td>
                          <td className="py-3 px-4 text-right text-slate-900 font-bold">{c.max_weekly_rent} BDT</td>
                          <td className="py-3 px-4 text-center text-slate-700 font-sans">{c.avg_duration_days} days</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Department Revenue Benchmark */}
              <Card className="overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Academic Department Revenue Benchmark</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Inter-departmental equipment sharing performance and active lender counts
                    </p>
                  </div>
                  <Badge variant="indigo" size="sm">Campus Benchmark</Badge>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/40 text-slate-500 font-semibold label-caps">
                        <th className="py-2.5 px-4">Department</th>
                        <th className="py-2.5 px-4">University</th>
                        <th className="py-2.5 px-4 text-center">Completed Rentals</th>
                        <th className="py-2.5 px-4 text-center">Active Lenders</th>
                        <th className="py-2.5 px-4 text-right">Total Lending Volume</th>
                        <th className="py-2.5 px-4 text-right">Avg Value / Rental</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {deptRevenue?.departments?.map((d: any) => (
                        <tr key={d.department_id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 font-sans font-semibold text-slate-900">
                            {d.department_name} ({d.department_code})
                          </td>
                          <td className="py-3 px-4 font-sans text-slate-600 font-medium">{d.university_short_name}</td>
                          <td className="py-3 px-4 text-center font-bold text-[#4F46E5]">{d.total_rentals}</td>
                          <td className="py-3 px-4 text-center text-slate-700 font-sans">{d.active_lenders_count}</td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-700">
                            {parseFloat(d.total_volume).toLocaleString()} BDT
                          </td>
                          <td className="py-3 px-4 text-right text-slate-700">{d.avg_rental_value} BDT</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 2: PRICING & QUALITY BENCHMARKS */}
          {activeTab === 'pricing-outliers' && (
            <div className="space-y-6">
              {/* High-Trust Students Card */}
              <Card className="overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">High-Trust Students Exceeding Department Average</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Top-tier borrowers and lenders with verified on-time return histories
                    </p>
                  </div>
                  <Badge variant="available" size="sm">Top Reputation</Badge>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/40 text-slate-500 font-semibold label-caps">
                        <th className="py-2.5 px-4">Student Name</th>
                        <th className="py-2.5 px-4">University Email</th>
                        <th className="py-2.5 px-4">Department</th>
                        <th className="py-2.5 px-4 text-right">Trust Score</th>
                        <th className="py-2.5 px-4 text-right">Department Benchmark</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {highTrust?.students?.map((s: any) => (
                        <tr key={s.user_id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 font-sans font-semibold text-slate-900">{s.full_name}</td>
                          <td className="py-3 px-4 text-slate-500">{s.university_email}</td>
                          <td className="py-3 px-4 font-sans text-slate-700">{s.department_code}</td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-600">{parseFloat(s.trust_score).toFixed(1)}%</td>
                          <td className="py-3 px-4 text-right text-slate-400">{s.department_avg_trust}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Pristine Hardware Quality Card */}
              <Card className="overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Pristine Hardware Inventory With Flawless Service History</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Equipment units with active rental history and zero reported condition disputes
                    </p>
                  </div>
                  <Badge variant="available" size="sm">100% Satisfaction</Badge>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/40 text-slate-500 font-semibold label-caps">
                        <th className="py-2.5 px-4">Hardware Component</th>
                        <th className="py-2.5 px-4">Manufacturer & Model</th>
                        <th className="py-2.5 px-4">Category</th>
                        <th className="py-2.5 px-4 text-center">Completed Rentals</th>
                        <th className="py-2.5 px-4 text-right">Average Rating</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pristineHardware?.pristineComponents?.map((p: any) => (
                        <tr key={p.component_id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-900">{p.component_name}</td>
                          <td className="py-3 px-4 font-mono text-slate-600">{p.manufacturer} {p.model}</td>
                          <td className="py-3 px-4 text-slate-500 text-xs">{p.category_name}</td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-[#4F46E5]">{p.total_rental_count}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">{p.average_rating} / 5.0</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 3: RENTAL & ESCROW AUDIT LOG */}
          {activeTab === 'audit-log' && (
            <Card className="overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Unbooked Active Listings & Equipment Availability</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Hardware listings currently available for immediate reservation across all campus labs
                  </p>
                </div>
                <Badge variant="indigo" size="sm">Real-Time Inventory</Badge>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/40 text-slate-500 font-semibold label-caps">
                      <th className="py-2.5 px-4">Listing Title</th>
                      <th className="py-2.5 px-4">Inventory Code</th>
                      <th className="py-2.5 px-4">Equipment Owner</th>
                      <th className="py-2.5 px-4">Campus Location</th>
                      <th className="py-2.5 px-4 text-right">Weekly Rent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {unbooked?.unbookedListings?.map((l: any) => (
                      <tr key={l.listing_id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">{l.listing_title}</td>
                        <td className="py-3 px-4 font-mono text-[#4F46E5] font-medium">{l.inventory_code}</td>
                        <td className="py-3 px-4 text-slate-700">{l.owner_name}</td>
                        <td className="py-3 px-4 text-slate-500">{l.university_name}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{l.weekly_rent} BDT</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
