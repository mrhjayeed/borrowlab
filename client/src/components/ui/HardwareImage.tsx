import React, { useState, useEffect } from 'react';
import { Cpu, Activity, CircuitBoard, Wrench, Boxes, ImageOff } from 'lucide-react';

export interface HardwareImageProps {
  src?: string | null;
  alt?: string;
  categoryName?: string;
  inventoryCode?: string;
  className?: string;
  imgClassName?: string;
  aspectRatio?: string;
  size?: 'sm' | 'md' | 'lg';
  showBadge?: boolean;
}

export const HardwareImage: React.FC<HardwareImageProps> = ({
  src,
  alt = 'Hardware Equipment',
  categoryName = '',
  inventoryCode,
  className = 'w-full h-44',
  imgClassName = 'w-full h-full object-cover',
  size = 'md',
  showBadge = true,
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Reset state if src changes
  useEffect(() => {
    setHasError(false);
    setIsLoaded(false);
  }, [src]);

  // Determine category-specific engineering icon
  const getCategoryIcon = () => {
    const cat = categoryName.toLowerCase();
    if (cat.includes('test') || cat.includes('oscilloscope') || cat.includes('analyzer') || cat.includes('power')) {
      return <Activity className="w-6 h-6 text-sky-600" />;
    }
    if (cat.includes('fpga') || cat.includes('embedded') || cat.includes('microcontroller') || cat.includes('processor')) {
      return <Cpu className="w-6 h-6 text-[#4F46E5]" />;
    }
    if (cat.includes('soldering') || cat.includes('tool') || cat.includes('prototyping')) {
      return <Wrench className="w-6 h-6 text-amber-600" />;
    }
    if (cat.includes('robot') || cat.includes('sensor') || cat.includes('lidar') || cat.includes('board')) {
      return <CircuitBoard className="w-6 h-6 text-emerald-600" />;
    }
    return <Boxes className="w-6 h-6 text-slate-600" />;
  };

  const showPlaceholder = !src || hasError;

  return (
    <div
      className={`relative overflow-hidden bg-[#F8FAFC] select-none flex items-center justify-center border-b border-slate-200/80 ${className}`}
    >
      {/* If we have a valid src and no error, render the actual image */}
      {src && !hasError && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={`${imgClassName} transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading="lazy"
        />
      )}

      {/* Engineering Precision Placeholder */}
      {showPlaceholder && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-slate-50"
          style={{
            backgroundImage:
              'radial-gradient(circle, #CBD5E1 1px, transparent 1px)',
            backgroundSize: '16px 16px',
          }}
        >
          {/* Subtle Technical CAD Corner Marks */}
          <div className="absolute top-2 left-2 w-2 h-2 border-t-2 border-l-2 border-slate-300" />
          <div className="absolute top-2 right-2 w-2 h-2 border-t-2 border-r-2 border-slate-300" />
          <div className="absolute bottom-2 left-2 w-2 h-2 border-b-2 border-l-2 border-slate-300" />
          <div className="absolute bottom-2 right-2 w-2 h-2 border-b-2 border-r-2 border-slate-300" />

          {/* Centered Engineering Hardware Symbol */}
          <div className="w-12 h-12 rounded-xl bg-white/95 border border-slate-200 shadow-sm flex items-center justify-center mb-2">
            {getCategoryIcon()}
          </div>

          {/* Asset Monospace Tag or Placeholder Notice */}
          <div className="space-y-0.5">
            <div className="font-mono text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              Physical Unit Photo Pending
            </div>
            {categoryName && (
              <div className="text-[11px] font-medium text-slate-700 truncate max-w-[200px]">
                {categoryName}
              </div>
            )}
          </div>

          {/* Asset Tag Code Pill */}
          {showBadge && inventoryCode && (
            <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 bg-white/90 border border-slate-200 rounded font-mono text-[10px] font-medium text-slate-600 shadow-xs">
              {inventoryCode}
            </div>
          )}
        </div>
      )}

      {/* Subtle Loading Pulse when image is fetching */}
      {src && !isLoaded && !hasError && (
        <div className="absolute inset-0 bg-slate-100 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 rounded-lg bg-slate-200" />
        </div>
      )}
    </div>
  );
};

export default HardwareImage;
