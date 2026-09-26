import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'available' | 'reserved' | 'fault' | 'escrow' | 'neutral' | 'indigo';
  size?: 'sm' | 'md';
  showDot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  showDot = false,
  className = '',
}) => {
  const sizeStyles = {
    sm: 'h-[20px] px-2 text-[11px]',
    md: 'h-[22px] px-2.5 text-xs',
  }[size];

  const variantStyles = {
    available: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    reserved: 'bg-amber-50 text-amber-700 border-amber-200/80',
    fault: 'bg-rose-50 text-rose-700 border-rose-200/80',
    escrow: 'bg-cyan-50 text-cyan-700 border-cyan-200/80',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
    neutral: 'bg-slate-100 text-slate-600 border-slate-200/80',
  }[variant];

  const dotColor = {
    available: 'bg-emerald-500',
    reserved: 'bg-amber-500',
    fault: 'bg-rose-500',
    escrow: 'bg-cyan-500',
    indigo: 'bg-indigo-500',
    neutral: 'bg-slate-400',
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border shadow-2xs ${sizeStyles} ${variantStyles} ${className}`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />}
      {children}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: string; size?: 'sm' | 'md' }> = ({ status, size = 'md' }) => {
  const s = (status || '').toUpperCase();
  const formatText = (txt: string) =>
    txt
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');

  if (s === 'AVAILABLE') {
    return <Badge variant="available" size={size} showDot>Available</Badge>;
  }
  if (s === 'COMPLETED') {
    return <Badge variant="available" size={size}>Completed</Badge>;
  }
  if (s === 'RENTED' || s === 'ACTIVE') {
    return <Badge variant="reserved" size={size} showDot>In Use</Badge>;
  }
  if (s === 'RESERVED' || s === 'REQUESTED' || s === 'APPROVED' || s === 'RETURN_PENDING' || s === 'WAITING') {
    return <Badge variant="reserved" size={size}>{formatText(s)}</Badge>;
  }
  if (s === 'OVERDUE' || s === 'DISPUTED' || s === 'FAULT' || s === 'LOST' || s === 'CANCELLED' || s === 'BANNED') {
    return <Badge variant="fault" size={size} showDot>{formatText(s)}</Badge>;
  }
  if (s === 'HELD' || s === 'FROZEN' || s === 'ESCROW_LOCKED') {
    return <Badge variant="escrow" size={size}>Escrow {formatText(s.replace('ESCROW_', ''))}</Badge>;
  }

  return <Badge variant="neutral" size={size}>{formatText(s)}</Badge>;
};
