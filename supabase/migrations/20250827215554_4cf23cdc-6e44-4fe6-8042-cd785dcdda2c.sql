-- Create trigger to automatically set claim number on insert
CREATE TRIGGER set_claim_number_trigger
  BEFORE INSERT ON public.claims
  FOR EACH ROW
  EXECUTE FUNCTION public.set_claim_number();