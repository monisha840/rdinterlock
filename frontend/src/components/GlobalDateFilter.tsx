import React from "react";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

export type DateRange = {
  from: Date;
  to: Date;
  label: string;
};

interface GlobalDateFilterProps {
  onRangeChange: (range: DateRange) => void;
  currentLabel: string;
}

export const GlobalDateFilter: React.FC<GlobalDateFilterProps> = ({ onRangeChange, currentLabel }) => {
  const options = ["Today", "This Week", "This Month", "Custom"];

  const handleSelect = (option: string) => {
    const now = new Date();
    let from = now;
    let to = now;

    if (option === "Today") {
      from = now;
      to = now;
    } else if (option === "This Week") {
      from = startOfWeek(now, { weekStartsOn: 1 });
      to = endOfWeek(now, { weekStartsOn: 1 });
    } else if (option === "This Month") {
      from = startOfMonth(now);
      to = endOfMonth(now);
    } else if (option === "Custom") {
      // For custom, let the parent handle the picker visibility
      onRangeChange({ from, to, label: "Custom" });
      return;
    }

    onRangeChange({ from, to, label: option });
  };

  return (
    <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => handleSelect(opt)}
          className={`h-10 px-5 rounded-full text-sm font-semibold transition-all active:scale-95 touch-target whitespace-nowrap ${
            currentLabel === opt
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-secondary/70 text-secondary-foreground hover:bg-secondary"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
};
