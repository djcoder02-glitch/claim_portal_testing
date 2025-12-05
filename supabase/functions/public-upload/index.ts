import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== PUBLIC UPLOAD START ===");
    
    // Check environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    console.log("SUPABASE_URL:", supabaseUrl);
    console.log("SERVICE_ROLE_KEY exists:", !!supabaseKey);
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing environment variables");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const token = formData.get("token") as string;

    console.log("Received file:", file?.name, "size:", file?.size);
    console.log("Received token:", token);

    if (!file || !token) {
      return new Response(
        JSON.stringify({ error: "Missing file or token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate token
    console.log("Validating token...");
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from("claim_documents")
      .select("claim_id, field_label, token_expires_at")
      .eq("upload_token", token)
      .like("file_name", "__TOKEN_PLACEHOLDER_%")
      .maybeSingle();

    console.log("Token validation result:", { tokenData, tokenError });

    if (tokenError) {
      console.error("Token validation error:", tokenError);
      return new Response(
        JSON.stringify({ error: "Token validation failed" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!tokenData) {
      console.error("Token not found");
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiry
    const expiresAt = new Date(tokenData.token_expires_at);
    if (expiresAt < new Date()) {
      console.error("Token expired");
      return new Response(
        JSON.stringify({ error: "Token has expired" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: "File size exceeds 10MB limit" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upload to storage
    console.log("Uploading to storage...");
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = `public-uploads/${tokenData.claim_id}/${token}/${fileName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("claim-documents")
      .upload(filePath, file, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: "Failed to upload file: " + uploadError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("File uploaded successfully to:", filePath);

    // Create document record (without upload_token to avoid unique constraint)
    console.log("Creating document record...");
    const insertData = {
      claim_id: tokenData.claim_id,
      file_name: file.name,
      file_path: filePath,
      file_type: file.type,
      file_size: file.size,
      uploaded_by: "00000000-0000-0000-0000-000000000000",
      field_label: tokenData.field_label,
      uploaded_via_link: true,
      is_selected: false,
    };
    
    console.log("Insert data:", insertData);

    const { data: insertedDoc, error: dbError } = await supabaseAdmin
      .from("claim_documents")
      .insert(insertData)
      .select()
      .single();

    if (dbError) {
      console.error("DB error:", dbError);
      // Cleanup: delete uploaded file
      await supabaseAdmin.storage.from("claim-documents").remove([filePath]);
      
      return new Response(
        JSON.stringify({ error: "Failed to save document record: " + dbError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Document record created:", insertedDoc);
    console.log("=== PUBLIC UPLOAD SUCCESS ===");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "File uploaded successfully",
        document: insertedDoc 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error: " + (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
