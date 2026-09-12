import React from 'react';
import { ShieldCheck } from 'lucide-react';

export interface TrustGaugeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const TrustGauge: React.FC<TrustGaugeProps> = ({
  score = 100,
  size = 'md',
  showLabel = true,
}) => {
  const normalized = Math.min(100, Math.max(0, score));

  // Color logic
  let color = '#10B981'; // green
  let bgTint = '#ECFDF5';
  let strokeBorder = '#A7F3D0';

  if (normalized < 75) {
    color = '#EF4444'; // red
    bgTint = '#FEF2F2';
    strokeBorder = '#FECACA';
  } else if (normalized < 90) {
    color = '#F59E0B'; // amber
    bgTint = '#FFFBEB';
    strokeBorder = '#FDE68A';
  }

  const radius = size === 'sm' ? 12 : size === 'md' ? 14 : 18;
  const stroke = size === 'sm' ? 2.5 : 3;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (normalized / 100) * circumference;

  return (
    <div
      className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border"
      style={{ backgroundColor: bgTint, borderColor: strokeBorder }}
    >
      <div className="relative flex items-center justify-center">
        <svg
          className="transform -rotate-90"
          width={radius * 2 + stroke * 2}
          height={radius * 2 + stroke * 2}
        >
          {/* Background circle */}
          <circle
            cx={radius + stroke}
            cy={radius + stroke}
            r={radius}
            stroke={strokeBorder}
            strokeWidth={stroke}
            fill="transparent"
          />
          {/* Progress circle */}
          <circle
            cx={radius + stroke}
            cy={radius + stroke}
            r={radius}
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-500 ease-out"
          />
        </svg>
        <ShieldCheck
          className="absolute text-slate-700"
          style={{ width: radius * 1.1, height: radius * 1.1, color }}
        />
      </div>

      {showLabel && (
        <span
          className="font-mono text-xs font-semibold tabular-nums tracking-tight"
          style={{ color }}
        >
          {normalized.toFixed(1)}% Trust
        </span>
      )}
    </div>
  );
};
