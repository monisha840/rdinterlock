import { cn } from "@/lib/utils";

interface PillSelectorProps {
  options: { label: string; value: string }[] | string[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
}

export function PillSelector({ options, value, onChange, className }: PillSelectorProps) {
  return (
    <div className={cn("flex gap-2 flex-wrap", className)}>
      {options.map((opt) => {
        const label = typeof opt === "string" ? opt : opt.label;
        const val = typeof opt === "string" ? opt : opt.value;
        return (
          <button
            key={val}
            type="button"
            onClick={() => onChange(val)}
            className={cn(
              "h-11 px-5 rounded-full text-sm font-semibold transition-all duration-200 active:scale-[0.96] touch-target",
              value === val
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary/70 text-secondary-foreground hover:bg-secondary"
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
