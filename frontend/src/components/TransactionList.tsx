import { Transaction } from '../backend';
import { CATEGORY_COLORS, CATEGORY_ICONS, ExpenseCategory, ALL_CATEGORIES } from '../utils/categorizer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Receipt } from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  selectedCategory: string | null;
  onCategoryFilter: (category: string | null) => void;
}

function formatCurrency(amount: bigint): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

function formatDate(timestamp: bigint): string {
  // timestamp is in nanoseconds
  const ms = Number(timestamp) / 1_000_000;
  const date = new Date(ms);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function TransactionList({ transactions, selectedCategory, onCategoryFilter }: TransactionListProps) {
  const filtered = selectedCategory
    ? transactions.filter((t) => t.category_hint === selectedCategory)
    : transactions;

  const sorted = [...filtered].sort((a, b) => Number(b.timestamp) - Number(a.timestamp));

  // Get categories that have transactions
  const usedCategories = Array.from(new Set(transactions.map((t) => t.category_hint)));

  return (
    <div className="space-y-4">
      {/* Category filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onCategoryFilter(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
            selectedCategory === null
              ? 'bg-mint text-charcoal border-mint'
              : 'bg-surface-elevated border-border text-muted-foreground hover:text-foreground hover:border-mint/50'
          }`}
        >
          All
        </button>
        {usedCategories.map((cat) => {
          const color = CATEGORY_COLORS[cat as ExpenseCategory] || '#d1d5db';
          const icon = CATEGORY_ICONS[cat as ExpenseCategory] || '📦';
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => onCategoryFilter(isActive ? null : cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border flex items-center gap-1.5 ${
                isActive
                  ? 'border-transparent text-charcoal'
                  : 'bg-surface-elevated border-border text-muted-foreground hover:text-foreground hover:border-mint/50'
              }`}
              style={isActive ? { backgroundColor: color } : {}}
            >
              <span>{icon}</span>
              {cat}
            </button>
          );
        })}
      </div>

      {/* Transaction list */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Receipt className="w-10 h-10 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground text-sm">No transactions found</p>
          {selectedCategory && (
            <p className="text-muted-foreground/60 text-xs mt-1">
              Try removing the category filter
            </p>
          )}
        </div>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="space-y-2 pr-3">
            {sorted.map((txn) => {
              const color = CATEGORY_COLORS[txn.category_hint as ExpenseCategory] || '#d1d5db';
              const icon = CATEGORY_ICONS[txn.category_hint as ExpenseCategory] || '📦';
              return (
                <div
                  key={txn.id}
                  className="flex items-center justify-between p-3.5 bg-surface-elevated rounded-xl border border-border hover:border-mint/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-base"
                      style={{ backgroundColor: `${color}20` }}
                    >
                      {icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{txn.merchant}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(txn.timestamp)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    <span
                      className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ backgroundColor: `${color}20`, color }}
                    >
                      {icon} {txn.category_hint}
                    </span>
                    <span className="text-sm font-bold tabular-nums text-foreground">
                      {formatCurrency(txn.amount)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
