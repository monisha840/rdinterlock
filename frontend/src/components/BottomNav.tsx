import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  Truck,
  Package,
  Wallet,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { useState } from "react";
import { Users, BookText, BarChart3, Settings, CalendarCheck } from "lucide-react";

const bottomNavItems = [
  { title: "Home", url: "/", icon: LayoutDashboard },
  { title: "Entry", url: "/daily-entry", icon: BookOpen },
  { title: "Dispatch", url: "/dispatch", icon: Truck },
  { title: "Stock", url: "/stock", icon: Package },
  { title: "Cash", url: "/cash-book", icon: Wallet },
];

const moreNavItems = [
  { title: "Attendance", url: "/attendance", icon: CalendarCheck },
  { title: "Expenses", url: "/expenses", icon: Wallet },
  { title: "Workers", url: "/workers", icon: Users },
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (url: string) => location.pathname === url;
  const isMoreActive = moreNavItems.some((i) => isActive(i.url));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden glass-effect border-t border-border/50 safe-area-bottom">
      <div className="flex items-center justify-around px-1 h-16">
        {bottomNavItems.map((item) => (
          <button
            key={item.url}
            onClick={() => navigate(item.url)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 w-16 h-14 rounded-xl transition-colors",
              isActive(item.url)
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            <item.icon className={cn("h-5 w-5", isActive(item.url) && "text-primary")} />
            <span className="text-[10px] font-medium">{item.title}</span>
            {isActive(item.url) && (
              <div className="absolute top-0 w-8 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}

        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 w-16 h-14 rounded-xl transition-colors",
                isMoreActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Menu className="h-5 w-5" />
              <span className="text-[10px] font-medium">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-3xl pb-8">
            <SheetTitle className="text-lg font-bold mb-4">More</SheetTitle>
            <div className="grid grid-cols-4 gap-4">
              {moreNavItems.map((item) => (
                <button
                  key={item.url}
                  onClick={() => {
                    navigate(item.url);
                    setMoreOpen(false);
                  }}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-2xl transition-colors",
                    isActive(item.url) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary"
                  )}
                >
                  <div className={cn(
                    "h-12 w-12 rounded-xl flex items-center justify-center",
                    isActive(item.url) ? "bg-primary/10" : "bg-secondary"
                  )}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-medium">{item.title}</span>
                </button>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
