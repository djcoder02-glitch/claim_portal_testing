import { useAuth } from "@/components/auth/AuthProvider";
import { AdminDashboard as AdminDashboard } from "./AdminDashboard";
import { UserDashboard } from "./UserDashboard";

/**
 * Dashboard Wrapper Component
 * 
 * Conditionally renders the appropriate dashboard based on user role:
 * - Admin users see: AdminDashboard (with revenue, all surveyors, system-wide metrics)
 * - Regular users see: UserDashboard (personal performance, their claims only)
 */
export const Dashboard = () => {
  const { isAdmin } = useAuth();

  return isAdmin ? <AdminDashboard /> : <UserDashboard />;
};
