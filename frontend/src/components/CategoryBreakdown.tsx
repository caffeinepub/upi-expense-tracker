import { MonthlySummary } from '../backend';
import { CATEGORY_COLORS, CATEGORY_ICONS, ExpenseCategory } from '../utils/categorizer';
import AnimatedProgressBar from './AnimatedProgressBar';

interface CategoryBreakdownProps {
  summaries: MonthlySummary[];
  totalAmount: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function CategoryBreakdown({ summaries, totalAmount }: CategoryBreakdownProps) {
  const sorted = [...summaries].sort((a, b) => Number(b.total_amount) - Number(a.total_amount));

  if (sorted.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No expense data for this month.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sorted.map((item) => {
        const amount = Number(item.total_amount);
        const percentage = totalAmount > 0 ? (amount / totalAmount) * 100 : 0;
        const category = item.category as ExpenseCategory;
        const color = CATEGORY_COLORS[category] || CATEGORY_COLORS['Other'];
        const icon = CATEGORY_ICONS[category] || '📦';

        return (
          <div key={item.category} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">{icon}</span>
                <span className="text-sm font-medium text-foreground">{item.category}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground tabular-nums">
                  {percentage.toFixed(1)}%
                </span>
                <span className="text-sm font-semibold tabular-nums text-foreground">
                  {formatCurrency(amount)}
                </span>
              </div>
            </div>
            <AnimatedProgressBar percentage={percentage} color={color} height={6} />
          </div>
        );
      })}
    </div>
  );
}
