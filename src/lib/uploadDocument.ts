const API_BASE_URL = "https://mlkkk63swrqairyiahlk357sui0argkn.lambda-url.ap-south-1.on.aws";

export interface UploadDocumentResponse {
  success: boolean;
  url: string;
  fileName: string;
}

export const uploadDocument = async (
  file: File,
  claimId: string,
  uploaderName: string
): Promise<UploadDocumentResponse> => {
  const formData = new FormData();
  formData.append("file", file);
  // Add metadata as separate fields
  formData.append("claimId", claimId);
  formData.append("uploaderName", uploaderName);

  console.log("Uploading document:", {
    fileName: file.name,
    fileSize: file.size,
    claimId,
    uploaderName
  });

  const response = await fetch(`${API_BASE_URL}/upload-doc`, {
    method: "POST",
    body: formData,
  });

  console.log("Upload response status:", response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Upload failed:", errorText);
    throw new Error(errorText || "Upload failed");
  }

  const result = await response.json();
  console.log("Upload success:", result);
  
  return {
    success: true,
    url: result.url || result.fileUrl,
    fileName: result.fileName || file.name
  };
};