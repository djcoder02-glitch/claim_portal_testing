import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, FileText, DollarSign, Clock, CheckCircle, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useClaims } from "@/hooks/useClaims";
import { useAuth } from "@/components/auth/AuthProvider";
import { NewClaimDialog } from "./NewClaimDialog";
import { ClaimsTable } from "./ClaimsTable";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const statusColors = {
  pending:"rbg(37 99 235)",
  submitted: "hsl(var(--status-submitted))", 
  under_review: "hsl(var(--status-under-review))",
  approved: "hsl(var(--status-approved))",
  rejected: "hsl(var(--status-rejected))",
  paid: "hsl(var(--status-paid))",
};

const statusIcons = {
  pending:Clock,
  submitted: Clock,
  under_review: Clock,
  approved: CheckCircle,
  rejected: FileText,
  paid: DollarSign,
};

export const ClaimsDashboard = () => {
  const [isNewClaimOpen, setIsNewClaimOpen] = useState(false);
  const { data: claims, isLoading } = useClaims();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error signing out");
    } else {
      toast.success("Signed out successfully");
      navigate("/auth");
    }
  };

  const filteredClaims = claims || [];
  
  const stats = {
    total: filteredClaims.length,
    submitted: filteredClaims.filter(c => c.status === 'submitted').length,
    approved: filteredClaims.filter(c => c.status === 'approved').length,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-muted rounded w-64"></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-32 bg-muted rounded"></div>
                ))}
              </div>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Claims Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Manage and track your insurance claims
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={() => setIsNewClaimOpen(true)} size="lg">
              <Plus className="w-5 h-5 mr-2" />
              New Claim
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {user?.email}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Claims</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Submitted</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.submitted}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.approved}</div>
            </CardContent>
          </Card>
        </div>

        {/* Claims List */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Claims</h2>
          
          {filteredClaims.length > 0 ? (
            <ClaimsTable claims={filteredClaims} />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No claims yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Get started by creating your first insurance claim
                </p>
                <Button onClick={() => setIsNewClaimOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Claim
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* New Claim Dialog */}
        <NewClaimDialog 
          open={isNewClaimOpen} 
          onOpenChange={setIsNewClaimOpen}
        />
      </div>
    </div>
  );
};