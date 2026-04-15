import { useLocation, useNavigate } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { useState } from "react";
import {
  LayoutDashboard,
  BookOpen,
  Truck,
  Users,
  BookText,
  BarChart3,
  Settings,
  LogOut,
  CalendarCheck,
  UserCircle,
  ShoppingCart,
  CreditCard,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Hammer,
  HelpCircle,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { authApi } from "@/api/auth.api";
import { Button } from "@/components/ui/button";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Daily Entry", url: "/daily-entry", icon: BookOpen, highlight: true },
  { title: "Reports", url: "/reports", icon: BarChart3 },
];

const clientLoungeItems = [
  { title: "Client Management", url: "/client-management", icon: UserCircle },
  { title: "Client Ledger", url: "/client-ledger", icon: CreditCard },
  { title: "Client History", url: "/client-history", icon: Truck },
];

const navItemsAfter = [
  { title: "Cash Book", url: "/cash-book", icon: BookText },
  { title: "Attendance", url: "/attendance", icon: CalendarCheck },
  { title: "Mason Ledger", url: "/mason-ledger", icon: Hammer },
  { title: "App Guide", url: "/app-guide", icon: HelpCircle },
  { title: "Settings", url: "/settings", icon: Settings },
];

const transportItems = [
  { title: "Transport Entry", url: "/transport", icon: ClipboardList },
  { title: "Vehicles & EMI", url: "/transport/vehicles", icon: Truck },
  { title: "Vendors", url: "/transport/vendors", icon: Users },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const [loungeOpen, setLoungeOpen] = useState(
    clientLoungeItems.some((item) => location.pathname === item.url || location.pathname.startsWith("/client-management"))
  );
  const [transportOpen, setTransportOpen] = useState(
    transportItems.some((item) => location.pathname === item.url || location.pathname.startsWith(item.url + "/")) ||
    location.pathname === "/tipper-ledger"
  );

  const handleLogout = () => {
    authApi.logout();
    navigate("/login");
  };

  const renderNavItem = (item: any) => {
    const isActive = location.pathname === item.url;
    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton asChild className="h-11 mb-0.5">
          <NavLink
            to={item.url}
            end
            className="rounded-xl transition-all duration-200 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
          >
            <item.icon className="h-5 w-5 mr-3 shrink-0" />
            {!collapsed && (
              <span className="text-sm flex items-center gap-2">
                {item.title}
                {item.highlight && !isActive && (
                  <span className="h-1.5 w-1.5 rounded-full bg-sidebar-primary inline-block" />
                )}
              </span>
            )}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="p-4 border-b border-sidebar-border/50">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="RD Interlock" className="h-10 w-10 shrink-0 object-contain" />
          {!collapsed && (
            <div>
              <p className="font-bold text-sidebar-foreground text-sm leading-tight">RD Interlock</p>
              <p className="text-xs text-sidebar-foreground/50">Factory Operations</p>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="pt-3 px-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(renderNavItem)}

              {/* Client Lounge Collapsible */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setLoungeOpen(!loungeOpen)}
                  className="h-11 mb-0.5 rounded-xl transition-all duration-200 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 cursor-pointer"
                >
                  <Users className="h-5 w-5 mr-3 shrink-0" />
                  {!collapsed && (
                    <span className="text-sm flex-1 flex items-center justify-between">
                      Client Lounge
                      {loungeOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    </span>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>

              {loungeOpen && !collapsed && (
                <div className="ml-4 border-l-2 border-sidebar-border/30 pl-2 space-y-0.5">
                  {clientLoungeItems.map((item) => {
                    const isActive = location.pathname === item.url || location.pathname.startsWith(item.url + "/");
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild className="h-9 mb-0">
                          <NavLink
                            to={item.url}
                            end
                            className="rounded-lg transition-all duration-200 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/40"
                            activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                          >
                            <item.icon className="h-4 w-4 mr-2.5 shrink-0" />
                            <span className="text-xs">{item.title}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </div>
              )}

              {navItemsAfter.map(renderNavItem)}

              {/* Transport Section Collapsible */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setTransportOpen(!transportOpen)}
                  className="h-11 mb-0.5 rounded-xl transition-all duration-200 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 cursor-pointer"
                >
                  <Truck className="h-5 w-5 mr-3 shrink-0" />
                  {!collapsed && (
                    <span className="text-sm flex-1 flex items-center justify-between">
                      Transport
                      {transportOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    </span>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>

              {transportOpen && !collapsed && (
                <div className="ml-4 border-l-2 border-sidebar-border/30 pl-2 space-y-0.5">
                  {transportItems.map((item) => {
                    const isActive = location.pathname === item.url;
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild className="h-9 mb-0">
                          <NavLink
                            to={item.url}
                            end
                            className="rounded-lg transition-all duration-200 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/40"
                            activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                          >
                            <item.icon className="h-4 w-4 mr-2.5 shrink-0" />
                            <span className="text-xs">{item.title}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </div>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-2 border-t border-sidebar-border/50">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start h-11 rounded-xl text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
        >
          <LogOut className="h-5 w-5 mr-3 shrink-0" />
          {!collapsed && <span className="text-sm">Logout</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

