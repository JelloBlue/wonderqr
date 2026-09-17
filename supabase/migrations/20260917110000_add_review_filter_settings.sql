ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS review_filter_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS review_min_rating integer NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS review_filter_locked boolean NOT NULL DEFAULT false;

ALTER TABLE public.businesses
  DROP CONSTRAINT IF EXISTS businesses_review_min_rating_check;

ALTER TABLE public.businesses
  ADD CONSTRAINT businesses_review_min_rating_check
  CHECK (review_min_rating IN (4, 5));

UPDATE public.businesses
SET review_filter_enabled = true,
    review_min_rating = 4,
    review_filter_locked = false
WHERE review_filter_enabled IS NULL
   OR review_min_rating IS NULL
   OR review_filter_locked IS NULL;

ALTER TABLE public.feedback
  DROP CONSTRAINT IF EXISTS feedback_rating_check;

ALTER TABLE public.feedback
  ADD CONSTRAINT feedback_rating_check
  CHECK (rating >= 1 AND rating <= 4);
