import { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { RefreshCw, ArrowLeft } from "lucide-react";

export function AppLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isDashboard = location.pathname === "/" || location.pathname === "/dashboard";

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
          {/* Unified top header — no blur, clean background */}
          <header className="flex h-14 items-center justify-between border-b border-border/50 bg-background px-3 md:px-4 sticky top-0 z-20">
            <div className="flex items-center gap-2">
              {!isDashboard ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBack}
                  className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-all active:scale-90"
                  title="Go Back"
                  aria-label="Go Back"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              ) : (
                <div className="h-10 w-10 md:hidden" />
              )}
              <SidebarTrigger className="hidden md:inline-flex text-muted-foreground hover:text-foreground" />
            </div>

            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.location.reload()}
                className="h-10 w-10 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all active:scale-90"
                title="Refresh Page"
                aria-label="Refresh Page"
              >
                <RefreshCw className="h-5 w-5" />
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
