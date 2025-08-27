import { useState } from "react";
import { useParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Eye, Upload } from "lucide-react";
import { useClaimById } from "@/hooks/useClaims";
import { PolicyDetailsForm } from "./PolicyDetailsForm";
import { ReportPreview } from "./ReportPreview";
import { DocumentManager } from "./DocumentManager";
import { Link } from "react-router-dom";

const statusColors = {
  draft: "bg-gray-500",
  submitted: "bg-blue-500",
  under_review: "bg-yellow-500",
  approved: "bg-green-500",
  rejected: "bg-red-500",
  paid: "bg-purple-500",
};

export const ClaimDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { data: claim, isLoading } = useClaimById(id!);
  const [activeTab, setActiveTab] = useState("policy-details");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-64"></div>
            <div className="h-32 bg-muted rounded"></div>
            <div className="h-96 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto text-center py-12">
          <h1 className="text-2xl font-bold text-destructive">Claim not found</h1>
          <p className="text-muted-foreground mt-2">
            The claim you're looking for doesn't exist or you don't have access to it.
          </p>
          <Button asChild className="mt-4">
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{claim.title}</h1>
              <p className="text-muted-foreground">
                Claim #{claim.claim_number} • {claim.policy_types?.name}
              </p>
            </div>
          </div>
          <Badge 
            variant="secondary" 
            className={`${statusColors[claim.status]} text-white`}
          >
            {claim.status.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>

        {/* Claim Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Claim Overview</CardTitle>
            <CardDescription>{claim.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Policy Type</p>
                <p className="font-medium">{claim.policy_types?.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-medium">{claim.status.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Claim Amount</p>
                <p className="font-medium">
                  {claim.claim_amount ? `$${claim.claim_amount.toLocaleString()}` : 'Not specified'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="policy-details" className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>Policy Details</span>
            </TabsTrigger>
            <TabsTrigger value="report-preview" className="flex items-center space-x-2">
              <Eye className="w-4 h-4" />
              <span>View Report</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center space-x-2">
              <Upload className="w-4 h-4" />
              <span>Documents</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="policy-details" className="space-y-6">
            <PolicyDetailsForm claim={claim} />
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