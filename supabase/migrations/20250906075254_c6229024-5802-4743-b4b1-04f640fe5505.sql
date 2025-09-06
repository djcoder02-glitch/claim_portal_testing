-- Update the specific claim to remove all custom fields with numeric IDs
UPDATE claims 
SET form_data = (
  SELECT jsonb_object_agg(key, value)
  FROM jsonb_each(form_data)
  WHERE key NOT LIKE 'custom_%'
    AND key NOT IN ('custom_fields_metadata', 'hidden_fields')
) || 
jsonb_build_object(
  'custom_fields_metadata', '[]'::jsonb,
  'hidden_fields', '[]'::jsonb
)
WHERE id = 'ab4e6bf4-4760-41d5-a783-a48c54cc6e02';