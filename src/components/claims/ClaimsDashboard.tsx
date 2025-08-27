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
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const statusColors = {
  draft: "hsl(var(--status-draft))",
  submitted: "hsl(var(--status-submitted))", 
  under_review: "hsl(var(--status-under-review))",
  approved: "hsl(var(--status-approved))",
  rejected: "hsl(var(--status-rejected))",
  paid: "hsl(var(--status-paid))",
};

const statusIcons = {
  draft: FileText,
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

  const stats = {
    total: claims?.length || 0,
    draft: claims?.filter(c => c.status === 'draft').length || 0,
    submitted: claims?.filter(c => c.status === 'submitted').length || 0,
    approved: claims?.filter(c => c.status === 'approved').length || 0,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-64"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
              <CardTitle className="text-sm font-medium">Draft Claims</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.draft}</div>
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
          <h2 className="text-xl font-semibold">Recent Claims</h2>
          
          {claims && claims.length > 0 ? (
            <div className="grid gap-4">
              {claims.map((claim) => {
                const StatusIcon = statusIcons[claim.status];
                return (
                  <Link key={claim.id} to={`/claims/${claim.id}`}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer hover:bg-accent/50">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <CardTitle className="text-lg">{claim.title}</CardTitle>
                            <CardDescription>
                              Claim #{claim.claim_number} • {claim.policy_types?.name}
                            </CardDescription>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge 
                              variant="secondary" 
                              className="text-white"
                              style={{ backgroundColor: statusColors[claim.status] }}
                            >
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {claim.status.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Created {format(new Date(claim.created_at), 'MMM dd, yyyy')}</span>
                          {claim.claim_amount && (
                            <span className="font-medium">
                              ${claim.claim_amount.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
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