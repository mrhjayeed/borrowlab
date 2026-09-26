import React, { useState, useEffect, useRef } from 'react';
import { Cpu, Activity, CircuitBoard, Wrench, Boxes, Image as ImageIcon } from 'lucide-react';

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
  loading?: 'lazy' | 'eager';
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
  loading = 'eager',
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const resolvedSrc = src?.startsWith('/uploads')
    ? (import.meta.env.VITE_API_BASE
        ? `${import.meta.env.VITE_API_BASE.replace(/\/api\/?$/, '')}${src}`
        : src)
    : src;

  // Reset state if resolvedSrc changes and check if already complete in cache
  useEffect(() => {
    setHasError(false);
    if (imgRef.current && imgRef.current.complete) {
      if (imgRef.current.naturalWidth > 0) {
        setIsLoaded(true);
        return;
      }
    }
    setIsLoaded(false);
  }, [resolvedSrc]);

  // Callback ref to instantly detect cached / completed images on mount during SPA routing
  const handleImageRef = (node: HTMLImageElement | null) => {
    imgRef.current = node;
    if (node && node.complete) {
      if (node.naturalWidth > 0) {
        setIsLoaded(true);
      } else if (node.naturalWidth === 0 && node.src) {
        setHasError(true);
      }
    }
  };

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

  const showPlaceholder = !resolvedSrc || hasError;

  return (
    <div
      className={`relative overflow-hidden bg-[#F8FAFC] select-none flex items-center justify-center border-b border-slate-200/80 ${className}`}
    >
      {/* If we have a valid src and no error, render the actual image */}
      {resolvedSrc && !hasError && (
        <>
          {!isLoaded && (
            <div className="absolute inset-0 bg-slate-100 flex items-center justify-center animate-pulse z-1">
              <ImageIcon className="w-6 h-6 text-slate-300" />
            </div>
          )}
          <img
            ref={handleImageRef}
            src={resolvedSrc}
            alt={alt}
            decoding="async"
            loading={loading}
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
            className={`${imgClassName} transition-opacity duration-200 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </>
      )}

      {/* Clean Modern Hardware Placeholder */}
      {showPlaceholder && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-gradient-to-b from-slate-50/80 via-slate-100/60 to-slate-100">
          {/* Subtle Ambient Pattern */}
          <div
            className="absolute inset-0 opacity-[0.4] pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, #94A3B8 0.75px, transparent 0.75px)',
              backgroundSize: '20px 20px',
            }}
          />

          {/* Centered Engineering Hardware Symbol */}
          <div className="relative w-12 h-12 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex items-center justify-center mb-2.5 transition-transform duration-200 group-hover:scale-105">
            {getCategoryIcon()}
          </div>

          {/* Asset Category & Tag */}
          <div className="relative space-y-0.5">
            <div className="text-xs font-semibold text-slate-800 tracking-tight truncate max-w-[210px]">
              {categoryName || 'Laboratory Equipment'}
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              Verified Hardware Unit
            </div>
          </div>

          {/* Inventory Code Pill */}
          {showBadge && inventoryCode && (
            <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-md font-mono text-[10px] font-medium text-slate-600 shadow-xs">
              {inventoryCode}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HardwareImage;
