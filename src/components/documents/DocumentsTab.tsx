import { useState } from "react";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link2, Copy, Check } from "lucide-react";
import { UploadedDocumentsGrid } from "./UploadedDocumentsGrid";
import { DocumentRequirementSection } from "./DocumentRequirementSection";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { generateBatchUploadToken } from "@/lib/uploadTokens";
import { Upload as UploadIcon } from "lucide-react";
import { uploadDocument } from "@/lib/uploadDocument";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DocumentsTabProps {
  claimId: string;
}

export const DocumentsTab = ({ claimId }: DocumentsTabProps) => {
  const [uploadLinkDialogOpen, setUploadLinkDialogOpen] = useState(false);
  const [uploadLink, setUploadLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [assignedDocuments, setAssignedDocuments] = useState<Record<string, any>>({});
  const queryClient = useQueryClient();
  const [customSections, setCustomSections] = useState<string[]>([]);
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null); 

  // Fetch claim to get policy_type_id
  const { data: claim } = useQuery({
    queryKey: ['claim', claimId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('claims')
        .select('*, policy_types(id, name, required_documents)')
        .eq('id', claimId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Fetch uploaded documents
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['uploaded-documents', claimId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('claim_documents')
        .select('*')
        .eq('claim_id', claimId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data?.map((doc) => ({
        ...doc,
        field_label: doc.field_label ?? undefined,
        is_selected: doc.is_selected ?? undefined,
        token_expires_at: doc.token_expires_at ?? undefined,
        upload_token: doc.upload_token ?? undefined,
        uploaded_via_link: doc.uploaded_via_link ?? undefined,
      }));
    },
  });

  // Get required documents from policy type
  const requiredDocuments = (claim?.policy_types?.required_documents as string[]) || [];

useEffect(() => {
  console.log("Documents changed, reloading sections. Documents count:", documents?.length);
  
  if (documents) {
    // Load assigned documents
    const assigned = documents.reduce((acc, doc) => {
      if (doc.field_label && doc.is_selected && doc.file_type !== 'placeholder') {
        acc[doc.field_label] = doc;
      }
      return acc;
    }, {} as Record<string, any>);
    
    setAssignedDocuments(assigned);
  }
  
  // Load custom sections from claim metadata instead of database
  if (claim?.metadata?.custom_document_sections) {
    setCustomSections(claim.metadata.custom_document_sections);
  }
}, [documents, claim]);


  // Generate upload link
  const handleGenerateLink = async () => {
    try {
      const tokenData = await generateBatchUploadToken(claimId, 168); // 7 days
      setUploadLink(tokenData.uploadUrl);
      setUploadLinkDialogOpen(true);
      setCopied(false);
      toast.success("Upload link generated!");
    } catch (error) {
      console.error("Error generating link:", error);
      toast.error("Failed to generate upload link");
    }
  };

  // Copy link to clipboard
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(uploadLink);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  // Delete document mutation
  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const { error } = await supabase
        .from('claim_documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uploaded-documents', claimId] });
      toast.success("Document deleted successfully");
    },
    onError: (error) => {
      console.error("Delete error:", error);
      toast.error("Failed to delete document");
    },
  });

  const assignMutation = useMutation({
  mutationFn: async ({ documentId, fieldLabel }: { documentId: string; fieldLabel: string }) => {
    // First check what kind of document we're assigning
    const { data: docToAssign } = await supabase
      .from('claim_documents')
      .select('file_type')
      .eq('id', documentId)
      .single();

    // Update the document
    const { error } = await supabase
      .from('claim_documents')
      .update({ 
        field_label: fieldLabel,
        is_selected: true 
      })
      .eq('id', documentId);

    if (error) throw error;
    
    // ONLY delete placeholder if we assigned a REAL document (not a placeholder)
    if (docToAssign?.file_type !== 'placeholder') {
      await supabase
        .from('claim_documents')
        .delete()
        .eq('claim_id', claimId)
        .eq('field_label', fieldLabel)
        .eq('file_type', 'placeholder');
    }
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['uploaded-documents', claimId] });
  },
  onError: (error) => {
    console.error("Assign error:", error);
    toast.error("Failed to assign document");
  },
});


  
  // View document
  const handleViewDocument = (fileUrl: string) => {
    window.open(fileUrl, '_blank');
  };

  // Assign document to section
  const handleAssignDocument = (section: string, document: any) => {
    setAssignedDocuments(prev => ({
      ...prev,
      [section]: document
    }));
    assignMutation.mutate({ documentId: document.id, fieldLabel: section }); // ADD THIS LINE
    toast.success(`Document assigned to ${section}`);
  };


  // Remove document from section
  const handleRemoveDocument = (section: string) => {
  const docToRemove = assignedDocuments[section];
  
  setAssignedDocuments(prev => {
    const newDocs = { ...prev };
    delete newDocs[section];
    return newDocs;
  });
  
  // ADD THIS BLOCK
  if (docToRemove) {
    supabase
      .from('claim_documents')
      .update({ field_label: null, is_selected: false })
      .eq('id', docToRemove.id)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['uploaded-documents', claimId] });
      });
  }
  
  toast.success(`Document removed from ${section}`);
};


// Direct upload from local files
const handleDirectUpload = async (files: FileList | null) => {
  if (!files || files.length === 0) return;

  setIsUploading(true);
  
  // Get current user info
  const { data: { user } } = await supabase.auth.getUser();
  
  const uploadPromises = Array.from(files).map(async (file) => {
    try {
      // Upload to AWS S3
      const result = await uploadDocument(file, claimId, "You");

      // Save metadata to Supabase
      const { error } = await supabase
        .from('claim_documents')
        .insert({
          claim_id: claimId,
          file_name: file.name,
          file_path: result.url,
          file_type: file.name.split('.').pop() || 'unknown',
          file_size: file.size,
          uploaded_by: user?.id || null, // CHANGED: Use admin's user ID
          upload_token: null,
          uploaded_via_link: true, // CHANGED: Set to true so it shows in grid
          is_selected: false,
          field_label: null, // CHANGED: Shows in grid
          metadata: {
            uploader_name: "YOU", // CHANGED: Shows in card
            upload_date: new Date().toISOString(),
            upload_source: 'direct'
          }
        } as any);

      if (error) throw error;
      
      toast.success(`${file.name} uploaded successfully`);
    } catch (error) {
      console.error(`Failed to upload ${file.name}:`, error);
      toast.error(`Failed to upload ${file.name}`);
    }
  });

  await Promise.all(uploadPromises);
  
  setIsUploading(false);
  setSelectedFiles(null);
  
  // Refresh documents list
  queryClient.invalidateQueries({ queryKey: ['uploaded-documents', claimId] });
};

  const handleAddCustomSection = async () => {
  if (!newSectionName.trim()) {
    toast.error("Please enter a section name");
    return;
  }
  
  if ([...requiredDocuments, ...customSections].includes(newSectionName.trim())) {
    toast.error("This section already exists");
    return;
  }
  
  const sectionName = newSectionName.trim();
  setNewSectionName("");
  setShowAddSection(false);

  console.log("=== ADDING CUSTOM SECTION ===");
  console.log("Claim ID:", claimId);
  console.log("Section name:", sectionName);
  
  // Get current metadata
  const currentMetadata = (claim as any)?.metadata || {};
  const currentSections = currentMetadata.custom_document_sections || [];
  
  console.log("Current metadata:", currentMetadata);
  console.log("Current sections:", currentSections);
  
  const newMetadata = {
    ...currentMetadata,
    custom_document_sections: [...currentSections, sectionName]
  };
  
  console.log("New metadata to save:", newMetadata);
  
  // Update claim metadata
  const { error, data } = await supabase
    .from('claims')
    .update({
      metadata: newMetadata
    } as any)
    .eq('id', claimId)
    .select(); // ADD .select() to see what was updated

  console.log("Update result - error:", error);
  console.log("Update result - data:", data);

  if (error) {
    console.error("Error saving custom section:", error);
    toast.error("Failed to save custom section");
  } else {
    console.log("Success! Setting custom sections to:", [...customSections, sectionName]);
    setCustomSections(prev => [...prev, sectionName]);
    queryClient.invalidateQueries({ queryKey: ['claim', claimId] });
    toast.success("Custom section added");
  }
};


  const handleRemoveCustomSection = async (sectionName: string) => {
  handleRemoveDocument(sectionName);
  
  // Remove from claim metadata
  const currentMetadata = (claim as any)?.metadata || {};

  const currentSections = currentMetadata.custom_document_sections || [];
  
  const { error } = await supabase
    .from('claims')
    .update({
      metadata: {
        ...currentMetadata,
        custom_document_sections: [...currentSections, sectionName]
      }
    } as any)
    .eq('id', claimId);

  if (!error) {
    setCustomSections(prev => prev.filter(s => s !== sectionName));
    queryClient.invalidateQueries({ queryKey: ['claim', claimId] });
    toast.success("Custom section removed");
  } else {
    toast.error("Failed to remove section");
  }
};



  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Documents</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Manage all documents for this claim
              </p>
            </div>
            <div className="flex gap-3">
              {/* Direct Upload Button */}
              <div>
                <input
                  type="file"
                  id="direct-upload-input"
                  multiple
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx"
                  onChange={(e) => handleDirectUpload(e.target.files)}
                  className="hidden"
                  disabled={isUploading}
                />
                <Button
                  onClick={() => document.getElementById('direct-upload-input')?.click()}
                  variant="outline"
                  className="gap-2"
                  disabled={isUploading}
                >
                  <UploadIcon className="w-4 h-4" />
                  {isUploading ? "Uploading..." : "Upload Files"}
                </Button>
              </div>

              {/* Generate Link Button */}
              <Button onClick={handleGenerateLink} className="gap-2">
                <Link2 className="w-4 h-4" />
                Generate Upload Link
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Uploaded Documents Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Uploaded Documents</CardTitle>
          <p className="text-sm text-gray-600">
            All documents uploaded via public links
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading documents...</p>
            </div>
          ) : (
            <UploadedDocumentsGrid
              documents={documents.filter(doc => 
                doc.file_type !== 'placeholder' && 
                !doc.file_name.startsWith('BATCH_TOKEN_') &&
                !doc.file_name.startsWith('__BATCH_TOKEN_')&&
                !doc.file_name.startsWith('__TOKEN_')
              )} 
              onDelete={(id) => deleteMutation.mutate(id)}
              onView={handleViewDocument}
            />
          )}
        </CardContent>
      </Card>

      {/* Document Requirements Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Upload Documents</CardTitle>
          <p className="text-sm text-gray-600">
            These are suggested document types based on your policy type. Upload what you have available.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {requiredDocuments.length === 0 && customSections.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No document requirements defined for this policy type.
            </div>
          ) : (
            <>
              {/* Required Documents from Policy Type */}
              {requiredDocuments.map((docLabel: string, index: number) => (
                <DocumentRequirementSection
                  key={docLabel}
                  label={docLabel}
                  description={`Upload ${docLabel} document for this claim`}
                  recommended={index < 2}
                  claimId={claimId}
                  assignedDocument={assignedDocuments[docLabel]}
                  onAssign={(doc) => handleAssignDocument(docLabel, doc)}
                  onRemove={() => handleRemoveDocument(docLabel)}
                  onView={handleViewDocument}
                  isCustom={false}
                />
              ))}
              
              {/* Custom Sections */}
              {customSections.map((sectionName) => (
                <DocumentRequirementSection
                  key={sectionName}
                  label={sectionName}
                  description={`Upload ${sectionName} document for this claim`}
                  recommended={false}
                  claimId={claimId}
                  assignedDocument={assignedDocuments[sectionName]}
                  onAssign={(doc) => handleAssignDocument(sectionName, doc)}
                  onRemove={() => handleRemoveDocument(sectionName)}
                  onView={handleViewDocument}
                  isCustom={true}
                  onRemoveSection={() => handleRemoveCustomSection(sectionName)}
                />
              ))}
            </>
          )}
          
          {/* Add Custom Section Button/Form */}
          {!showAddSection ? (
            <Button 
              variant="outline" 
              onClick={() => setShowAddSection(true)}
              className="w-full border-dashed border-2"
            >
              + Add Custom Document Section
            </Button>
          ) : (
            <Card className="border-2 border-blue-300">
              <CardContent className="pt-6">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter section name (e.g., Purchase Order)"
                    value={newSectionName}
                    onChange={(e) => setNewSectionName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCustomSection()}
                  />
                  <Button onClick={handleAddCustomSection}>Add</Button>
                  <Button variant="outline" onClick={() => {
                    setShowAddSection(false);
                    setNewSectionName("");
                  }}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Upload Link Dialog */}
      <Dialog open={uploadLinkDialogOpen} onOpenChange={setUploadLinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Link Generated</DialogTitle>
            <DialogDescription>
              Share this link with external users to upload documents. Link expires in 7 days.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg border">
              <p className="text-sm font-mono break-all">{uploadLink}</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCopyLink} className="flex-1 gap-2">
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy Link
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setUploadLinkDialogOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};