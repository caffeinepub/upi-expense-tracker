import { ChevronLeft, ChevronRight } from "lucide-react";

interface MonthSelectorProps {
  year: number;
  month: number; // 0-indexed
  onChange: (year: number, month: number) => void;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function MonthSelector({
  year,
  month,
  onChange,
}: MonthSelectorProps) {
  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  const handlePrev = () => {
    if (month === 0) {
      onChange(year - 1, 11);
    } else {
      onChange(year, month - 1);
    }
  };

  const handleNext = () => {
    if (isCurrentMonth) return;
    if (month === 11) {
      onChange(year + 1, 0);
    } else {
      onChange(year, month + 1);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handlePrev}
        className="w-8 h-8 rounded-lg bg-surface-elevated border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-mint/50 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-base font-semibold text-foreground min-w-[140px] text-center">
        {MONTH_NAMES[month]} {year}
      </span>
      <button
        type="button"
        onClick={handleNext}
        disabled={isCurrentMonth}
        className="w-8 h-8 rounded-lg bg-surface-elevated border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-mint/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
