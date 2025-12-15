import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, CheckCircle2, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Tables } from "@/integrations/supabase/types";
import { useQuery } from "@tanstack/react-query";

type ClaimDocumentRow = Tables<'claim_documents'>;

interface SelectiveDocumentExtractorProps {
  claimId: string;
  documentLabel: string; // e.g., "Policy Document", "Invoice", etc.
  documentTitle: string; // Display title
  policyTypeId: string; // ADD THIS - to fetch parsing config
  documentDescription: string; // Description text
  onDataExtracted: (data: Record<string, any>) => void; // Callback when data is extracted
}

export const SelectiveDocumentExtractor = ({
  claimId,
  documentLabel,
  documentTitle,
  documentDescription,
  policyTypeId,
  onDataExtracted,
}: SelectiveDocumentExtractorProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [uploadedDocument, setUploadedDocument] = useState<ClaimDocumentRow | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();

  const { data: parsingConfig } = useQuery({
    queryKey: ["parsing-config", policyTypeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("policy_types")
        .select("parsing_config")
        .eq("id", policyTypeId)
        .single();
      
      if (error) throw error;
      return data?.parsing_config;
    },
    enabled: !!policyTypeId,
  });

  // Determine fields to extract based on document type
  const fieldsToExtract = documentLabel === "Bill of Entry"
    ? (parsingConfig?.bill_of_entry || [])
    : (parsingConfig?.policy_document || []);

  // Load existing document on mount
  useEffect(() => {
    const loadExistingDocument = async () => {
      if (!claimId) return;

      try {
        const { data: documents, error } = await supabase
          .from('claim_documents')
          .select('*')
          .eq('claim_id', claimId)
          .eq('field_label', documentLabel)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.error('Error loading documents:', error);
          return;
        }

        if (documents && documents.length > 0) {
          setUploadedDocument(documents[0]);
        }
      } catch (error) {
        console.error('Failed to load existing documents:', error);
      }
    };

    loadExistingDocument();
  }, [claimId, documentLabel]);

  // Upload document mutation
  const uploadDocumentMutation = useMutation<ClaimDocumentRow, Error, File>({
    mutationFn: async (file: File): Promise<ClaimDocumentRow> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `${user.id}/${claimId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("claim-documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data, error } = await supabase
        .from("claim_documents")
        .insert({
          claim_id: claimId,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: user.id,
          field_label: documentLabel,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data: ClaimDocumentRow) => {
      queryClient.invalidateQueries({ queryKey: ["claim-documents", claimId] });
      setUploadedDocument(data);
      toast.success(`${documentTitle} uploaded successfully!`);
    },
    onError: (error) => {
      toast.error(`Failed to upload ${documentTitle}: ${error.message}`);
    },
  });

  // Extract data mutation
  const extractDataMutation = useMutation({
    mutationFn: async (documentData: ClaimDocumentRow) => {
      const { data: fileData, error } = await supabase.storage
        .from('claim-documents')
        .download(documentData.file_path);

      if (error) throw new Error(`Failed to download file: ${error.message}`);

      const arrayBuffer = await fileData.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      let binary = '';
      for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      const base64Data = btoa(binary);

      // Call your backend API with the fields to extract
      const response = await fetch('https://reports-backend-48dg.onrender.com/extract-selective-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfData: base64Data,
          claimId: claimId,
          fieldsToExtract: fieldsToExtract, // Send the specific fields
          documentType: documentLabel // Optional: helps backend identify document type
        })
      });

      if (!response.ok) throw new Error('Extraction failed');
      return response.json();
    },
    onSuccess: (result) => {
      if (result.success && result.extractedData) {
        onDataExtracted(result.extractedData);
        toast.success(`Successfully extracted ${Object.keys(result.extractedData).length} fields!`);
      } else {
        toast.error("Extraction failed: " + (result.message || "Unknown error"));
      }
    },
    onError: (error) => {
      toast.error("Failed to extract data: " + error.message);
    },
  });

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      await uploadDocumentMutation.mutateAsync(files[0]);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleExtractData = async () => {
    if (!uploadedDocument) return;

    setIsExtracting(true);
    try {
      await extractDataMutation.mutateAsync(uploadedDocument);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleReUpload = () => {
    setUploadedDocument(null);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <Card className="bg-white/95 backdrop-blur-sm border border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-lg">
          <FileText className="w-5 h-5" />
          <span>{documentTitle}</span>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {documentDescription}
        </p>
      </CardHeader>
      <CardContent>
        {!uploadedDocument ? (
          <div className="border-2 border-dashed rounded-lg p-4 text-center space-y-3">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => handleFileUpload(e.target.files)}
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
                <span className="text-sm font-medium">{uploadedDocument.file_name}</span>
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
                {isExtracting ? "Extracting..." : "Extract Data"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};