import { Navigate } from "react-router-dom";
import { ClaimsDashboard } from "@/components/claims/ClaimsDashboard";
import { useAuth } from "@/components/auth/AuthProvider";

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <ClaimsDashboard />;
};

export default Index;
