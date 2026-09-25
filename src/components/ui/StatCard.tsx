import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  accentColor?: 'green' | 'yellow' | 'blue' | 'neutral';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  subtitle,
  trend,
  accentColor = 'green'
}) => {
  const accentBorder = {
    green: 'border-l-4 border-l-acpb-green',
    yellow: 'border-l-4 border-l-acpb-yellow',
    blue: 'border-l-4 border-l-blue-600',
    neutral: 'border-l-4 border-l-surface-border'
  };

  return (
    <div className={`bg-surface-card border border-surface-border rounded-xl p-5 shadow-sm hover:border-acpb-green/40 transition-colors ${accentBorder[accentColor]}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-text-secondary">{title}</span>
        <div className="p-2.5 bg-surface-bg rounded-lg text-acpb-yellow border border-surface-border">
          {icon}
        </div>
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold text-white tracking-tight font-heading">{value}</div>
        {(subtitle || trend) && (
          <div className="mt-2 flex items-center gap-2 text-xs">
            {trend && (
              <span className={trend.isPositive ? 'text-valor-positivo' : 'text-red-400'}>
                {trend.isPositive ? '↑' : '↓'} {trend.value}
              </span>
            )}
            {subtitle && <span className="text-text-muted">{subtitle}</span>}
          </div>
        )}
      </div>
    </div>
  );
};
