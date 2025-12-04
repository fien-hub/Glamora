-- Add provider response fields to reviews table
ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS provider_response TEXT,
ADD COLUMN IF NOT EXISTS provider_response_date TIMESTAMPTZ;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_reviews_provider_response ON public.reviews(provider_id, provider_response_date);

-- Add comment
COMMENT ON COLUMN public.reviews.provider_response IS 'Provider response to the review';
COMMENT ON COLUMN public.reviews.provider_response_date IS 'Date when provider responded to the review';

