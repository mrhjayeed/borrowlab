import React, { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  className = '',
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-all duration-150 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] select-none cursor-pointer';

  const sizeStyles = {
    sm: 'h-[32px] px-3 text-xs gap-1.5',
    md: 'h-[36px] px-3.5 text-xs font-semibold gap-2',
    lg: 'h-[42px] px-4 text-sm font-semibold gap-2',
  }[size];

  const variantStyles = {
    primary:
      'bg-[#4F46E5] text-white hover:bg-[#4338CA] shadow-sm hover:shadow border border-indigo-700/20',
    secondary:
      'bg-white text-slate-800 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-2xs hover:text-slate-900',
    destructive:
      'bg-rose-50 text-rose-700 border border-rose-200/80 hover:bg-rose-600 hover:text-white hover:border-rose-600',
    outline:
      'bg-transparent text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900',
    ghost:
      'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  }[variant];

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
      {children}
    </button>
  );
};
