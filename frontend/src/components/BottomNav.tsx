import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  Package,
  BookText,
  Menu,
  Users,
  UserCircle,
  CreditCard,
  Truck,
  CalendarCheck,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { useState } from "react";
import { authApi } from "@/api/auth.api";
import { Button } from "@/components/ui/button";

const bottomNavItems = [
  { title: "Home", url: "/", icon: LayoutDashboard },
  { title: "Entry", url: "/daily-entry", icon: BookOpen },
  { title: "Stock", url: "/stock", icon: Package },
  { title: "Cash", url: "/cash-book", icon: BookText },
];

const clientLoungeItems = [
  { title: "Client Management", url: "/client-management", icon: UserCircle },
  { title: "Client Ledger", url: "/client-ledger", icon: CreditCard },
  { title: "Client History", url: "/client-history", icon: Truck },
];

const moreNavItems = [
  { title: "Attendance", url: "/attendance", icon: CalendarCheck },
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (url: string) => {
    if (url === "/") return location.pathname === "/";
    return location.pathname.startsWith(url);
  };

  const isMoreActive = [...clientLoungeItems, ...moreNavItems].some((i) => isActive(i.url));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden glass-effect border-t border-border/50 safe-area-bottom">
      <div className="flex items-center justify-around px-1 h-16">
        {bottomNavItems.map((item) => (
          <button
            key={item.url}
            onClick={() => navigate(item.url)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 w-16 h-14 rounded-xl transition-colors relative",
              isActive(item.url)
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            <item.icon className={cn("h-5 w-5", isActive(item.url) && "text-primary")} />
            <span className="text-[10px] font-medium">{item.title}</span>
            {isActive(item.url) && (
              <div className="absolute top-0 w-8 h-0.5 bg-primary rounded-full transition-all duration-300" />
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
          <SheetContent side="bottom" className="rounded-t-3xl pb-8 max-h-[85vh] overflow-y-auto">
            <SheetTitle className="text-xl font-bold mb-6 px-2">Navigation Menu</SheetTitle>
            
            <div className="space-y-6">
              {/* Client Lounge Section */}
              <div className="px-2">
                <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  <Users className="h-4 w-4" />
                  <span>Client Lounge</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {clientLoungeItems.map((item) => (
                    <button
                      key={item.url}
                      onClick={() => {
                        navigate(item.url);
                        setMoreOpen(false);
                      }}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-2xl transition-all duration-200 border border-transparent",
                        isActive(item.url) 
                          ? "bg-primary/10 text-primary border-primary/20 shadow-sm" 
                          : "text-muted-foreground hover:bg-secondary/50"
                      )}
                    >
                      <div className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center",
                        isActive(item.url) ? "bg-primary/20" : "bg-secondary"
                      )}>
                        <item.icon className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] font-medium text-center leading-tight">{item.title}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Other Items Section */}
              <div className="px-2">
                <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  <span>General</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {moreNavItems.map((item) => (
                    <button
                      key={item.url}
                      onClick={() => {
                        navigate(item.url);
                        setMoreOpen(false);
                      }}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-2xl transition-all duration-200 border border-transparent",
                        isActive(item.url) 
                          ? "bg-primary/10 text-primary border-primary/20 shadow-sm" 
                          : "text-muted-foreground hover:bg-secondary/50"
                      )}
                    >
                      <div className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center",
                        isActive(item.url) ? "bg-primary/20" : "bg-secondary"
                      )}>
                        <item.icon className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] font-medium text-center leading-tight">{item.title}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Logout Section */}
              <div className="pt-4 border-t border-border/50 px-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    authApi.logout();
                    navigate("/login");
                    setMoreOpen(false);
                  }}
                  className="w-full justify-start h-12 rounded-2xl text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-5 w-5 mr-3" />
                  <span className="font-semibold">Logout</span>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
