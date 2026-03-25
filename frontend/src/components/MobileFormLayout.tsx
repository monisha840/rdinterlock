import { ReactNode } from "react";

interface MobileFormLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export function MobileFormLayout({ children, title, subtitle }: MobileFormLayoutProps) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-5 sm:py-8 space-y-5 pb-safe">
      {title && (
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

interface FormFieldProps {
  label: string;
  children: ReactNode;
  required?: boolean;
}

export function FormField({ label, children, required }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest ml-1">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
      <div className="mt-1">
        {children}
      </div>
    </div>
  );
}

export function BigNumberInput({
  value,
  onChange,
  placeholder = "0",
  min,
  max,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  min?: number;
  max?: number;
}) {
  return (
    <input
      type="number"
      inputMode="numeric"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onWheel={(e) => (e.target as HTMLInputElement).blur()}
      placeholder={placeholder}
      min={min}
      max={max}
      className="w-full h-14 text-2xl font-bold text-center bg-secondary/50 border border-border rounded-xl focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
    />
  );
}
