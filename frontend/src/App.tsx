import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import DailyEntry from "./pages/DailyEntry";
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
import ClientManagementPage from "./pages/ClientManagementPage";
import DispatchSchedulingPage from "./pages/DispatchSchedulingPage";
import ClientHistoryPage from "./pages/ClientHistoryPage";
import ClientLedgerPage from "./pages/ClientLedgerPage";
import NotFound from "./pages/NotFound";
import TransportEntryPage from "./pages/TransportEntryPage";
import VehiclesPage from "./pages/VehiclesPage";
import VendorsPage from "./pages/VendorsPage";
import TransportReportsPage from "./pages/TransportReportsPage";
import MasonLedgerPage from "./pages/MasonLedgerPage";
import TipperLedgerPage from "./pages/TipperLedgerPage";

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
            path="/dashboard"
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
            path="/client-management"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <ClientManagementPage />
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
            path="/client-history"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <ClientHistoryPage />
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
          <Route
            path="/transport"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <TransportEntryPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/transport/vehicles"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <VehiclesPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/transport/vendors"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <VendorsPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/transport/reports"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <TransportReportsPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/mason-ledger"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <MasonLedgerPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tipper-ledger"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <TipperLedgerPage />
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

