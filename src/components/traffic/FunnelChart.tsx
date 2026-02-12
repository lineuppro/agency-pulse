import { cn } from '@/lib/utils';

interface FunnelStep {
  label: string;
  value: number;
  formattedValue: string;
  color: string;
}

interface FunnelChartProps {
  steps: FunnelStep[];
  className?: string;
}

const formatRate = (current: number, previous: number) => {
  if (previous === 0) return '—';
  return `${((current / previous) * 100).toFixed(1)}%`;
};

export function FunnelChart({ steps, className }: FunnelChartProps) {
  const maxValue = Math.max(...steps.map(s => s.value), 1);

  return (
    <div className={cn('space-y-0', className)}>
      {steps.map((step, i) => {
        const widthPercent = Math.max(20, (step.value / maxValue) * 100);
        const rate = i > 0 ? formatRate(step.value, steps[i - 1].value) : null;

        return (
          <div key={step.label} className="relative">
            {/* Conversion rate between steps */}
            {rate && (
              <div className="flex items-center justify-center py-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                    <path d="M6 2v8M3 7l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="font-medium">{rate}</span>
                </div>
              </div>
            )}

            {/* Funnel bar */}
            <div className="flex items-center justify-center">
              <div
                className="relative rounded-lg py-3 px-4 text-center transition-all duration-500 ease-out"
                style={{
                  width: `${widthPercent}%`,
                  background: step.color,
                  minWidth: '120px',
                }}
              >
                <p className="text-white font-bold text-lg leading-tight">{step.formattedValue}</p>
                <p className="text-white/80 text-xs font-medium uppercase tracking-wider">{step.label}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
