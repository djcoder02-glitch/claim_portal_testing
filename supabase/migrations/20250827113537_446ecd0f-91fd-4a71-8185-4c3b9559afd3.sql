-- Create admin helper function to bypass RLS for policy types
CREATE OR REPLACE FUNCTION public.get_all_policy_types_admin()
RETURNS SETOF public.policy_types
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.policy_types ORDER BY name;
$$;

-- Create admin helper function to bypass RLS for claims
CREATE OR REPLACE FUNCTION public.get_all_claims_admin()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  policy_type_id uuid,
  claim_number text,
  title text,
  description text,
  status text,
  claim_amount numeric,
  form_data jsonb,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  policy_type_name text,
  policy_type_description text,
  policy_type_fields jsonb
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.*,
    pt.name as policy_type_name,
    pt.description as policy_type_description,
    pt.fields as policy_type_fields
  FROM public.claims c
  LEFT JOIN public.policy_types pt ON c.policy_type_id = pt.id
  ORDER BY c.created_at DESC;
$$;