import { Navigate, Outlet, Routes, Route } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Toaster } from "@/components/ui/sonner";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

import Navbar from "./components/Navbar";

import Home from "./pages/home";
import Dashboard from "./pages/dashboard";
import Auth from "./pages/auth";
import Leaderboard from "./pages/leaderboard";
import Backtest from "./pages/backtest/index";
import BacktestResult from "./pages/backtest/result";
import Strategy from "./pages/strategy";
import StrategyDetail from "./pages/strategy/detail";
import Bookmark from "./pages/bookmark";
import Profile from "./pages/profile";
import NotFound from "./pages/not-found";
import Pricing from "./pages/pricing";
import PaymentPage from "./pages/payment";
import WalletPage from "./pages/wallet";
import AdminDashboard from "./pages/admin";

import { useAuthStore } from "@/store/auth";
import Settings from "./pages/settings";

function ProtectedRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <Outlet />;
}

function AuthRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Auth />;
}

function AdminRoute() {
  const user = useAuthStore((state) => state.user);

  if (user?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <AdminDashboard />;
}

export default function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <SidebarProvider defaultOpen={false}>
      {/* Sidebar only when logged in */}
      {isAuthenticated && <AppSidebar />}

      <SidebarInset>
        <Navbar />

        <main className="flex-1 p-6">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<AuthRoute />} />
            <Route path="/pricing" element={<Pricing />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/strategy" element={<Strategy />} />
              <Route
                path="/strategy/:strategyId"
                element={<StrategyDetail />}
              />
              <Route path="/bookmark" element={<Bookmark />} />
              <Route path="/backtest" element={<Backtest />} />
              <Route path="/backtest/:backtestId/edit" element={<Backtest />} />
              <Route
                path="/backtest/:backtestId"
                element={<BacktestResult />}
              />
              <Route path="/settings" element={<Settings />} />
              <Route path="/wallet" element={<WalletPage />} />
              <Route path="/payment/:paymentId" element={<PaymentPage />} />
              <Route path="/admin/dashboard" element={<AdminRoute />} />
            </Route>

            <Route path="/:username" element={<Profile />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>

        <Toaster position="top-center" duration={1500} richColors />
        <Analytics />
        <SpeedInsights />
      </SidebarInset>
    </SidebarProvider>
  );
}
