import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { LogOut, RefreshCw } from "lucide-react";
import { authApi } from "@/api/auth.api";

export function AppLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    authApi.logout();
    navigate("/login");
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {/* Desktop sidebar - hidden on mobile */}
        <div className="hidden md:block">
          <AppSidebar />
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          {/* Desktop header */}
          <header className="hidden md:flex h-14 items-center justify-between border-b border-border/50 bg-card/50 backdrop-blur-sm px-4 sticky top-0 z-10">
            <div className="flex items-center">
              <SidebarTrigger className="mr-3 text-muted-foreground hover:text-foreground" />
              <div className="flex items-center gap-2">
                <img src="/favicon.ico" alt="RD Interlock" className="h-7 w-7 md:hidden" />
                <span className="font-semibold text-foreground text-sm">RD Interlock</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.reload()}
                className="text-muted-foreground hover:text-primary transition-colors"
                title="Refresh Page"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </header>

          {/* Mobile header */}
          <header className="md:hidden flex h-14 items-center justify-between px-4 sticky top-0 z-10 glass-effect border-b border-border/30">
            <div className="flex items-center gap-2.5">
              <img src="/favicon.ico" alt="RD Interlock" className="h-8 w-8" />
              <span className="font-bold text-foreground text-base">RD Interlock</span>
            </div>
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.location.reload()}
                className="text-muted-foreground hover:text-primary transition-colors h-8 w-8"
                title="Refresh Page"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="text-muted-foreground hover:text-foreground h-8 w-8"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>

          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>

        {/* Mobile bottom nav */}
        <BottomNav />
      </div>
    </SidebarProvider>
  );
}
