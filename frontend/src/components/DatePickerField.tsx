import { useState } from "react";
import { format, isToday, isBefore, startOfDay } from "date-fns";
import { CalendarIcon, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DatePickerFieldProps {
  date: Date;
  onDateChange: (date: Date) => void;
  label?: string;
}

export function DatePickerField({ date, onDateChange, label = "Entry Date" }: DatePickerFieldProps) {
  const isBackdated = isBefore(startOfDay(date), startOfDay(new Date()));

  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest ml-1">{label}</label>
      <div className="mt-1">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full h-12 justify-start text-left font-bold rounded-xl border-border bg-background shadow-sm hover:bg-secondary/50 overflow-hidden",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-primary/60 shrink-0" />
              {date ? (
                <span className="text-[12px] sm:text-sm font-black text-foreground truncate">{format(date, "dd MMM yyyy")}</span>
              ) : (
                <span className="text-sm text-muted-foreground">Pick a date</span>
              )}
            </Button>
          </PopoverTrigger>
        <PopoverContent className="w-auto p-0 rounded-xl z-50" align="start" sideOffset={4}>
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => d && onDateChange(d)}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
      </div>
      {isBackdated && (
        <div className="flex items-center gap-1.5 text-warning text-xs font-medium bg-warning/8 px-3 py-1.5 rounded-lg">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>Backdated Entry</span>
        </div>
      )}
    </div>
  );
}
