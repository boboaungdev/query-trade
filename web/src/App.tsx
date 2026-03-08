import { Routes, Route } from "react-router-dom"
import { Toaster } from "@/components/ui/sonner"

import Navbar from "./components/Navbar"
import Home from "./pages/Home"
import Auth from "./pages/Auth"
import Dashboard from "./pages/dashboard"

export default function App() {
  return (
    <div className="min-h-svh">
      <Navbar />
      <Toaster position="bottom-center" />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </div>
  )
}
