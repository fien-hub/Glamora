-- Add enhancement fields to portfolio_items table
-- Note: display_order and is_before_after already exist from add_personalization_fields.sql
ALTER TABLE public.portfolio_items
ADD COLUMN IF NOT EXISTS caption TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS paired_image_id UUID REFERENCES public.portfolio_items(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;

-- Create index for ordering
CREATE INDEX IF NOT EXISTS idx_portfolio_items_display_order 
ON public.portfolio_items(provider_id, display_order);

-- Create index for tags
CREATE INDEX IF NOT EXISTS idx_portfolio_items_tags 
ON public.portfolio_items USING GIN(tags);

-- Create index for before/after pairs
CREATE INDEX IF NOT EXISTS idx_portfolio_items_paired 
ON public.portfolio_items(paired_image_id) WHERE paired_image_id IS NOT NULL;

-- Add comments
COMMENT ON COLUMN public.portfolio_items.display_order IS 'Order in which images are displayed (lower numbers first)';
COMMENT ON COLUMN public.portfolio_items.caption IS 'Caption or description for the image';
COMMENT ON COLUMN public.portfolio_items.tags IS 'Tags/categories for the image (e.g., haircut, coloring, bridal)';
COMMENT ON COLUMN public.portfolio_items.is_before_after IS 'Whether this image is part of a before/after pair';
COMMENT ON COLUMN public.portfolio_items.paired_image_id IS 'ID of the paired image (for before/after)';
COMMENT ON COLUMN public.portfolio_items.view_count IS 'Number of times this image has been viewed';
COMMENT ON COLUMN public.portfolio_items.like_count IS 'Number of likes this image has received';

