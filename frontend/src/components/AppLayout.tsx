import { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { LogOut, RefreshCw, ArrowLeft } from "lucide-react";
import { authApi } from "@/api/auth.api";

export function AppLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isDashboard = location.pathname === "/" || location.pathname === "/dashboard";

  const handleLogout = () => {
    authApi.logout();
    navigate("/login");
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/dashboard");
    }
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
              {!isDashboard && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBack}
                  className="mr-2 h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-all active:scale-90"
                  title="Go Back"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
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
              {!isDashboard && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBack}
                  className="h-10 w-10 flex items-center justify-center rounded-xl bg-secondary/50 border border-border/30 active:scale-90 transition-all mr-1"
                >
                  <ArrowLeft className="h-6 w-6 text-foreground" />
                </Button>
              )}
              <img src="/favicon.ico" alt="RD Interlock" className="h-8 w-8 text-white filter brightness-100" />
              <span className="font-bold text-foreground text-base tracking-tight">RD Interlock</span>
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
