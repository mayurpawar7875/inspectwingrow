import React, { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, ProtectedRoute } from "./lib/auth";
import { AdminLayout } from "./components/AdminLayout";

// Eager load entry point pages
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import Install from "./pages/Install";

// Lazy load all other pages
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
const MarketManagerDashboard = lazy(() => import("./pages/MarketManagerDashboard"));
const MyManagerSessions = lazy(() => import("./pages/MyManagerSessions"));
const BDODashboard = lazy(() => import("./pages/BDODashboard"));
const BDOSession = lazy(() => import("./pages/BDOSession"));
const MMSession = lazy(() => import("./pages/BDOSession")); // Same component, different route for Market Managers
const BDOReporting = lazy(() => import("./pages/admin/BDOReporting"));
const EmployeeReporting = lazy(() => import("./pages/admin/EmployeeReporting"));
const EmployeeCitySelection = lazy(() => import("./pages/admin/EmployeeCitySelection"));
const EmployeeMarketsList = lazy(() => import("./pages/admin/EmployeeMarketsList"));
const MarketManagerReporting = lazy(() => import("./pages/admin/MarketManagerReporting"));
const AttendanceReporting = lazy(() => import("./pages/admin/AttendanceReporting"));
const MyAttendance = lazy(() => import("./pages/MyAttendance"));
const AssetRequests = lazy(() => import("./pages/AssetRequests"));
const AssetManagement = lazy(() => import("./components/admin/AssetManagement").then(m => ({ default: m.AssetManagement })));
const RequestsManagement = lazy(() => import("./pages/admin/RequestsManagement"));

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
    },
  },
});

const App = () => (
  <React.Fragment>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/install" element={<Install />} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/manager-dashboard" element={<ProtectedRoute><MarketManagerDashboard /></ProtectedRoute>} />
                <Route path="/my-manager-sessions" element={<ProtectedRoute><MyManagerSessions /></ProtectedRoute>} />
                <Route path="/bdo-dashboard" element={<ProtectedRoute><BDODashboard /></ProtectedRoute>} />
                <Route path="/bdo-session" element={<ProtectedRoute><BDOSession /></ProtectedRoute>} />
                <Route path="/mm-session" element={<ProtectedRoute><MMSession /></ProtectedRoute>} />
                <Route path="/market-selection" element={<ProtectedRoute><MarketSelection /></ProtectedRoute>} />
                <Route path="/punch" element={<ProtectedRoute><Punch /></ProtectedRoute>} />
                <Route path="/stalls" element={<ProtectedRoute><Stalls /></ProtectedRoute>} />
                <Route path="/media-upload" element={<ProtectedRoute><MediaUpload /></ProtectedRoute>} />
                <Route path="/finalize" element={<ProtectedRoute><Finalize /></ProtectedRoute>} />
                <Route path="/collections" element={<ProtectedRoute><Collections /></ProtectedRoute>} />
                <Route path="/my-sessions" element={<ProtectedRoute><MySessions /></ProtectedRoute>} />
                <Route path="/asset-requests" element={<ProtectedRoute><AssetRequests /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute><AdminLayout><AdminDashboard /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/requests" element={<ProtectedRoute><AdminLayout><RequestsManagement /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/asset-management" element={<ProtectedRoute><AdminLayout><AssetManagement /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/bdo-reporting" element={<ProtectedRoute><AdminLayout><BDOReporting /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/employee-reporting" element={<ProtectedRoute><AdminLayout><EmployeeCitySelection /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/employee-reporting/city/:city" element={<ProtectedRoute><AdminLayout><EmployeeMarketsList /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/employee-reporting/market/:marketId" element={<ProtectedRoute><AdminLayout><EmployeeReporting /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/market-reporting" element={<ProtectedRoute><AdminLayout><MarketManagerReporting /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/attendance" element={<ProtectedRoute><AdminLayout><AttendanceReporting /></AdminLayout></ProtectedRoute>} />
                <Route path="/my-attendance" element={<ProtectedRoute><MyAttendance /></ProtectedRoute>} />
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
    </QueryClientProvider>
  </React.Fragment>
);

export default App;

// Prefetch common routes after idle time to reduce perceived loading
if (typeof window !== "undefined") {
  const prefetch = () => {
    import("./pages/admin/AdminDashboard");
    import("./pages/admin/Settings");
    import("./pages/admin/LiveMarkets");
    import("./pages/admin/MarketDetail");
    import("./pages/admin/Users");
    import("./pages/admin/Collections");
  };
  // Use requestIdleCallback if available, otherwise a short timeout
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const ric = window.requestIdleCallback as undefined | ((cb: () => void) => void);
  if (ric) {
    // @ts-ignore
    ric(prefetch);
  } else {
    setTimeout(prefetch, 1200);
  }
}
