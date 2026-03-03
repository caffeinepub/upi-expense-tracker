import { useEffect, useState } from "react";

interface AnimatedProgressBarProps {
  percentage: number;
  color?: string;
  height?: number;
  className?: string;
}

export default function AnimatedProgressBar({
  percentage,
  color = "#6ee7b7",
  height = 6,
  className = "",
}: AnimatedProgressBarProps) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setWidth(Math.min(100, Math.max(0, percentage)));
    }, 100);
    return () => clearTimeout(timer);
  }, [percentage]);

  return (
    <div
      className={`w-full rounded-full overflow-hidden bg-surface-elevated ${className}`}
      style={{ height: `${height}px` }}
    >
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{ width: `${width}%`, backgroundColor: color }}
      />
    </div>
  );
}
