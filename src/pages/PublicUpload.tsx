import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, CheckCircle, XCircle, Loader2, Trash2 } from "lucide-react";
import { validateBatchUploadToken, saveUploadedDocument } from "@/lib/uploadTokens";
import { uploadDocument } from "@/lib/uploadDocument";
import { toast } from "sonner";

interface UploadedFile {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  url?: string;
  error?: string;
}

export const PublicUpload = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [claimId, setClaimId] = useState<string>("");
  const [uploaderName, setUploaderName] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const checkToken = async () => {
      if (!token) {
        setTokenValid(false);
        return;
      }

      const result = await validateBatchUploadToken(token);
      if (result) {
        setTokenValid(true);
        setClaimId(result.claimId);
      } else {
        setTokenValid(false);
      }
    };

    checkToken();
  }, [token]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    if (files.length + selectedFiles.length > 10) {
      toast.error("Maximum 10 files allowed");
      return;
    }

    const newFiles: UploadedFile[] = selectedFiles.map(file => ({
      file,
      status: 'pending'
    }));

    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
  if (!uploaderName.trim()) {
    toast.error("Please enter your name");
    return;
  }

  if (files.length === 0) {
    toast.error("Please select at least one file");
    return;
  }

  setIsUploading(true);

  for (let i = 0; i < files.length; i++) {
    const fileData = files[i];
    
    if (fileData.status === 'success') continue;

    setFiles(prev => prev.map((f, idx) => 
      idx === i ? { ...f, status: 'uploading' as const } : f
    ));

    try {
      console.log(`Uploading file ${i + 1}/${files.length}:`, fileData.file.name);

      // CHANGED: Removed token parameter
      const result = await uploadDocument(
        fileData.file,
        claimId,
        uploaderName
      );

      console.log("Upload result:", result);

      // Save to database with the AWS S3 URL
      await saveUploadedDocument(
        claimId,
        fileData.file.name,
        result.url, // CHANGED: use result.url instead of result.fileUrl
        fileData.file.size,
        uploaderName,
        token!
      );

      setFiles(prev => prev.map((f, idx) => 
        idx === i ? { ...f, status: 'success' as const, url: result.url } : f
      ));

      toast.success(`${fileData.file.name} uploaded successfully`);
    } catch (error) {
      console.error("Upload error:", error);
      
      setFiles(prev => prev.map((f, idx) => 
        idx === i ? { 
          ...f, 
          status: 'error' as const, 
          error: error instanceof Error ? error.message : 'Upload failed' 
        } : f
      ));

      toast.error(`Failed to upload ${fileData.file.name}`);
    }
  }

  setIsUploading(false);
  
  const successCount = files.filter(f => f.status === 'success').length;
  if (successCount === files.length) {
    toast.success(`All ${successCount} files uploaded successfully!`);
  }
};


  if (tokenValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (tokenValid === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Invalid or Expired Link</h1>
            <p className="text-gray-600">
              This upload link is invalid or has expired. Please contact the administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Upload className="w-8 h-8 text-blue-600" />
              <div>
                <CardTitle className="text-2xl">Document Upload</CardTitle>
                <p className="text-sm text-gray-600">Upload up to 10 documents at once</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="name">Your Name *</Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={uploaderName}
                onChange={(e) => setUploaderName(e.target.value)}
                disabled={isUploading}
              />
            </div>
          </CardContent>
        </Card>

        {/* File Upload Area */}
        <Card>
          <CardContent className="p-6">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
              <input
                type="file"
                id="file-upload"
                multiple
                onChange={handleFileSelect}
                disabled={isUploading || files.length >= 10}
                className="hidden"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx"
              />
              <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                <Upload className="w-12 h-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-700 mb-2">
                  Click to select files
                </p>
                <p className="text-sm text-gray-500">
                  Maximum 10 files • PDF, DOC, XLS, Images
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  {files.length} / 10 files selected
                </p>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Selected Files */}
        {files.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Selected Files</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {files.map((fileData, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="w-5 h-5 text-gray-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{fileData.file.name}</p>
                        <p className="text-xs text-gray-500">
                          {(fileData.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {fileData.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFile(index)}
                          disabled={isUploading}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      )}
                      {fileData.status === 'uploading' && (
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                      )}
                      {fileData.status === 'success' && (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      )}
                      {fileData.status === 'error' && (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upload Button */}
        {files.length > 0 && (
          <Button
            onClick={handleUpload}
            disabled={isUploading || !uploaderName.trim()}
            size="lg"
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Uploading {files.filter(f => f.status === 'success').length} / {files.length}...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 mr-2" />
                Upload {files.length} {files.length === 1 ? 'File' : 'Files'}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};
