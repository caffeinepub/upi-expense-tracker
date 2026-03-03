import { ReactNode } from 'react';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: ReactNode;
  accent?: boolean;
  className?: string;
}

export default function MetricCard({ title, value, subtitle, icon, accent, className = '' }: MetricCardProps) {
  return (
    <div
      className={`bg-surface border border-border rounded-xl p-5 flex flex-col gap-3 shadow-card ${
        accent ? 'border-mint/30 bg-mint/5' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        {icon && (
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accent ? 'bg-mint/15' : 'bg-surface-elevated'}`}>
            {icon}
          </div>
        )}
      </div>
      <div>
        <p className={`text-2xl font-bold tabular-nums tracking-tight ${accent ? 'text-mint' : 'text-foreground'}`}>
          {value}
        </p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}
