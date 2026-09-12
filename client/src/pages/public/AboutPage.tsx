import React from 'react';
import { Card } from '../../components/ui/Card';
import { Building, Cpu, ShieldCheck, Users, GraduationCap, Award } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="space-y-10 max-w-4xl mx-auto py-4">
      {/* Hero Header */}
      <div className="text-center space-y-3">
        <span className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-[#4F46E5] text-xs font-semibold uppercase tracking-wider">
          About the Project
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
          Peer-to-Peer Academic Hardware Infrastructure
        </h1>
        <p className="text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
          BorrowLab is designed to solve hardware scarcity in university engineering labs by enabling students, researchers, and departments to lend and borrow equipment with institutional accountability.
        </p>
      </div>

      {/* University Focus */}
      <Card className="p-6 sm:p-8 space-y-4 border-slate-200 shadow-level-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 text-[#4F46E5] flex items-center justify-center">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Primary Campus: United International University (UIU)</h2>
            <p className="text-xs text-slate-500">United City, Madani Avenue, Badda, Dhaka 1212, Bangladesh</p>
          </div>
        </div>
        <p className="text-xs text-slate-700 leading-relaxed">
          At UIU's Department of Computer Science & Engineering (CSE) and Department of Electrical & Electronic Engineering (EEE), capstone projects and research initiatives frequently require access to specialized hardware: high-speed digital oscilloscopes, Artix-7 and MAX 10 FPGA trainer boards, Jetson edge AI accelerators, programmable DC power supplies, and LiDAR sensors.
        </p>
        <p className="text-xs text-slate-700 leading-relaxed">
          BorrowLab bridges the gap between idle equipment sitting in private student lockers and active project teams needing hardware for short-term testing and development sprints.
        </p>
      </Card>

      {/* Core Architectural Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-5 space-y-3 border-slate-200">
          <ShieldCheck className="w-6 h-6 text-[#06B6D4]" />
          <h3 className="font-bold text-sm text-slate-900">Safe Escrow Architecture</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Eliminates informal transactions. Security deposits remain locked in virtual escrow until hardware is returned in verified condition.
          </p>
        </Card>

        <Card className="p-5 space-y-3 border-slate-200">
          <Cpu className="w-6 h-6 text-[#4F46E5]" />
          <h3 className="font-bold text-sm text-slate-900">Hardware Catalog Registry</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Detailed tracking of physical inventory codes, serial numbers, calibrated dates, and included accessories (probes, adapters, cables).
          </p>
        </Card>

        <Card className="p-5 space-y-3 border-slate-200">
          <Users className="w-6 h-6 text-emerald-600" />
          <h3 className="font-bold text-sm text-slate-900">Verified Campus Personas</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Access is restricted to verified university domain accounts (<span className="font-mono text-xs font-semibold">@uiu.ac.bd</span>), ensuring trust and institutional accountability.
          </p>
        </Card>
      </div>
    </div>
  );
};
