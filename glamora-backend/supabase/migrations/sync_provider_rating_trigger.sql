-- Migration: Replace client-side provider rating recalculation with a DB trigger.
--
-- Previously: ReviewModal fetched all reviews, averaged them client-side, and wrote
-- the result back. Two concurrent reviews would both read the same baseline and one
-- update would silently overwrite the other, permanently corrupting the average.
--
-- Now: This AFTER trigger runs inside the same transaction as the INSERT/UPDATE/DELETE
-- on reviews, so the recalculated average is always consistent with the actual rows.

CREATE OR REPLACE FUNCTION public.sync_provider_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_provider_id uuid;
  v_avg         numeric;
  v_count       int;
BEGIN
  -- Works for INSERT (NEW), DELETE (OLD), and UPDATE (both)
  v_provider_id := COALESCE(NEW.provider_id, OLD.provider_id);

  SELECT AVG(rating), COUNT(*)
  INTO   v_avg, v_count
  FROM   public.reviews
  WHERE  provider_id = v_provider_id;

  UPDATE public.provider_profiles
  SET    rating       = ROUND(COALESCE(v_avg, 0)::numeric, 2),
         total_reviews = COALESCE(v_count, 0)
  WHERE  id = v_provider_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS reviews_sync_provider_rating ON public.reviews;
CREATE TRIGGER reviews_sync_provider_rating
AFTER INSERT OR UPDATE OF rating OR DELETE
ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.sync_provider_rating();

-- Back-fill: recalculate all providers in case existing data is already out of sync
UPDATE public.provider_profiles pp
SET
  rating        = ROUND(COALESCE(sub.avg_rating, 0)::numeric, 2),
  total_reviews = COALESCE(sub.cnt, 0)
FROM (
  SELECT provider_id,
         AVG(rating) AS avg_rating,
         COUNT(*)    AS cnt
  FROM   public.reviews
  GROUP  BY provider_id
) sub
WHERE pp.id = sub.provider_id;
