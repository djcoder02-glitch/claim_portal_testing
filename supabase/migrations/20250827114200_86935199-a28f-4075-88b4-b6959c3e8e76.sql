-- Add parent_id column to support hierarchy
ALTER TABLE public.policy_types 
ADD COLUMN parent_id UUID REFERENCES public.policy_types(id);

-- Insert main policy types
INSERT INTO public.policy_types (name, description, fields) VALUES
('Marine', 'Marine insurance policies for vessels and cargo', '[]'::jsonb),
('Engineering', 'Engineering and construction insurance', '[]'::jsonb),
('Fire', 'Fire insurance for properties and assets', '[]'::jsonb),
('Motor', 'Motor vehicle insurance policies', '[]'::jsonb),
('Miscellaneous', 'Miscellaneous insurance policies', '[]'::jsonb),
('Client', 'Client-specific insurance policies', '[]'::jsonb),
('Value Added Services', 'Additional value-added insurance services', '[]'::jsonb);

-- Insert Marine subtypes
INSERT INTO public.policy_types (name, description, parent_id, fields) 
SELECT 
  subtype.name,
  subtype.description,
  marine.id,
  subtype.fields
FROM (VALUES
  ('Container', 'Container shipping insurance', '[
    {"name": "container_number", "type": "text", "label": "Container Number", "required": true},
    {"name": "cargo_type", "type": "text", "label": "Cargo Type", "required": true},
    {"name": "route", "type": "text", "label": "Shipping Route", "required": true}
  ]'::jsonb),
  ('Import', 'Import cargo insurance', '[
    {"name": "origin_port", "type": "text", "label": "Origin Port", "required": true},
    {"name": "destination_port", "type": "text", "label": "Destination Port", "required": true},
    {"name": "cargo_value", "type": "number", "label": "Cargo Value", "required": true}
  ]'::jsonb),
  ('Export', 'Export cargo insurance', '[
    {"name": "export_port", "type": "text", "label": "Export Port", "required": true},
    {"name": "destination_country", "type": "text", "label": "Destination Country", "required": true},
    {"name": "cargo_description", "type": "textarea", "label": "Cargo Description", "required": true}
  ]'::jsonb),
  ('Demurrage', 'Demurrage and detention insurance', '[
    {"name": "vessel_name", "type": "text", "label": "Vessel Name", "required": true},
    {"name": "port_of_call", "type": "text", "label": "Port of Call", "required": true},
    {"name": "expected_delay", "type": "number", "label": "Expected Delay (days)", "required": true}
  ]'::jsonb),
  ('Inland', 'Inland marine insurance', '[
    {"name": "transport_mode", "type": "select", "label": "Transport Mode", "options": ["Truck", "Rail", "Barge"], "required": true},
    {"name": "pickup_location", "type": "text", "label": "Pickup Location", "required": true},
    {"name": "delivery_location", "type": "text", "label": "Delivery Location", "required": true}
  ]'::jsonb)
) AS subtype(name, description, fields)
CROSS JOIN (SELECT id FROM public.policy_types WHERE name = 'Marine' AND parent_id IS NULL) AS marine;

-- Insert Engineering subtypes
INSERT INTO public.policy_types (name, description, parent_id, fields) 
SELECT 
  subtype.name,
  subtype.description,
  engineering.id,
  subtype.fields
FROM (VALUES
  ('Construction', 'Construction project insurance', '[
    {"name": "project_name", "type": "text", "label": "Project Name", "required": true},
    {"name": "project_value", "type": "number", "label": "Project Value", "required": true},
    {"name": "construction_type", "type": "select", "label": "Construction Type", "options": ["Residential", "Commercial", "Industrial", "Infrastructure"], "required": true}
  ]'::jsonb),
  ('Machinery', 'Machinery breakdown insurance', '[
    {"name": "equipment_type", "type": "text", "label": "Equipment Type", "required": true},
    {"name": "equipment_value", "type": "number", "label": "Equipment Value", "required": true},
    {"name": "installation_date", "type": "date", "label": "Installation Date", "required": true}
  ]'::jsonb)
) AS subtype(name, description, fields)
CROSS JOIN (SELECT id FROM public.policy_types WHERE name = 'Engineering' AND parent_id IS NULL) AS engineering;

-- Insert Fire subtypes
INSERT INTO public.policy_types (name, description, parent_id, fields) 
SELECT 
  subtype.name,
  subtype.description,
  fire.id,
  subtype.fields
FROM (VALUES
  ('Property', 'Property fire insurance', '[
    {"name": "property_address", "type": "text", "label": "Property Address", "required": true},
    {"name": "property_type", "type": "select", "label": "Property Type", "options": ["Residential", "Commercial", "Industrial", "Warehouse"], "required": true},
    {"name": "sum_insured", "type": "number", "label": "Sum Insured", "required": true}
  ]'::jsonb),
  ('Business Interruption', 'Business interruption insurance', '[
    {"name": "business_name", "type": "text", "label": "Business Name", "required": true},
    {"name": "annual_turnover", "type": "number", "label": "Annual Turnover", "required": true},
    {"name": "indemnity_period", "type": "number", "label": "Indemnity Period (months)", "required": true}
  ]'::jsonb)
) AS subtype(name, description, fields)
CROSS JOIN (SELECT id FROM public.policy_types WHERE name = 'Fire' AND parent_id IS NULL) AS fire;

-- Update admin functions to handle hierarchy
CREATE OR REPLACE FUNCTION public.get_all_policy_types_admin()
RETURNS SETOF public.policy_types
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.policy_types ORDER BY 
    CASE WHEN parent_id IS NULL THEN name ELSE (SELECT name FROM policy_types p WHERE p.id = policy_types.parent_id) END,
    parent_id NULLS FIRST,
    name;
$$;