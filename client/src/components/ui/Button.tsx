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
    'inline-flex items-center justify-center font-medium transition-all duration-150 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.99] select-none';

  const sizeStyles = {
    sm: 'h-[30px] px-2.5 text-xs gap-1.5',
    md: 'h-[36px] px-3.5 text-[13px] gap-2',
    lg: 'h-[40px] px-4 text-sm gap-2',
  }[size];

  const variantStyles = {
    primary:
      'bg-[#4F46E5] text-white hover:bg-[#4338CA] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] border border-[#4338CA]/20',
    secondary:
      'bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-level-1',
    destructive:
      'bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white',
    outline:
      'bg-transparent text-slate-700 border border-slate-300 hover:bg-slate-50 hover:text-slate-900',
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
