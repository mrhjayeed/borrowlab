import React, { HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevation?: 'level-1' | 'level-2' | 'level-3';
}

export const Card: React.FC<CardProps> = ({
  children,
  elevation = 'level-1',
  className = '',
  ...props
}) => {
  const elevationStyles = {
    'level-1': 'shadow-level-1 border-slate-200',
    'level-2': 'shadow-level-2 border-slate-200',
    'level-3': 'shadow-level-3 border-slate-300',
  }[elevation];

  return (
    <div
      className={`bg-white rounded-[6px] border ${elevationStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
