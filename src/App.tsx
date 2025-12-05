import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { Dashboard } from "./pages/Dashboard";
import { ClaimsDashboard } from "@/components/claims/ClaimsDashboard";
import { ClaimDetails } from "./components/claims/ClaimDetails";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Analytics from "./pages/Analytics";
import HelpCenter from "./pages/HelpCenter";
import {Profile} from "./pages/Profile";
import {TeamManagement} from "./pages/TeamManagement";
import Setting from "./pages/Settings";
import Brokers from "./pages/Brokers";
import Customers from "./pages/Customers";
import { PublicUpload } from "./pages/PublicUpload"; 

const queryClient = new QueryClient();

/**
 * Main App Component
 * 
 * This is the root component that sets up:
 * 1. React Query for data fetching and caching
 * 2. Authentication context
 * 3. Toast notifications (both Toaster and Sonner)
 * 4. Routing structure with protected routes
 * 
 * Route Structure:
 * - /auth: Public authentication page
 * - / : Dashboard overview (protected, with layout)
 * - /claims: Claims management page (protected, with layout)
 * - /claims/:id: Individual claim details (protected, without layout for full-width view)
 * - /analytics, /settings, etc.: Placeholder pages (protected, with layout)
 * 
 * The DashboardLayout provides the left sidebar navigation and wraps all main pages
 * except the claim details page which needs full-width layout.
 */
const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Route */}
            <Route path="/auth" element={<Auth />} />
            {/* Public Upload Route - No Authentication Required */}
            <Route path="/public-upload" element={<PublicUpload />} />
            
            {/* Protected Routes with Dashboard Layout */}
            <Route 
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              {/* Main Dashboard Overview */}
              <Route path="/" element={<Dashboard />} />
              
              {/* Claims Management */}
              <Route path="/claims" element={<ClaimsDashboard />} />
              
              {/* Placeholder Routes - Can be implemented later */}
              <Route path="analytics" element={<Analytics />} />
              
              <Route 
                path="/settings" 
                element={<Setting />
                } 
              />
              
              <Route 
                path="/management" 
                element={
                  <ProtectedRoute requireAdmin={true}>
                  <TeamManagement />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/profile" 
                element={
                  <Profile />
                } 
              />
              
              <Route path="/help" element={<HelpCenter />} />
              
              
              <Route 
                path="/agents-brokers" 
                element={
                  <Brokers />}
              />
              
              <Route 
                path="/customers" 
                element={
                  <Customers />} 
              />
              
              <Route 
                path="/notifications" 
                element={
                  <div className="p-8">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Notifications</h1>
                    <p className="text-gray-600">Notification center coming soon...</p>
                  </div>
                } 
              />
            </Route>
            
            {/* Claim Details - Full Width (No Layout) */}
            <Route 
              path="/claims/:id" 
              element={
                <ProtectedRoute>
                  <ClaimDetails />
                </ProtectedRoute>
              } 
            />
            
            {/* 404 Catch-All */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;