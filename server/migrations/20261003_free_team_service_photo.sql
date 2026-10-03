-- Apply in Supabase SQL Editor before deploying the frontend.
BEGIN;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS photo_url TEXT;
CREATE OR REPLACE FUNCTION public.enforce_free_team_limit()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE store_tier TEXT;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.tenant_code IS NOT DISTINCT FROM OLD.tenant_code THEN RETURN NEW; END IF;
  END IF;
  -- Serialize changes to the same store, including concurrent requests.
  SELECT lower(coalesce(tier, 'free')) INTO store_tier
    FROM public.tenants WHERE code = NEW.tenant_code FOR UPDATE;
  IF coalesce(store_tier, 'free') = 'free'
     AND (SELECT count(*) FROM public.users WHERE tenant_code = NEW.tenant_code) >= 1 THEN
    RAISE EXCEPTION 'Akun Free maksimal 1 anggota tim.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS free_team_limit ON public.users;
CREATE TRIGGER free_team_limit BEFORE INSERT OR UPDATE OF tenant_code ON public.users
FOR EACH ROW EXECUTE FUNCTION public.enforce_free_team_limit();
COMMIT;
