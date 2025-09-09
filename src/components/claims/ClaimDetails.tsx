import { useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, FileText, Info, Eye, Upload, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { useClaimById } from "@/hooks/useClaims";
import { PolicyDetailsForm } from "./PolicyDetailsForm";
import { AdditionalInformationForm } from "./AdditionalInformationForm";
import { ReportPreview } from "./ReportPreview";
import { DocumentManager } from "./DocumentManager";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

const statusConfig = {
  submitted: { color: "bg-slate-600", icon: Clock, label: "Submitted" },
  under_review: { color: "bg-amber-600", icon: AlertCircle, label: "Under Review" },
  approved: { color: "bg-green-700", icon: CheckCircle2, label: "Approved" },
  rejected: { color: "bg-red-600", icon: AlertCircle, label: "Rejected" },
  paid: { color: "bg-green-800", icon: CheckCircle2, label: "Paid" }
};

// FIX 1: Proper type definition with export for reusability
type ClaimDocumentRow = Tables<'claim_documents'>;

// FIX 2: Define extracted data type for better type safety
interface ExtractedBillData {
  consignee_name?: string;
  consignee_importer?: string;
  applicant_survey?: string;
  underwriter_name?: string;
  cha_name?: string;
  certificate_no?: string;
  endorsement_no?: string;
  invoice_no?: string;
  invoice_date?: string;
  invoice_value?: string;
  invoice_pcs?: string;
  invoice_gross_wt?: string;
  invoice_net_wt?: string;
}

export const ClaimDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { data: claim, isLoading } = useClaimById(id!);
  const [activeTab, setActiveTab] = useState("policy-details");
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadedBillOfEntry, setUploadedBillOfEntry] = useState<ClaimDocumentRow | null>(null);
  const queryClient = useQueryClient();

  // FIX 3: Add proper typing for section names
  const handleTabChange = (value: string) => {
    const sectionNames: Record<string, string> = {
      "policy-details": "Policy Details",
      "additional-info": "Additional Information", 
      "report-preview": "View Report",
      "documents": "Documents"
    };
    
    if (activeTab !== value) {
      const currentSectionName = sectionNames[activeTab];
      if (currentSectionName && (activeTab === "policy-details" || activeTab === "additional-info")) {
        toast.success(`${currentSectionName} saved successfully`);
      }
    }
    
    setActiveTab(value);
  };

  const populateFormFields = (extractedData: ExtractedBillData) => {
  console.log('populateFormFields called with:', extractedData);
  
  // Map extracted keys to your actual form input placeholders
  const fieldMapping: Record<keyof ExtractedBillData, string> = {
  'consignee_name': 'enter name of consigner of goods (exporter)',
  'consignee_importer': 'enter name of consignee of goods (importer)', 
  'applicant_survey': 'enter applicant of survey',
  'underwriter_name': 'enter name of underwriter / insurer',
  'cha_name': 'enter name of cha / clearing agent / forwarder',
  'certificate_no': 'enter certificate no (if applicable)',
  'endorsement_no': 'enter endorsement no (if any)',
  'invoice_no': 'enter invoice details invoice no',
  'invoice_date': 'dd-mm-yyyy',
  'invoice_value': 'enter invoice details invoice value',
  'invoice_pcs': 'enter invoice details no of pkg',
  'invoice_gross_wt': 'enter invoice details gross wt',
  'invoice_net_wt': 'enter invoice details net wt'
};
  let populatedCount = 0;
  
  Object.entries(extractedData).forEach(([extractedKey, value]) => {
  if (value && fieldMapping[extractedKey as keyof ExtractedBillData]) {
    const placeholder = fieldMapping[extractedKey as keyof ExtractedBillData];
    // Try multiple selectors to find the input
    const input = document.querySelector(`input[placeholder*="${placeholder}"]`) as HTMLInputElement ||
                  document.querySelector(`input[name="${extractedKey}"]`) as HTMLInputElement ||
                  document.querySelector(`input[id="${extractedKey}"]`) as HTMLInputElement;    
    if (input) {
        console.log(`Populating ${extractedKey}: ${value}`);
        input.value = String(value);
        
        // Trigger change event so React recognizes the change
        const event = new Event('input', { bubbles: true });
        input.dispatchEvent(event);
        
        populatedCount++;
      } else {
        console.log(`Input not found for placeholder: "${placeholder}"`);
      }
    }
  });
  
  console.log(`Successfully populated ${populatedCount} fields`);
  toast.success(`Populated ${populatedCount} form fields!`);
};

  // Upload Bill of Entry mutation
  const uploadBillOfEntryMutation = useMutation<ClaimDocumentRow, Error, File>({
    mutationFn: async (file: File): Promise<ClaimDocumentRow> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Upload file to storage
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `${user.id}/${id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from("claim-documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Save document record to database
      const { data, error } = await supabase
        .from("claim_documents")
        .insert({
          claim_id: id!,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: user.id,
          field_label: 'Bill of Entry',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data: ClaimDocumentRow) => {
      queryClient.invalidateQueries({ queryKey: ["claim-documents", id] });
      setUploadedBillOfEntry(data);
      toast.success("Bill of Entry uploaded successfully!");
    },
    onError: (error) => {
      toast.error("Failed to upload Bill of Entry: " + error.message);
    },
  });

  // FIX 5: Add proper typing for mutation response
const extractBillDataMutation = useMutation({
  mutationFn: async (documentData: ClaimDocumentRow) => {
    // Download file from Supabase
    const { data: fileData, error } = await supabase.storage
      .from('claim-documents')
      .download(documentData.file_path);

    if (error) throw new Error(`Failed to download file: ${error.message}`);

    // Convert to base64 using browser APIs (not Buffer)
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Convert to base64 using browser's btoa
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64Data = btoa(binary);

    // Send to backend
    // Send to backend with claim ID for dynamic field mapping
    const response = await fetch('http://localhost:5000/extract-bill-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        pdfData: base64Data,
        claimId: id  // Add claim ID to get custom field labels
      })
    });

    if (!response.ok) throw new Error('Extraction failed');
    return response.json();
  },
  onSuccess: (result) => {
    if (result.success && result.extractedData) {
      populateFormFields(result.extractedData);
      toast.success("Data extracted successfully!");
    } else {
      toast.error("Extraction failed: " + result.message);
    }
  },
  onError: (error) => {
    toast.error("Failed to extract data: " + error.message);
  },
});


  const handleExtractData = async () => {
    if (!uploadedBillOfEntry) return;
    
    setIsExtracting(true);
    try {
      await extractBillDataMutation.mutateAsync(uploadedBillOfEntry);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleReUpload = () => {
    setUploadedBillOfEntry(null);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleBillOfEntryUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      await uploadBillOfEntryMutation.mutateAsync(files[0]);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
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

        {/* Main Content Layout with Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Fixed Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Claim Overview */}
            <Card className="bg-white/95 backdrop-blur-sm border border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Claim Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  <p className="text-muted-foreground">Amount</p>
                  <p className="font-semibold">
                    {claim.claim_amount ? `$${Number(claim.claim_amount).toLocaleString()}` : 'Not specified'}
                  </p>
                </div>
                <div className="text-sm">
                  <p className="text-muted-foreground">Description</p>
                  <p className="text-sm">{claim.description || 'No description provided'}</p>
                </div>
              </CardContent>
            </Card>

            {/* FIX 7: Enhanced Bill of Entry Upload with Re-upload and Extract buttons */}
            <Card className="bg-white/95 backdrop-blur-sm border border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <FileText className="w-5 h-5" />
                  <span>Bill of Entry</span>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Upload your Bill of Entry document (PDF format required for analysis)
                </p>
              </CardHeader>
              <CardContent>
                {!uploadedBillOfEntry ? (
                  <div className="border-2 border-dashed rounded-lg p-4 text-center space-y-3">
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={(e) => handleBillOfEntryUpload(e.target.files)}
                      disabled={isUploading}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="w-full"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {isUploading ? "Uploading..." : "Browse PDF"}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Only PDF files are accepted (Max 10MB)
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center space-x-2 text-green-700">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-sm font-medium">{uploadedBillOfEntry.file_name}</span>
                      </div>
                      <p className="text-xs text-green-600 mt-1">Uploaded successfully</p>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        onClick={handleReUpload}
                        size="sm"
                        className="flex-1"
                      >
                        Re-upload
                      </Button>
                      <Button
                        onClick={handleExtractData}
                        disabled={isExtracting}
                        size="sm"
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {isExtracting ? 'Extracting...' : 'Populate Fields'}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
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
      </div>
    </div>
  );
};