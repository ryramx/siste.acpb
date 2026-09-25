import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <div
      className={twMerge(clsx('animate-pulse rounded-xl bg-surface-border', className))}
      {...props}
    />
  );
};

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="w-full bg-surface-card border border-surface-border rounded-xl overflow-hidden animate-pulse">
      <div className="h-12 bg-surface-bg border-b border-surface-border" />
      <div className="divide-y divide-surface-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex items-center justify-between gap-4">
            <div className="h-4 bg-surface-border rounded w-1/4" />
            <div className="h-4 bg-surface-border rounded w-1/4" />
            <div className="h-4 bg-surface-border rounded w-1/6" />
            <div className="h-6 bg-surface-border rounded-full w-16" />
          </div>
        ))}
      </div>
    </div>
  );
};
