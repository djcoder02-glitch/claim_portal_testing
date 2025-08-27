import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, FileText, Info, Eye, Upload, Save } from "lucide-react";
import { useClaimById, usePolicyTypes, useUpdateClaim } from "@/hooks/useClaims";
import { PolicyDetailsForm } from "./PolicyDetailsForm";
import { AdditionalInformationForm } from "./AdditionalInformationForm";
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
  const { data: policyTypes } = usePolicyTypes();
  const updateClaimMutation = useUpdateClaim();
  const [activeTab, setActiveTab] = useState("policy-details");
  
  // Editable overview fields (policy type is read-only)
  const [editableData, setEditableData] = useState({
    status: "",
    claim_amount: "",
  });
  
  // Initialize editable data when claim loads
  useEffect(() => {
    if (claim) {
      setEditableData({
        status: claim.status,
        claim_amount: claim.claim_amount?.toString() || "",
      });
    }
  }, [claim]);

  const handleSaveOverview = async () => {
    if (!claim) return;
    
    const updates = {
      status: editableData.status as any,
      claim_amount: editableData.claim_amount ? parseFloat(editableData.claim_amount) : null,
    };

    await updateClaimMutation.mutateAsync({
      id: claim.id,
      updates,
    });
  };

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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Claim Overview</CardTitle>
                <CardDescription>{claim.description}</CardDescription>
              </div>
              <Button 
                onClick={handleSaveOverview}
                disabled={updateClaimMutation.isPending}
                size="sm"
              >
                <Save className="w-4 h-4 mr-2" />
                {updateClaimMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="policy-type">Policy Type</Label>
                <div className="px-3 py-2 border rounded-md bg-muted text-muted-foreground">
                  {claim.policy_types?.name || "No policy type"}
                </div>
                <p className="text-xs text-muted-foreground">
                  Policy type cannot be changed as form fields depend on it
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={editableData.status}
                  onValueChange={(value) => setEditableData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="claim-amount">Claim Amount ($)</Label>
                <Input
                  id="claim-amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={editableData.claim_amount}
                  onChange={(e) => setEditableData(prev => ({ ...prev, claim_amount: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="policy-details" className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>Policy Details</span>
            </TabsTrigger>
            <TabsTrigger value="additional-info" className="flex items-center space-x-2">
              <Info className="w-4 h-4" />
              <span>Additional Info</span>
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