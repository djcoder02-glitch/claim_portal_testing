-- Fix security issues by setting search_path for functions

-- Update the generate_claim_number function with proper search_path
CREATE OR REPLACE FUNCTION public.generate_claim_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Update the set_claim_number function with proper search_path
CREATE OR REPLACE FUNCTION public.set_claim_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.claim_number IS NULL OR NEW.claim_number = '' THEN
        NEW.claim_number := public.generate_claim_number();
    END IF;
    RETURN NEW;
END;
$$;

-- Update the update_updated_at_column function with proper search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;