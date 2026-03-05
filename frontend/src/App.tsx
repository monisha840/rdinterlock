import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import DailyEntry from "./pages/DailyEntry";
import DispatchPage from "./pages/DispatchPage";
import StockPage from "./pages/StockPage";
import WorkersPage from "./pages/WorkersPage";
import ExpensesPage from "./pages/ExpensesPage";
import CashBookPage from "./pages/CashBookPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import LoginPage from "./pages/LoginPage";
import AttendancePage from "./pages/AttendancePage";
import ClientsPage from "./pages/ClientsPage";
import ClientProfilePage from "./pages/ClientProfilePage";
import ClientOrdersPage from "./pages/ClientOrdersPage";
import DispatchSchedulingPage from "./pages/DispatchSchedulingPage";
import ClientLedgerPage from "./pages/ClientLedgerPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/daily-entry"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <DailyEntry />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dispatch"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <DispatchPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/clients"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <ClientsPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/clients/:id"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <ClientProfilePage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/client-orders"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <ClientOrdersPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dispatch-scheduling"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <DispatchSchedulingPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/client-ledger"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <ClientLedgerPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/stock"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <StockPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/expenses"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <ExpensesPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/workers"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <WorkersPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/cash-book"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <CashBookPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <ReportsPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <SettingsPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/attendance"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <AttendancePage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

