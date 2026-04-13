
CREATE OR REPLACE FUNCTION public.generate_api_key()
RETURNS TEXT AS $$
BEGIN
  RETURN 'vsk_' || encode(gen_random_bytes(24), 'hex');
END;
$$ LANGUAGE plpgsql SET search_path = public;
