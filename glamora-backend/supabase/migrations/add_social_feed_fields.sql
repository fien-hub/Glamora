-- Add social feed fields to portfolio_items table
ALTER TABLE public.portfolio_items
ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS featured_at TIMESTAMPTZ;

-- Add avatar_url to provider_profiles (if not exists from profiles table)
-- Note: avatar_url already exists in profiles table, but we'll add a direct reference
ALTER TABLE public.provider_profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create index for visible portfolio items
CREATE INDEX IF NOT EXISTS idx_portfolio_items_visible 
ON public.portfolio_items(is_visible, created_at DESC) WHERE is_visible = true;

-- Create index for featured items
CREATE INDEX IF NOT EXISTS idx_portfolio_items_featured 
ON public.portfolio_items(is_featured, featured_at DESC) WHERE is_featured = true;

-- Add comments
COMMENT ON COLUMN public.portfolio_items.is_visible IS 'Whether this portfolio item is visible in the social feed';
COMMENT ON COLUMN public.portfolio_items.is_featured IS 'Whether this item is featured/promoted in the feed';
COMMENT ON COLUMN public.portfolio_items.featured_at IS 'Timestamp when the item was featured';
COMMENT ON COLUMN public.provider_profiles.avatar_url IS 'Provider profile photo URL (cached from profiles table)';

