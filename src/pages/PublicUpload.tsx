import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { validateUploadToken } from "@/lib/uploadTokens";

export const PublicUpload = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
  const [isValidating, setIsValidating] = useState(true);
  const [tokenData, setTokenData] = useState<{ claimId: string; fieldLabel: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setIsValidating(false);
        return;
      }

      const data = await validateUploadToken(token);
      setTokenData(data);
      setIsValidating(false);
    };

    validateToken();
  }, [token]);

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setSelectedFile(files[0]);
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !tokenData || !token) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("token", token);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const functionUrl = `${supabaseUrl}/functions/v1/public-upload`;
      
      console.log("🚀 Calling function:", functionUrl);
      console.log("📦 Token:", token);
      console.log("📄 File:", selectedFile.name, selectedFile.size, "bytes");
      console.log("🌐 Supabase URL from env:", supabaseUrl);

      const response = await fetch(functionUrl, {
        method: "POST",
        body: formData,
      });

      console.log("📡 Response status:", response.status);
      console.log("📡 Response ok:", response.ok);
      console.log("📡 Response headers:", Object.fromEntries(response.headers.entries()));

      const responseText = await response.text();
      console.log("📡 Response body (raw):", responseText);

      if (!response.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { error: responseText || "Upload failed" };
        }
        console.error("❌ Error data:", errorData);
        throw new Error(errorData.error || "Upload failed");
      }

      const result = JSON.parse(responseText);
      console.log("✅ Success result:", result);
      
      setUploadSuccess(true);
      setSelectedFile(null);
      toast.success("Document uploaded successfully!");
    } catch (error: any) {
      console.error("❌ Upload error:", error);
      console.error("❌ Error stack:", error.stack);
      toast.error("Upload failed: " + error.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Loading state
  if (isValidating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Validating upload link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invalid token
  if (!token || !tokenData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-2 border-red-200">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-red-600">Invalid Upload Link</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              This upload link is invalid or has expired. Please contact the administrator for a new link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (uploadSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-2 border-green-200">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-green-600">Upload Successful!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-muted-foreground">
              Your document has been uploaded successfully. You can close this window now or upload another file.
            </p>
            <Button 
              onClick={() => {
                setUploadSuccess(false);
                setSelectedFile(null);
              }} 
              variant="outline" 
              className="w-full"
            >
              Upload Another File
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Upload form
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">Upload Document</CardTitle>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <span>Document Type:</span>
            <span className="font-semibold text-primary">{tokenData.fieldLabel}</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* File input */}
            <Input
              ref={fileInputRef}
              type="file"
              onChange={(e) => handleFileSelect(e.target.files)}
              disabled={isUploading}
              className="hidden"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
            />
            
            {/* Selected file display */}
            {selectedFile && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                variant="outline"
                className="flex-1"
              >
                Choose File
              </Button>
              <Button
                onClick={handleFileUpload}
                disabled={isUploading || !selectedFile}
                className="flex-1"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Supported: PDF, Word, Images (Max 10MB)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
