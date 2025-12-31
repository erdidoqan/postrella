import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  className,
}: StatsCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-sm transition-all hover:border-zinc-700 hover:bg-zinc-900',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-zinc-400">{title}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
          {description && (
            <p className="text-xs text-zinc-500">{description}</p>
          )}
          {trend && (
            <p
              className={cn(
                'text-xs font-medium',
                trend.isPositive ? 'text-emerald-400' : 'text-red-400'
              )}
            >
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%{' '}
              <span className="text-zinc-500">from yesterday</span>
            </p>
          )}
        </div>
        <div className="rounded-lg bg-violet-600/20 p-3">
          <Icon className="h-6 w-6 text-violet-400" />
        </div>
      </div>
    </div>
  );
}

