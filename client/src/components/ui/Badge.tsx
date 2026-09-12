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
    sm: 'h-[18px] px-1.5 text-[10px]',
    md: 'h-[20px] px-2 text-[11px]',
  }[size];

  const variantStyles = {
    available: 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]',
    reserved: 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]',
    fault: 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]',
    escrow: 'bg-[#ECFEFF] text-[#0E7490] border-[#A5F3FC]',
    indigo: 'bg-[#EEF2FF] text-[#4338CA] border-[#C7D2FE]',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  }[variant];

  const dotColor = {
    available: 'bg-[#10B981]',
    reserved: 'bg-[#F59E0B]',
    fault: 'bg-[#EF4444]',
    escrow: 'bg-[#06B6D4]',
    indigo: 'bg-[#4F46E5]',
    neutral: 'bg-slate-400',
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border tracking-wide uppercase ${sizeStyles} ${variantStyles} ${className}`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />}
      {children}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: string; size?: 'sm' | 'md' }> = ({ status, size = 'md' }) => {
  const s = (status || '').toUpperCase();

  if (s === 'AVAILABLE' || s === 'COMPLETED' || s === 'ACTIVE' && status === 'ACTIVE') {
    if (s === 'AVAILABLE') return <Badge variant="available" size={size} showDot>Available</Badge>;
    if (s === 'COMPLETED') return <Badge variant="available" size={size}>Completed</Badge>;
  }

  if (s === 'RENTED' || s === 'ACTIVE') {
    return <Badge variant="reserved" size={size} showDot>In Use</Badge>;
  }

  if (s === 'RESERVED' || s === 'REQUESTED' || s === 'APPROVED' || s === 'RETURN_PENDING' || s === 'WAITING') {
    return <Badge variant="reserved" size={size}>{s.replace('_', ' ')}</Badge>;
  }

  if (s === 'OVERDUE' || s === 'DISPUTED' || s === 'FAULT' || s === 'LOST' || s === 'CANCELLED' || s === 'BANNED') {
    return <Badge variant="fault" size={size} showDot>{s.replace('_', ' ')}</Badge>;
  }

  if (s === 'HELD' || s === 'FROZEN' || s === 'ESCROW_LOCKED') {
    return <Badge variant="escrow" size={size}>Escrow {s}</Badge>;
  }

  return <Badge variant="neutral" size={size}>{s}</Badge>;
};
