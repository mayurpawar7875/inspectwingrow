import React, { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, ProtectedRoute } from "./lib/auth";
import { AdminLayout } from "./components/AdminLayout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LanguageProvider } from "./contexts/LanguageContext";
import { RouteOverlayRecovery } from "./components/RouteOverlayRecovery";

// Lazy load non-critical UI components
const UpdateBanner = lazy(() => import("./components/UpdateBanner").then(m => ({ default: m.UpdateBanner })));
const WhatsNewDialog = lazy(() => import("./components/WhatsNewDialog").then(m => ({ default: m.WhatsNewDialog })));

// Eager load only the landing page
import Index from "./pages/Index";

// Lazy load all other pages (including Auth & Install for faster initial paint)
const Auth = lazy(() => import("./pages/Auth"));
const Install = lazy(() => import("./pages/Install"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const MarketSelection = lazy(() => import("./pages/MarketSelection"));
const Punch = lazy(() => import("./pages/Punch"));
const Stalls = lazy(() => import("./pages/Stalls"));
const MediaUpload = lazy(() => import("./pages/MediaUpload"));
const Finalize = lazy(() => import("./pages/Finalize"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AllSessions = lazy(() => import("./pages/admin/AllSessions"));
const Users = lazy(() => import("./pages/admin/Users"));
const LiveMarket = lazy(() => import("./pages/admin/LiveMarket"));
const LiveMarkets = lazy(() => import("./pages/admin/LiveMarkets"));
const MarketDetail = lazy(() => import("./pages/admin/MarketDetail"));
const Settings = lazy(() => import("./pages/admin/Settings"));
const LeaveRequests = lazy(() => import("./pages/admin/LeaveRequests"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Collections = lazy(() => import("./pages/admin/Collections"));
const MySessions = lazy(() => import("./pages/MySessions"));
const Notifications = lazy(() => import("./pages/Notifications"));
const MarketManagerDashboard = lazy(() => import("./pages/MarketManagerDashboard"));
const MyManagerSessions = lazy(() => import("./pages/MyManagerSessions"));
const MMSession = lazy(() => import("./pages/BDOSession")); // Reused component for Market Managers
const EmployeeReporting = lazy(() => import("./pages/admin/EmployeeReporting"));
const EmployeeCitySelection = lazy(() => import("./pages/admin/EmployeeCitySelection"));
const EmployeeMarketsList = lazy(() => import("./pages/admin/EmployeeMarketsList"));
const MarketManagerReporting = lazy(() => import("./pages/admin/MarketManagerReporting"));
const AttendanceReporting = lazy(() => import("./pages/admin/AttendanceReporting"));
const MyAttendance = lazy(() => import("./pages/MyAttendance"));
const AssetRequests = lazy(() => import("./pages/AssetRequests"));
const AssetManagement = lazy(() => import("./components/admin/AssetManagement").then(m => ({ default: m.AssetManagement })));
const BMSExecutiveDashboard = lazy(() => import("./pages/BMSExecutiveDashboard"));
const RequestsManagement = lazy(() => import("./pages/admin/RequestsManagement"));
const BMSMonitoring = lazy(() => import("./pages/admin/BMSMonitoring"));
const MyProfile = lazy(() => import("./pages/MyProfile"));

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    },
    mutations: {
      retry: 1,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
      <TooltipProvider>
        <Suspense fallback={null}><UpdateBanner /></Suspense>
        <Suspense fallback={null}><WhatsNewDialog /></Suspense>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <RouteOverlayRecovery />
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/install" element={<Install />} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/manager-dashboard" element={<ProtectedRoute><MarketManagerDashboard /></ProtectedRoute>} />
                <Route path="/my-manager-sessions" element={<ProtectedRoute><MyManagerSessions /></ProtectedRoute>} />
                <Route path="/mm-session" element={<ProtectedRoute><MMSession /></ProtectedRoute>} />
                <Route path="/market-selection" element={<ProtectedRoute><MarketSelection /></ProtectedRoute>} />
                <Route path="/punch" element={<ProtectedRoute><Punch /></ProtectedRoute>} />
                <Route path="/stalls" element={<ProtectedRoute><Stalls /></ProtectedRoute>} />
                <Route path="/media-upload" element={<ProtectedRoute><MediaUpload /></ProtectedRoute>} />
                <Route path="/finalize" element={<ProtectedRoute><Finalize /></ProtectedRoute>} />
                <Route path="/collections" element={<ProtectedRoute><Collections /></ProtectedRoute>} />
                <Route path="/my-sessions" element={<ProtectedRoute><MySessions /></ProtectedRoute>} />
                <Route path="/asset-requests" element={<ProtectedRoute><AssetRequests /></ProtectedRoute>} />
                <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                <Route path="/bms-dashboard" element={<ProtectedRoute><BMSExecutiveDashboard /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute><AdminLayout><AdminDashboard /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/requests" element={<ProtectedRoute><AdminLayout><RequestsManagement /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/bms-monitoring" element={<ProtectedRoute><AdminLayout><BMSMonitoring /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/asset-management" element={<ProtectedRoute><AdminLayout><AssetManagement /></AdminLayout></ProtectedRoute>} />
                
                <Route path="/admin/employee-reporting" element={<ProtectedRoute><AdminLayout><EmployeeCitySelection /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/employee-reporting/city/:city" element={<ProtectedRoute><AdminLayout><EmployeeMarketsList /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/employee-reporting/market/:marketId" element={<ProtectedRoute><AdminLayout><EmployeeReporting /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/employee/:userId/markets" element={<ProtectedRoute><AdminLayout><EmployeeMarketsList /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/market-reporting" element={<ProtectedRoute><AdminLayout><MarketManagerReporting /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/attendance" element={<ProtectedRoute><AdminLayout><AttendanceReporting /></AdminLayout></ProtectedRoute>} />
                <Route path="/my-attendance" element={<ProtectedRoute><MyAttendance /></ProtectedRoute>} />
                <Route path="/my-profile" element={<ProtectedRoute><MyProfile /></ProtectedRoute>} />
                <Route path="/admin/live-market" element={<ProtectedRoute><AdminLayout><LiveMarket /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/live-markets" element={<ProtectedRoute><AdminLayout><LiveMarkets /></AdminLayout></ProtectedRoute>} />
                <Route path="/bdo/live-markets" element={<ProtectedRoute><LiveMarkets /></ProtectedRoute>} />
                <Route path="/admin/sessions" element={<ProtectedRoute><AdminLayout><AllSessions /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/users" element={<ProtectedRoute><AdminLayout><Users /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/leaves" element={<ProtectedRoute><AdminLayout><LeaveRequests /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/collections" element={<ProtectedRoute><AdminLayout><Collections /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/admin/settings/:section" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/admin/market/:marketId" element={<ProtectedRoute><MarketDetail /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;

// Prefetch auth route after idle (most likely next navigation)
if (typeof window !== "undefined") {
  const prefetchAuth = () => {
    import("./pages/Auth");
    import("./pages/Dashboard");
  };
  // Delay prefetch to avoid competing with initial render
  const ric = (window as any).requestIdleCallback as undefined | ((cb: () => void, opts?: { timeout: number }) => void);
  if (ric) {
    ric(prefetchAuth, { timeout: 3000 });
  } else {
    setTimeout(prefetchAuth, 2500);
  }
}
