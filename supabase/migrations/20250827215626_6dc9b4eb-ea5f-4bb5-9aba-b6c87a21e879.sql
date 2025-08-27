-- Fix the claim number generation function to handle race conditions better
CREATE OR REPLACE FUNCTION public.generate_claim_number()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
    new_number TEXT;
    year_part TEXT;
    sequence_num INTEGER;
    max_attempts INTEGER := 10;
    attempt_count INTEGER := 0;
BEGIN
    year_part := TO_CHAR(NOW(), 'YYYY');
    
    LOOP
        -- Get the next sequence number with better handling
        SELECT COALESCE(MAX(
            CASE 
                WHEN claim_number ~ ('^CLM' || year_part || '[0-9]{4}$') THEN 
                    CAST(SUBSTRING(claim_number FROM 8) AS INTEGER)
                ELSE 0
            END
        ), 0) + 1
        INTO sequence_num
        FROM public.claims
        WHERE claim_number LIKE 'CLM' || year_part || '%';
        
        new_number := 'CLM' || year_part || LPAD(sequence_num::TEXT, 4, '0');
        
        -- Check if this number already exists (race condition protection)
        IF NOT EXISTS (SELECT 1 FROM public.claims WHERE claim_number = new_number) THEN
            RETURN new_number;
        END IF;
        
        attempt_count := attempt_count + 1;
        IF attempt_count >= max_attempts THEN
            -- Fallback to timestamp-based generation
            new_number := 'CLM' || year_part || LPAD(EXTRACT(EPOCH FROM NOW())::INTEGER % 10000, 4, '0');
            RETURN new_number;
        END IF;
        
        -- Small delay to avoid tight loop
        PERFORM pg_sleep(0.01);
    END LOOP;
END;
$$;