import React, { useState, useRef, useEffect } from "react";
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

interface ParsingConfig {
  bill_of_entry?: string[];
  policy_document?: string[];
}


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

  const { data: parsingConfig } = useQuery<ParsingConfig | null>({
    queryKey: ["parsing-config", policyTypeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("policy_types")
        .select("parsing_config")
        .eq("id", policyTypeId)
        .single();
      
      if (error) throw error;
      return (data?.parsing_config as ParsingConfig) || null;
    },
    enabled: !!policyTypeId,
  });
  

  const fieldsToExtract: string[] = React.useMemo(() => {
    if (!parsingConfig) {
      console.log(`📋 [${documentLabel}] No parsing config loaded yet`);
      return [];
    }
    
    const fields = documentLabel === "Bill of Entry"
      ? (parsingConfig.bill_of_entry || [])
      : (parsingConfig.policy_document || []);
    
    console.log(`📋 [${documentLabel}] Parsing config loaded:`, parsingConfig);
    console.log(`📋 [${documentLabel}] Fields to extract (${fields.length}):`, fields);
    
    return fields;
  }, [parsingConfig, documentLabel]);


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

// Extract data mutation with timeout
  const extractDataMutation = useMutation({
    mutationFn: async (documentData: ClaimDocumentRow) => {
      // Create extraction promise
      const extractionPromise = (async () => {
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

         // ADD THESE LOGS
        console.log(`🚀 [${documentLabel}] Sending to backend:`, {
          fieldsCount: fieldsToExtract.length,
          fields: fieldsToExtract,
          documentType: documentLabel
        });

        // Call your backend API with the fields to extract
        const response = await fetch('https://mlkkk63swrqairyiahlk357sui0argkn.lambda-url.ap-south-1.on.aws/extract-selective-fields', {
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
      })(); // Close extractionPromise

      // Create timeout promise (180 seconds)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Extraction timeout after 180 seconds. Try with fewer fields (currently ${fieldsToExtract.length} fields).`)), 180000)
      );

      // Race between extraction and timeout
      return await Promise.race([extractionPromise, timeoutPromise]);
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

    // Validate that fields are configured
    if (!fieldsToExtract || fieldsToExtract.length === 0) {
      toast.error(`No fields configured for ${documentLabel}. Please configure fields in Admin Settings → Parsing Config.`);
      return;
    }

    console.log(`🔍 Extracting ${fieldsToExtract.length} fields from ${documentLabel}:`, fieldsToExtract);

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
                disabled={isExtracting || !fieldsToExtract || fieldsToExtract.length === 0}
                size="sm"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                title={(!fieldsToExtract || fieldsToExtract.length === 0) ? "No fields configured. Go to Settings → Parsing Config" : ""}
              >
                {isExtracting 
                  ? `Extracting fields...` 
                  : `Extract Data fields`
                }
              </Button>

            </div>

            {/* Info about field count and performance */}
            {fieldsToExtract && fieldsToExtract.length > 15 && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <span className="text-blue-600 text-sm">ℹ️</span>
                  <div className="flex-1">
                    <p className="text-xs text-blue-800 font-medium">
                      Extracting fields
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      Large extractions may take 30-60 seconds. Consider reducing to 8-10 fields for faster results.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Warning when no fields configured */}
            {(!fieldsToExtract || fieldsToExtract.length === 0) && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <span className="text-yellow-600 text-sm">⚠️</span>
                  <div className="flex-1">
                    <p className="text-xs text-yellow-800 font-medium">
                      No fields configured for {documentLabel}
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Go to <strong>Settings → Parsing Config</strong> to configure which fields should be extracted.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};