import { useState } from "react";
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
        .eq('uploaded_via_link', true)
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
    toast.success(`Document assigned to ${section}`);
  };

  // Remove document from section
  const handleRemoveDocument = (section: string) => {
    setAssignedDocuments(prev => {
      const newDocs = { ...prev };
      delete newDocs[section];
      return newDocs;
    });
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
      const result = await uploadDocument(file, claimId, "Claim Admin");

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
          field_label: "Uploaded by: Claim Admin (Creator)", // CHANGED: Shows in grid
          metadata: {
            uploader_name: "Claim Admin (Creator)", // CHANGED: Shows in card
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
              documents={documents}
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
          {requiredDocuments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No document requirements defined for this policy type.
            </div>
          ) : (
            requiredDocuments.map((docLabel: string, index: number) => (
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
              />
            ))
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