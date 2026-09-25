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
    success: 'bg-acpb-green/30 text-valor-positivo border border-acpb-green',
    warning: 'bg-acpb-yellow/10 text-acpb-yellow border border-acpb-yellow/30',
    danger: 'bg-red-900/30 text-red-400 border border-red-800',
    info: 'bg-blue-900/30 text-blue-400 border border-blue-800',
    neutral: 'bg-surface-border text-text-secondary border border-surface-border'
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
