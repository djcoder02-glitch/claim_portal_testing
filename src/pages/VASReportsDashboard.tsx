import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, FileText, Clock, CheckCircle, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useVASReports } from "@/hooks/useVASReports";
import { useAuth } from "@/components/auth/AuthProvider";
import { NewVASReportDialog } from "@/components/vas/NewVASReportDialog";
import { VASReportsTable } from "@/components/vas/VASReportsTable";

export const VASReportsDashboard = () => {
  const [isNewReportOpen, setIsNewReportOpen] = useState(false);
  const { data: reports, isLoading } = useVASReports();
  const { user } = useAuth();
  const navigate = useNavigate();

  const filteredReports = reports || [];
  
  const stats = {
    total: filteredReports.length,
    submitted: filteredReports.filter(r => r.status === 'submitted').length,
    approved: filteredReports.filter(r => r.status === 'approved').length,
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
            <h1 className="text-3xl font-bold text-foreground">VAS Reports Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Manage and track your value-added service reports
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={() => setIsNewReportOpen(true)} size="lg">
              <Plus className="w-5 h-5 mr-2" />
              New VAS Report
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
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

        {/* Reports List */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">VAS Reports</h2>
          
          {filteredReports.length > 0 ? (
            <VASReportsTable reports={filteredReports} />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Star className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No VAS reports yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Get started by creating your first value-added service report
                </p>
                <Button onClick={() => setIsNewReportOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Report
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* New Report Dialog */}
        <NewVASReportDialog 
          open={isNewReportOpen} 
          onOpenChange={setIsNewReportOpen}
        />
      </div>
    </div>
  );
};
