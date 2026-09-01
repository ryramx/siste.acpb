import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className
}) => {
  const base = 'inline-flex items-center font-medium rounded-full';
  
  const variants = {
    success: 'bg-[#004922]/30 text-[#40C075] border border-[#004922]',
    warning: 'bg-[#F8D800]/10 text-[#F8D800] border border-[#F8D800]/30',
    danger: 'bg-red-900/30 text-red-400 border border-red-800',
    info: 'bg-blue-900/30 text-blue-400 border border-blue-800',
    neutral: 'bg-[#222824] text-[#AEB5B0] border border-[#222824]'
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs'
  };

  return (
    <span className={twMerge(clsx(base, variants[variant], sizes[size], className))}>
      {children}
    </span>
  );
};
