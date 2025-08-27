-- Add DELETE policy for claim_documents table
-- Users should be able to delete documents from their own claims
CREATE POLICY "Users can delete documents from their claims" 
ON claim_documents 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1
    FROM claims
    WHERE claims.id = claim_documents.claim_id 
    AND claims.user_id = auth.uid()
  )
);