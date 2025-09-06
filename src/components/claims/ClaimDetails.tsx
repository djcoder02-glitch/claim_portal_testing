import { useState } from "react";
import { useParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Info, Eye, Upload, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { useClaimById } from "@/hooks/useClaims";
import { PolicyDetailsForm } from "./PolicyDetailsForm";
import { AdditionalInformationForm } from "./AdditionalInformationForm";
import { ReportPreview } from "./ReportPreview";
import { DocumentManager } from "./DocumentManager";
import { Link } from "react-router-dom";
import { toast } from "sonner";
const statusConfig = {
  submitted: { color: "bg-slate-600", icon: Clock, label: "Submitted" },
  under_review: { color: "bg-amber-600", icon: AlertCircle, label: "Under Review" },
  approved: { color: "bg-green-700", icon: CheckCircle2, label: "Approved" },
  rejected: { color: "bg-red-600", icon: AlertCircle, label: "Rejected" },
  paid: { color: "bg-green-800", icon: CheckCircle2, label: "Paid" }
};

export const ClaimDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { data: claim, isLoading } = useClaimById(id!);
  const [activeTab, setActiveTab] = useState("policy-details");

  const handleTabChange = (value: string) => {
    // Show toast when switching tabs to indicate data is saved
    const sectionNames = {
      "policy-details": "Policy Details",
      "additional-info": "Additional Information", 
      "report-preview": "View Report",
      "documents": "Documents"
    };
    
    if (activeTab !== value) {
      const currentSectionName = sectionNames[activeTab as keyof typeof sectionNames];
      if (currentSectionName && (activeTab === "policy-details" || activeTab === "additional-info")) {
        toast.success(`${currentSectionName} saved successfully`);
      }
    }
    
    setActiveTab(value);
  };
  if (isLoading) {
    return (
      <div className="min-h-screen p-6 bg-gradient-background">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gradient-to-r from-primary/20 to-accent/20 rounded-lg w-64"></div>
            <div className="h-32 bg-gradient-to-r from-secondary/30 to-muted/30 rounded-lg"></div>
            <div className="h-96 bg-gradient-to-r from-muted/20 to-secondary/20 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="min-h-screen p-6 bg-gradient-background">
        <div className="max-w-7xl mx-auto text-center py-12">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
            <h1 className="text-2xl font-bold text-destructive">Claim not found</h1>
            <p className="text-muted-foreground mt-2">
              The claim you're looking for doesn't exist or you don't have access to it.
            </p>
            <Button asChild className="w-full bg-slate-600 hover:bg-slate-700 text-white shadow-sm transition-all duration-200">
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentStatus = statusConfig[claim.status as keyof typeof statusConfig];
  const StatusIcon = currentStatus?.icon || Clock;

  return (
    <div className="min-h-screen p-6 bg-gradient-background">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Enhanced Header */}
        <Card className="bg-white/95 backdrop-blur-sm border border-slate-200 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button variant="ghost" size="sm" asChild className="hover:bg-slate-100">
                  <Link to="/">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Dashboard
                  </Link>
                </Button>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-slate-800">
                      {claim.title}
                    </h1>
                    <Badge className={`${currentStatus?.color} text-white px-3 py-1 flex items-center gap-1 shadow-sm`}>
                      <StatusIcon className="w-3 h-3" />
                      {currentStatus?.label}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground flex items-center gap-2 mt-1">
                    <span className="font-medium">Claim #{claim.claim_number}</span>
                    <span>•</span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-xs">{claim.policy_types?.name}</span>
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Enhanced Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <Card className="bg-white/95 backdrop-blur-sm border border-slate-200 shadow-sm p-2">
            <TabsList className="grid w-full grid-cols-4 bg-slate-100 h-14">
              <TabsTrigger 
                value="policy-details" 
                className="flex items-center space-x-2 data-[state=active]:bg-slate-700 data-[state=active]:text-white transition-all duration-200"
              >
                <FileText className="w-4 h-4" />
                <span>Policy Details</span>
              </TabsTrigger>
              <TabsTrigger 
                value="additional-info" 
                className="flex items-center space-x-2 data-[state=active]:bg-slate-600 data-[state=active]:text-white transition-all duration-200"
              >
                <Info className="w-4 h-4" />
                <span>Additional Info</span>
              </TabsTrigger>
              <TabsTrigger 
                value="report-preview" 
                className="flex items-center space-x-2 data-[state=active]:bg-slate-800 data-[state=active]:text-white transition-all duration-200"
              >
                <Eye className="w-4 h-4" />
                <span>View Report</span>
              </TabsTrigger>
              <TabsTrigger 
                value="documents" 
                className="flex items-center space-x-2 data-[state=active]:bg-slate-500 data-[state=active]:text-white transition-all duration-200"
              >
                <Upload className="w-4 h-4" />
                <span>Documents</span>
              </TabsTrigger>
            </TabsList>
          </Card>

          <TabsContent value="policy-details" className="space-y-6">
            <PolicyDetailsForm claim={claim} />
          </TabsContent>

          <TabsContent value="additional-info" className="space-y-6">
            <AdditionalInformationForm claim={claim} />
          </TabsContent>

          <TabsContent value="report-preview" className="space-y-6">
            <ReportPreview claim={claim} />
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            <DocumentManager claimId={claim.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};