import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  FileText, 
  Image, 
  File, 
  Trash2, 
  Download,
  Plus
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface ClaimDocument {
  id: string;
  claim_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  uploaded_by: string;
  created_at: string;
  field_label?: string;
}

interface DocumentManagerProps {
  claimId: string;
}

const getFileIcon = (fileType: string) => {
  if (fileType.startsWith('image/')) return Image;
  if (fileType.includes('pdf')) return FileText;
  return File;
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const DocumentManager = ({ claimId }: DocumentManagerProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSections, setUploadSections] = useState([{ id: 1, label: 'Primary Documents' }]);
  const [editingSection, setEditingSection] = useState<number | null>(null);
  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  const queryClient = useQueryClient();

  // Fetch documents for this claim
  const { data: documents, isLoading } = useQuery({
    queryKey: ["claim-documents", claimId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("claim_documents")
        .select("*")
        .eq("claim_id", claimId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ClaimDocument[];
    },
  });

  // Upload document mutation
  const uploadDocumentMutation = useMutation({
    mutationFn: async ({ file, sectionId }: { file: File; sectionId: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Upload file to storage
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `${user.id}/${claimId}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from("claim-documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Find the section label
      const section = uploadSections.find(s => s.id === sectionId);
      const fieldLabel = section?.label || 'Document';

      // Save document record to database
      const { data, error } = await supabase
        .from("claim_documents")
        .insert({
          claim_id: claimId,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: user.id,
          field_label: fieldLabel,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["claim-documents", claimId] });
      toast.success("Document uploaded successfully!");
    },
    onError: (error) => {
      toast.error("Failed to upload document: " + error.message);
    },
  });

  // Delete document mutation
  const deleteDocumentMutation = useMutation({
    mutationFn: async (document: ClaimDocument) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("claim-documents")
        .remove([document.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error } = await supabase
        .from("claim_documents")
        .delete()
        .eq("id", document.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["claim-documents", claimId] });
      toast.success("Document deleted successfully!");
    },
    onError: (error) => {
      toast.error("Failed to delete document: " + error.message);
    },
  });

  const handleFileUpload = async (files: FileList | null, sectionId: number) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        await uploadDocumentMutation.mutateAsync({ file: files[i], sectionId });
      }
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRefs.current[sectionId]) {
        fileInputRefs.current[sectionId]!.value = '';
      }
    }
  };

  const handleDownload = async (document: ClaimDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from("claim-documents")
        .download(document.file_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const link = globalThis.document.createElement('a');
      link.href = url;
      link.download = document.file_name;
      globalThis.document.body.appendChild(link);
      link.click();
      globalThis.document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("Failed to download document");
    }
  };

  const addUploadSection = () => {
    const newId = Math.max(...uploadSections.map(s => s.id)) + 1;
    setUploadSections([...uploadSections, { id: newId, label: `Document Section ${newId}` }]);
  };

  const removeUploadSection = (sectionId: number) => {
    if (uploadSections.length > 1) {
      setUploadSections(uploadSections.filter(s => s.id !== sectionId));
    }
  };

  const updateSectionLabel = (sectionId: number, newLabel: string) => {
    setUploadSections(sections => 
      sections.map(s => s.id === sectionId ? { ...s, label: newLabel } : s)
    );
    setEditingSection(null);
  };

  // Group documents by field_label
  const groupedDocuments = documents?.reduce((acc, doc) => {
    const label = doc.field_label || 'Uncategorized';
    if (!acc[label]) acc[label] = [];
    acc[label].push(doc);
    return acc;
  }, {} as Record<string, ClaimDocument[]>) || {};

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Sections */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Upload Documents</CardTitle>
            <Button variant="outline" size="sm" onClick={addUploadSection}>
              <Plus className="w-4 h-4 mr-2" />
              Add Section
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {uploadSections.map((section) => (
            <div key={section.id} className="border rounded-lg p-4 space-y-4">
              <div className="flex justify-between items-center">
                {editingSection === section.id ? (
                  <Input
                    defaultValue={section.label}
                    onBlur={(e) => updateSectionLabel(section.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        updateSectionLabel(section.id, e.currentTarget.value);
                      } else if (e.key === 'Escape') {
                        setEditingSection(null);
                      }
                    }}
                    className="text-base font-medium"
                    autoFocus
                  />
                ) : (
                  <Label 
                    className="text-base font-medium cursor-pointer hover:text-primary"
                    onClick={() => setEditingSection(section.id)}
                  >
                    {section.label}
                  </Label>
                )}
                {uploadSections.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeUploadSection(section.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              
              <div className="flex items-center space-x-4">
                <Input
                  ref={(el) => { fileInputRefs.current[section.id] = el; }}
                  type="file"
                  multiple
                  onChange={(e) => handleFileUpload(e.target.files, section.id)}
                  disabled={isUploading}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRefs.current[section.id]?.click()}
                  disabled={isUploading}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isUploading ? "Uploading..." : "Browse"}
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground">
                Supported formats: PDF, DOC, DOCX, JPG, PNG, GIF (Max 10MB per file)
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Documents List - Grouped by Category */}
      <Card>
        <CardHeader>
          <CardTitle>Uploaded Documents ({documents?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {documents && documents.length > 0 ? (
            <div className="space-y-6">
              {Object.entries(groupedDocuments).map(([category, categoryDocs]) => (
                <div key={category} className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-semibold">{category}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {categoryDocs.length} {categoryDocs.length === 1 ? 'file' : 'files'}
                    </Badge>
                  </div>
                  <div className="space-y-2 ml-4">
                    {categoryDocs.map((document) => {
                      const FileIcon = getFileIcon(document.file_type);
                      return (
                        <div
                          key={document.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                        >
                          <div className="flex items-center space-x-3">
                            <FileIcon className="w-8 h-8 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{document.file_name}</p>
                              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                <Badge variant="outline" className="text-xs">
                                  {document.file_type}
                                </Badge>
                                <span>•</span>
                                <span>{formatFileSize(document.file_size)}</span>
                                <span>•</span>
                                <span>
                                  Uploaded {format(new Date(document.created_at), 'MMM dd, yyyy')}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(document)}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteDocumentMutation.mutate(document)}
                              disabled={deleteDocumentMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No documents uploaded</h3>
              <p className="text-muted-foreground">
                Upload supporting documents for your claim using the sections above.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};