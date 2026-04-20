import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

export type SearchableOption = {
  value: string;
  label: string;
  sublabel?: string;
  disabled?: boolean;
};

type SearchableSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  allowClear?: boolean;
  emptyText?: string;
};

export const SearchableSelect = ({
  value,
  onChange,
  options,
  placeholder = "Select...",
  className = "",
  disabled = false,
  allowClear = false,
  emptyText = "No matches found",
}: SearchableSelectProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.sublabel ? o.sublabel.toLowerCase().includes(q) : false),
    );
  }, [options, query]);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`w-full h-10 px-3 pr-9 bg-secondary/50 border border-border rounded-xl text-sm text-left flex items-center justify-between focus:border-primary focus:outline-none transition-colors ${disabled ? "opacity-60 cursor-not-allowed" : "hover:border-primary/50"}`}
      >
        <span className={`truncate ${selected ? "text-foreground" : "text-muted-foreground"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {allowClear && selected && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onChange(""); }}
              className="p-0.5 rounded hover:bg-background/60 text-muted-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-background">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <ul className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-muted-foreground">{emptyText}</li>
            ) : (
              filtered.map((o) => {
                const isActive = o.value === value;
                return (
                  <li key={o.value}>
                    <button
                      type="button"
                      disabled={o.disabled}
                      onClick={() => {
                        if (o.disabled) return;
                        onChange(o.value);
                        setOpen(false);
                        setQuery("");
                      }}
                      className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between transition-colors ${
                        o.disabled
                          ? "opacity-50 cursor-not-allowed"
                          : isActive
                            ? "bg-primary/10 text-primary font-semibold"
                            : "hover:bg-secondary/70 text-foreground"
                      }`}
                    >
                      <span className="flex flex-col min-w-0">
                        <span className="truncate">{o.label}</span>
                        {o.sublabel && (
                          <span className="text-[10px] text-muted-foreground truncate">{o.sublabel}</span>
                        )}
                      </span>
                      {isActive && <Check className="h-4 w-4 text-primary shrink-0" />}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
};
