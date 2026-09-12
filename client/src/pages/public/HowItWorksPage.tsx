import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  Search,
  Lock,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Wallet,
  Clock,
  Building,
} from 'lucide-react';

export const HowItWorksPage: React.FC = () => {
  return (
    <div className="space-y-12 max-w-5xl mx-auto py-4">
      {/* Header */}
      <div className="text-center space-y-3">
        <span className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-[#4F46E5] text-xs font-semibold uppercase tracking-wider">
          Student & Researcher Guide
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
          How Hardware Lending Works on BorrowLab
        </h1>
        <p className="text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
          A transparent, escrow-protected academic hardware exchange network. Borrow specialized lab equipment from peers and labs across United International University (UIU).
        </p>
      </div>

      {/* 4 Steps for Borrowers */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <span>Borrowing Workflow</span>
          <span className="text-xs font-normal text-slate-500">(For Students & Project Teams)</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-5 space-y-3 relative border-slate-200 shadow-level-1">
            <div className="w-8 h-8 rounded-full bg-indigo-50 text-[#4F46E5] font-bold text-xs flex items-center justify-center border border-indigo-200">
              01
            </div>
            <h3 className="font-bold text-sm text-slate-900">Discover Hardware</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Browse real-time listings by category, university department, or manufacturer with guaranteed live availability.
            </p>
          </Card>

          <Card className="p-5 space-y-3 relative border-slate-200 shadow-level-1">
            <div className="w-8 h-8 rounded-full bg-cyan-50 text-[#0E7490] font-bold text-xs flex items-center justify-center border border-cyan-200">
              02
            </div>
            <h3 className="font-bold text-sm text-slate-900">Escrow Security</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Rental fee and refundable security deposit are locked atomically in virtual escrow. No cash handoffs required.
            </p>
          </Card>

          <Card className="p-5 space-y-3 relative border-slate-200 shadow-level-1">
            <div className="w-8 h-8 rounded-full bg-indigo-50 text-[#4F46E5] font-bold text-xs flex items-center justify-center border border-indigo-200">
              03
            </div>
            <h3 className="font-bold text-sm text-slate-900">Lab Pickup</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Collect equipment from the designated lab bench or campus locker. Inspect probes and accessories on pickup.
            </p>
          </Card>

          <Card className="p-5 space-y-3 relative border-slate-200 shadow-level-1">
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center justify-center border border-emerald-200">
              04
            </div>
            <h3 className="font-bold text-sm text-slate-900">Return & Release</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Upon return verification, escrow security deposit is immediately returned to your wallet balance.
            </p>
          </Card>
        </div>
      </div>

      {/* Owner Workflow */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <span>Lending Workflow</span>
          <span className="text-xs font-normal text-slate-500">(For Hardware Owners & Lab Officers)</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 space-y-3 border-slate-200 shadow-level-1">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-[#4F46E5] flex items-center justify-center">
              <Search className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Register Hardware</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              List idle oscilloscopes, FPGA boards, and sensors with serial numbers, baseline condition photos, and included accessories.
            </p>
          </Card>

          <Card className="p-6 space-y-3 border-slate-200 shadow-level-1">
            <div className="w-9 h-9 rounded-lg bg-cyan-50 text-[#0E7490] flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Guaranteed Escrow Protection</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Your equipment is backed by full replacement security deposits. The borrower cannot withdraw deposit funds during an active rental.
            </p>
          </Card>

          <Card className="p-6 space-y-3 border-slate-200 shadow-level-1">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <RotateCcw className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Inspection & Earnings</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Inspect the item upon return. Rental fees are credited directly to your virtual balance, and review ratings boost your campus reputation.
            </p>
          </Card>
        </div>
      </div>

      {/* Safety & Moderation */}
      <Card className="p-6 sm:p-8 bg-gradient-to-br from-indigo-50/60 to-white border-indigo-100 shadow-level-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#4F46E5] uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              Institutional Safety & Arbitration
            </div>
            <h3 className="text-xl font-bold text-slate-900">
              Department Lab Managers Provide Impartial Arbitration
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              If an item is returned with damage or missing accessories, either party can open a dispute. UIU lab moderators review photos and condition logs to determine fair settlement deductions from the held deposit.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <Link to="/browse">
              <Button variant="primary" size="md">
                Browse Marketplace
              </Button>
            </Link>
            <Link to="/register">
              <Button variant="outline" size="md">
                Sign Up with UIU ID
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
};
