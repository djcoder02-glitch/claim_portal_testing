-- Create storage bucket for claim documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('claim-documents', 'claim-documents', false);

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

-- Add a field to store custom document field labels
ALTER TABLE claim_documents ADD COLUMN field_label TEXT DEFAULT 'Document';