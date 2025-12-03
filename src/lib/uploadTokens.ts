import { supabase } from "@/integrations/supabase/client";

export interface UploadTokenData {
  token: string;
  claimId: string;
  fieldLabel: string;
  expiresAt: Date;
  uploadUrl: string;
}

/**
 * Generate a shareable upload token for external users
 * @param claimId - The claim ID
 * @param fieldLabel - Document type label (e.g., "Invoice", "Bill of Entry")
 * @param expiryDays - Number of days until token expires (default: 7)
 */
export const generateUploadToken = async (
  claimId: string,
  fieldLabel: string,
  expiryDays: number = 7
): Promise<UploadTokenData> => {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  // Create a placeholder record with the token
  // This will be used to validate uploads later
  const { error } = await supabase
    .from("claim_documents")
    .insert({
      claim_id: claimId,
      file_name: `__TOKEN_PLACEHOLDER_${token}__`,
      file_path: `__TOKEN_PLACEHOLDER_${token}__`,
      file_type: "application/token-placeholder",
      file_size: 0,
      uploaded_by: user.id,
      field_label: fieldLabel,
      upload_token: token,
      token_expires_at: expiresAt.toISOString(),
      uploaded_via_link: false, // This is just the token record
      is_selected: false,
    });

  if (error) throw error;

  const uploadUrl = `${window.location.origin}/public-upload?token=${token}`;

  return {
    token,
    claimId,
    fieldLabel,
    expiresAt,
    uploadUrl,
  };
};

/**
 * Validate an upload token
 * @param token - The upload token to validate
 * @returns Token data if valid, null if invalid or expired
 */
export const validateUploadToken = async (token: string) => {
  if (!token) return null;

  const { data, error } = await supabase
    .from("claim_documents")
    .select("claim_id, field_label, token_expires_at")
    .eq("upload_token", token)
    .like("file_name", "__TOKEN_PLACEHOLDER_%")
    .single();

  if (error || !data) {
    console.error("Token validation error:", error);
    return null;
  }

  // Check if token is expired
  const expiresAt = new Date(data.token_expires_at!);
  if (expiresAt < new Date()) {
    console.log("Token expired");
    return null;
  }

  return {
    claimId: data.claim_id,
    fieldLabel: data.field_label,
  };
};

/**
 * Get public URL for a document
 * @param filePath - The file path in storage
 */
export const getDocumentPublicUrl = (filePath: string): string => {
  const { data } = supabase.storage
    .from("claim-documents")
    .getPublicUrl(filePath);
  
  return data.publicUrl;
};