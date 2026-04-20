import { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { BottomNav } from "@/components/BottomNav";
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
        <div className="flex-1 flex flex-col min-w-0 relative">
          {/* No header bar. Back and Refresh are independent floating controls. */}

          {/* Floating Back — top-left, only on non-dashboard pages */}
          {!isDashboard && (
            <button
              type="button"
              onClick={handleBack}
              aria-label="Go Back"
              title="Go Back"
              className="fixed top-3 left-3 md:top-4 md:left-[calc(var(--sidebar-width,0px)+1rem)] z-40 h-10 w-10 rounded-full bg-card border border-border shadow-md flex items-center justify-center text-foreground hover:text-primary hover:border-primary/40 hover:shadow-lg active:scale-90 transition-all"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}

          {/* Floating Refresh — top-right, always visible */}
          <button
            type="button"
            onClick={() => window.location.reload()}
            aria-label="Refresh Page"
            title="Refresh Page"
            className="fixed top-3 right-3 md:top-4 md:right-4 z-40 h-10 w-10 rounded-full bg-card border border-border shadow-md flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 hover:shadow-lg active:scale-90 transition-all"
          >
            <RefreshCw className="h-5 w-5" />
          </button>

          {/* pt-14 leaves clearance for the fixed top Back / Refresh buttons */}
          <main className="flex-1 overflow-auto pt-14">
            {children}
          </main>
        </div>

        {/* Mobile bottom nav */}
        <BottomNav />
      </div>
    </SidebarProvider>
  );
}
