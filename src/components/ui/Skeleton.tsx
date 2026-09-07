import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <div
      className={twMerge(clsx('animate-pulse rounded-xl bg-[#222824]', className))}
      {...props}
    />
  );
};

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="w-full bg-[#181D1A] border border-[#222824] rounded-xl overflow-hidden animate-pulse">
      <div className="h-12 bg-[#0F1210] border-b border-[#222824]" />
      <div className="divide-y divide-[#222824]">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex items-center justify-between gap-4">
            <div className="h-4 bg-[#222824] rounded w-1/4" />
            <div className="h-4 bg-[#222824] rounded w-1/4" />
            <div className="h-4 bg-[#222824] rounded w-1/6" />
            <div className="h-6 bg-[#222824] rounded-full w-16" />
          </div>
        ))}
      </div>
    </div>
  );
};
