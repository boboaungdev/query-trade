import { Routes, Route } from "react-router-dom"
import { Toaster } from "@/components/ui/sonner"

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/AppSidebar"

import Navbar from "./components/Navbar"

import Home from "./pages/Home"
import Auth from "./pages/Auth"
import Dashboard from "./pages/dashboard"

import { useAuthStore } from "@/store/auth"

export default function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  return (
    <SidebarProvider defaultOpen={false}>
      {/* Sidebar only when logged in */}
      {isAuthenticated && <AppSidebar />}

      <SidebarInset>
        <Navbar />

        <main className="flex-1 p-6">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </main>

        <Toaster position="bottom-center" />
      </SidebarInset>
    </SidebarProvider>
  )
}
