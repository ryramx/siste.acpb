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
    green: 'border-l-4 border-l-[#004922]',
    yellow: 'border-l-4 border-l-[#F8D800]',
    blue: 'border-l-4 border-l-blue-600',
    neutral: 'border-l-4 border-l-[#222824]'
  };

  return (
    <div className={`bg-[#181D1A] border border-[#222824] rounded-xl p-5 shadow-sm hover:border-[#004922]/40 transition-colors ${accentBorder[accentColor]}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-[#AEB5B0]">{title}</span>
        <div className="p-2.5 bg-[#0F1210] rounded-lg text-[#F8D800] border border-[#222824]">
          {icon}
        </div>
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold text-white tracking-tight font-heading">{value}</div>
        {(subtitle || trend) && (
          <div className="mt-2 flex items-center gap-2 text-xs">
            {trend && (
              <span className={trend.isPositive ? 'text-[#40C075]' : 'text-red-400'}>
                {trend.isPositive ? '↑' : '↓'} {trend.value}
              </span>
            )}
            {subtitle && <span className="text-[#727A74]">{subtitle}</span>}
          </div>
        )}
      </div>
    </div>
  );
};
