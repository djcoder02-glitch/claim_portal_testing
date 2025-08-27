-- Insert default policy types
INSERT INTO public.policy_types (name, description, fields) VALUES
('Marine', 'Marine insurance policies for vessels and cargo', '[
  {"name": "vessel_name", "type": "text", "label": "Vessel Name", "required": true},
  {"name": "vessel_type", "type": "select", "label": "Vessel Type", "options": ["Cargo Ship", "Tanker", "Container Ship", "Bulk Carrier"], "required": true},
  {"name": "voyage_details", "type": "textarea", "label": "Voyage Details", "required": true}
]'::jsonb),

('Engineering', 'Engineering and construction insurance', '[
  {"name": "project_name", "type": "text", "label": "Project Name", "required": true},
  {"name": "project_value", "type": "number", "label": "Project Value", "required": true},
  {"name": "construction_type", "type": "select", "label": "Construction Type", "options": ["Residential", "Commercial", "Industrial", "Infrastructure"], "required": true}
]'::jsonb),

('Fire', 'Fire insurance for properties and assets', '[
  {"name": "property_address", "type": "text", "label": "Property Address", "required": true},
  {"name": "property_type", "type": "select", "label": "Property Type", "options": ["Residential", "Commercial", "Industrial", "Warehouse"], "required": true},
  {"name": "sum_insured", "type": "number", "label": "Sum Insured", "required": true}
]'::jsonb),

('Miscellaneous', 'Miscellaneous insurance policies', '[
  {"name": "policy_details", "type": "textarea", "label": "Policy Details", "required": true},
  {"name": "coverage_type", "type": "text", "label": "Coverage Type", "required": true}
]'::jsonb),

('Value Added Services', 'Additional value-added insurance services', '[
  {"name": "service_type", "type": "text", "label": "Service Type", "required": true},
  {"name": "service_description", "type": "textarea", "label": "Service Description", "required": true}
]'::jsonb),

('Client', 'Client-specific insurance policies', '[
  {"name": "client_name", "type": "text", "label": "Client Name", "required": true},
  {"name": "client_type", "type": "select", "label": "Client Type", "options": ["Individual", "Corporate", "Government"], "required": true},
  {"name": "special_requirements", "type": "textarea", "label": "Special Requirements", "required": false}
]'::jsonb);

-- Update RLS policies to allow admin management
CREATE POLICY "Admin can manage policy types" 
ON public.policy_types 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);