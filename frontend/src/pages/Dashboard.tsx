import { useState } from 'react';
import { useGetTransactions, useGetMonthlyExpenseSummary } from '../hooks/useQueries';
import MetricCard from '../components/MetricCard';
import CategoryBreakdown from '../components/CategoryBreakdown';
import TransactionList from '../components/TransactionList';
import MonthSelector from '../components/MonthSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingDown, Receipt, Tag, Calendar } from 'lucide-react';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function Dashboard() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const { data: allTransactions = [], isLoading: txLoading } = useGetTransactions();
  const { data: monthlySummary = [], isLoading: summaryLoading } = useGetMonthlyExpenseSummary(selectedYear, selectedMonth);

  // Filter transactions for selected month
  const monthTransactions = allTransactions.filter((txn) => {
    const ms = Number(txn.timestamp) / 1_000_000;
    const d = new Date(ms);
    return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
  });

  const totalAmount = monthlySummary.reduce((sum, s) => sum + Number(s.total_amount), 0);
  const categoryCount = monthlySummary.length;
  const txCount = monthTransactions.length;

  const isLoading = txLoading || summaryLoading;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Monthly Overview</h1>
          <p className="text-muted-foreground text-sm mt-1">Track and analyze your UPI spending</p>
        </div>
        <MonthSelector year={selectedYear} month={selectedMonth} onChange={(y, m) => { setSelectedYear(y); setSelectedMonth(m); setCategoryFilter(null); }} />
      </div>

      {/* Metric cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl bg-surface-elevated" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard
            title="Total Spent"
            value={formatCurrency(totalAmount)}
            subtitle="This month"
            icon={<TrendingDown className="w-4 h-4 text-mint" />}
            accent
          />
          <MetricCard
            title="Transactions"
            value={txCount.toString()}
            subtitle="This month"
            icon={<Receipt className="w-4 h-4 text-muted-foreground" />}
          />
          <MetricCard
            title="Categories"
            value={categoryCount.toString()}
            subtitle="Active this month"
            icon={<Tag className="w-4 h-4 text-muted-foreground" />}
          />
        </div>
      )}

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Category breakdown */}
        <Card className="lg:col-span-2 bg-surface border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <Tag className="w-4 h-4 text-mint" />
              Category Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-10 rounded-lg bg-surface-elevated" />
                ))}
              </div>
            ) : (
              <CategoryBreakdown summaries={monthlySummary} totalAmount={totalAmount} />
            )}
          </CardContent>
        </Card>

        {/* Transaction list */}
        <Card className="lg:col-span-3 bg-surface border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <Receipt className="w-4 h-4 text-mint" />
              Transactions
              {categoryFilter && (
                <span className="ml-auto text-xs font-normal text-muted-foreground">
                  Filtered by: {categoryFilter}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {txLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-14 rounded-xl bg-surface-elevated" />
                ))}
              </div>
            ) : (
              <TransactionList
                transactions={monthTransactions}
                selectedCategory={categoryFilter}
                onCategoryFilter={setCategoryFilter}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Empty state */}
      {!isLoading && allTransactions.length === 0 && (
        <div className="text-center py-16 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-surface-elevated border border-border flex items-center justify-center mx-auto">
            <Calendar className="w-7 h-7 text-muted-foreground" />
          </div>
          <div>
            <p className="text-foreground font-semibold">No transactions yet</p>
            <p className="text-muted-foreground text-sm mt-1">
              Import your UPI transaction history to get started
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
