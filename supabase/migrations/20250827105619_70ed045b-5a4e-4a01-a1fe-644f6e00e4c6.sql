-- Create policy types table
CREATE TABLE public.policy_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  fields JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create claims table
CREATE TABLE public.claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  policy_type_id UUID NOT NULL REFERENCES public.policy_types(id),
  claim_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'paid')),
  claim_amount DECIMAL(12,2),
  form_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create claim documents table
CREATE TABLE public.claim_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create report sections table for dynamic layouts
CREATE TABLE public.report_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  section_name TEXT NOT NULL,
  section_order INTEGER NOT NULL DEFAULT 0,
  content JSONB DEFAULT '{}'::jsonb,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.policy_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_sections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for policy_types (readable by all authenticated users)
CREATE POLICY "Policy types are viewable by authenticated users" 
ON public.policy_types 
FOR SELECT 
TO authenticated
USING (true);

-- RLS Policies for claims (users can only see their own claims)
CREATE POLICY "Users can view their own claims" 
ON public.claims 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own claims" 
ON public.claims 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own claims" 
ON public.claims 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

-- RLS Policies for claim_documents
CREATE POLICY "Users can view documents for their claims" 
ON public.claim_documents 
FOR SELECT 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.claims 
  WHERE claims.id = claim_documents.claim_id 
  AND claims.user_id = auth.uid()
));

CREATE POLICY "Users can upload documents for their claims" 
ON public.claim_documents 
FOR INSERT 
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.claims 
  WHERE claims.id = claim_documents.claim_id 
  AND claims.user_id = auth.uid()
) AND auth.uid() = uploaded_by);

-- RLS Policies for report_sections
CREATE POLICY "Users can view report sections for their claims" 
ON public.report_sections 
FOR SELECT 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.claims 
  WHERE claims.id = report_sections.claim_id 
  AND claims.user_id = auth.uid()
));

CREATE POLICY "Users can manage report sections for their claims" 
ON public.report_sections 
FOR ALL 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.claims 
  WHERE claims.id = report_sections.claim_id 
  AND claims.user_id = auth.uid()
));

-- Create function to generate claim numbers
CREATE OR REPLACE FUNCTION public.generate_claim_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    new_number TEXT;
    year_part TEXT;
    sequence_num INTEGER;
BEGIN
    year_part := TO_CHAR(NOW(), 'YYYY');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(claim_number FROM 6) AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM public.claims
    WHERE claim_number LIKE 'CLM' || year_part || '%';
    
    new_number := 'CLM' || year_part || LPAD(sequence_num::TEXT, 4, '0');
    
    RETURN new_number;
END;
$$;

-- Create trigger to auto-generate claim numbers
CREATE OR REPLACE FUNCTION public.set_claim_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.claim_number IS NULL OR NEW.claim_number = '' THEN
        NEW.claim_number := public.generate_claim_number();
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER set_claim_number_trigger
    BEFORE INSERT ON public.claims
    FOR EACH ROW
    EXECUTE FUNCTION public.set_claim_number();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_policy_types_updated_at
    BEFORE UPDATE ON public.policy_types
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_claims_updated_at
    BEFORE UPDATE ON public.claims
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_report_sections_updated_at
    BEFORE UPDATE ON public.report_sections
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample policy types
INSERT INTO public.policy_types (name, description, fields) VALUES 
('Auto Insurance', 'Motor vehicle insurance claims', '[
  {"name": "vehicle_make", "label": "Vehicle Make", "type": "text", "required": true},
  {"name": "vehicle_model", "label": "Vehicle Model", "type": "text", "required": true},
  {"name": "vehicle_year", "label": "Vehicle Year", "type": "number", "required": true},
  {"name": "license_plate", "label": "License Plate", "type": "text", "required": true},
  {"name": "incident_date", "label": "Incident Date", "type": "date", "required": true},
  {"name": "incident_location", "label": "Incident Location", "type": "text", "required": true},
  {"name": "damage_description", "label": "Damage Description", "type": "textarea", "required": true},
  {"name": "police_report", "label": "Police Report Number", "type": "text", "required": false}
]'),
('Health Insurance', 'Medical and health insurance claims', '[
  {"name": "patient_name", "label": "Patient Name", "type": "text", "required": true},
  {"name": "date_of_service", "label": "Date of Service", "type": "date", "required": true},
  {"name": "provider_name", "label": "Healthcare Provider", "type": "text", "required": true},
  {"name": "diagnosis", "label": "Diagnosis", "type": "text", "required": true},
  {"name": "treatment", "label": "Treatment Received", "type": "textarea", "required": true},
  {"name": "total_cost", "label": "Total Cost", "type": "number", "required": true},
  {"name": "prescription", "label": "Prescriptions", "type": "textarea", "required": false}
]'),
('Property Insurance', 'Home and property insurance claims', '[
  {"name": "property_address", "label": "Property Address", "type": "text", "required": true},
  {"name": "incident_date", "label": "Incident Date", "type": "date", "required": true},
  {"name": "cause_of_damage", "label": "Cause of Damage", "type": "select", "options": ["Fire", "Water", "Storm", "Theft", "Vandalism", "Other"], "required": true},
  {"name": "damage_description", "label": "Damage Description", "type": "textarea", "required": true},
  {"name": "estimated_cost", "label": "Estimated Repair Cost", "type": "number", "required": true},
  {"name": "emergency_repairs", "label": "Emergency Repairs Needed", "type": "checkbox", "required": false}
]'),
('Life Insurance', 'Life insurance claims', '[
  {"name": "policyholder_name", "label": "Policyholder Name", "type": "text", "required": true},
  {"name": "beneficiary_name", "label": "Beneficiary Name", "type": "text", "required": true},
  {"name": "date_of_death", "label": "Date of Death", "type": "date", "required": true},
  {"name": "cause_of_death", "label": "Cause of Death", "type": "text", "required": true},
  {"name": "death_certificate", "label": "Death Certificate Number", "type": "text", "required": true},
  {"name": "relationship", "label": "Relationship to Deceased", "type": "text", "required": true}
]');

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('claim-documents', 'claim-documents', false);

-- Create storage policies
CREATE POLICY "Users can view their claim documents" 
ON storage.objects 
FOR SELECT 
TO authenticated
USING (bucket_id = 'claim-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their claim documents" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'claim-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their claim documents" 
ON storage.objects 
FOR UPDATE 
TO authenticated
USING (bucket_id = 'claim-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their claim documents" 
ON storage.objects 
FOR DELETE 
TO authenticated
USING (bucket_id = 'claim-documents' AND auth.uid()::text = (storage.foldername(name))[1]);