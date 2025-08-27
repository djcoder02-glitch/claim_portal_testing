-- Create storage bucket for claim documents (if not exists)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('claim-documents', 'claim-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for claim documents
CREATE POLICY "Users can upload documents for their claims" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'claim-documents' AND 
  auth.uid()::text = (storage.foldername(name))[1] AND
  EXISTS (
    SELECT 1 FROM claims 
    WHERE claims.id::text = (storage.foldername(name))[2] 
    AND claims.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view documents for their claims" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'claim-documents' AND 
  auth.uid()::text = (storage.foldername(name))[1] AND
  EXISTS (
    SELECT 1 FROM claims 
    WHERE claims.id::text = (storage.foldername(name))[2] 
    AND claims.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete documents for their claims" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'claim-documents' AND 
  auth.uid()::text = (storage.foldername(name))[1] AND
  EXISTS (
    SELECT 1 FROM claims 
    WHERE claims.id::text = (storage.foldername(name))[2] 
    AND claims.user_id = auth.uid()
  )
);

-- Add field_label column to claim_documents table if it doesn't exist
ALTER TABLE claim_documents ADD COLUMN IF NOT EXISTS field_label TEXT DEFAULT 'Document';