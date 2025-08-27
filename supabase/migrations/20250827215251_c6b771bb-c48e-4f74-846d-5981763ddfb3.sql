-- Create user-specific claims function that respects RLS
CREATE OR REPLACE FUNCTION public.get_user_claims()
RETURNS TABLE(id uuid, user_id uuid, policy_type_id uuid, claim_number text, title text, description text, status text, claim_amount numeric, form_data jsonb, created_at timestamp with time zone, updated_at timestamp with time zone, policy_type_name text, policy_type_description text, policy_type_fields jsonb)
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT 
    c.*,
    pt.name as policy_type_name,
    pt.description as policy_type_description,
    pt.fields as policy_type_fields
  FROM public.claims c
  LEFT JOIN public.policy_types pt ON c.policy_type_id = pt.id
  WHERE c.user_id = auth.uid()
  ORDER BY c.created_at DESC;
$$;