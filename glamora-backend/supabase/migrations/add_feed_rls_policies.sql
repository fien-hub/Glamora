-- Enable RLS on feed engagement tables
ALTER TABLE public.portfolio_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_views ENABLE ROW LEVEL SECURITY;

-- Portfolio Likes Policies
-- Anyone can view likes count (aggregated)
CREATE POLICY "Anyone can view portfolio likes"
ON public.portfolio_likes
FOR SELECT
USING (true);

-- Customers can like portfolio items
CREATE POLICY "Customers can like portfolio items"
ON public.portfolio_likes
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.customer_profiles cp
        WHERE cp.id = portfolio_likes.customer_id
        AND cp.id IN (
            SELECT id FROM public.profiles
            WHERE user_id = auth.uid()
        )
    )
);

-- Customers can unlike their own likes
CREATE POLICY "Customers can unlike their own likes"
ON public.portfolio_likes
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.customer_profiles cp
        WHERE cp.id = portfolio_likes.customer_id
        AND cp.id IN (
            SELECT id FROM public.profiles
            WHERE user_id = auth.uid()
        )
    )
);

-- Portfolio Saves Policies
-- Customers can view their own saves
CREATE POLICY "Customers can view their own saves"
ON public.portfolio_saves
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.customer_profiles cp
        WHERE cp.id = portfolio_saves.customer_id
        AND cp.id IN (
            SELECT id FROM public.profiles
            WHERE user_id = auth.uid()
        )
    )
);

-- Customers can save portfolio items
CREATE POLICY "Customers can save portfolio items"
ON public.portfolio_saves
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.customer_profiles cp
        WHERE cp.id = portfolio_saves.customer_id
        AND cp.id IN (
            SELECT id FROM public.profiles
            WHERE user_id = auth.uid()
        )
    )
);

-- Customers can unsave their own saves
CREATE POLICY "Customers can unsave their own saves"
ON public.portfolio_saves
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.customer_profiles cp
        WHERE cp.id = portfolio_saves.customer_id
        AND cp.id IN (
            SELECT id FROM public.profiles
            WHERE user_id = auth.uid()
        )
    )
);

-- Portfolio Views Policies
-- Anyone can insert views (for analytics)
CREATE POLICY "Anyone can record portfolio views"
ON public.portfolio_views
FOR INSERT
WITH CHECK (true);

-- Only providers can view their own portfolio analytics
CREATE POLICY "Providers can view their portfolio analytics"
ON public.portfolio_views
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.portfolio_items pi
        INNER JOIN public.provider_profiles pp ON pi.provider_id = pp.id
        WHERE pi.id = portfolio_views.portfolio_item_id
        AND pp.id IN (
            SELECT id FROM public.profiles
            WHERE user_id = auth.uid()
        )
    )
);

-- Portfolio Items Visibility Policies
-- Update existing portfolio_items policies to respect is_visible flag

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view visible portfolio items" ON public.portfolio_items;
DROP POLICY IF EXISTS "Providers can manage their portfolio" ON public.portfolio_items;

-- Anyone can view visible portfolio items
CREATE POLICY "Anyone can view visible portfolio items"
ON public.portfolio_items
FOR SELECT
USING (is_visible = true OR provider_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
));

-- Providers can manage their own portfolio items
CREATE POLICY "Providers can manage their portfolio"
ON public.portfolio_items
FOR ALL
USING (
    provider_id IN (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
)
WITH CHECK (
    provider_id IN (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
);

-- Add comments
COMMENT ON POLICY "Anyone can view portfolio likes" ON public.portfolio_likes IS 'Allows viewing like counts for analytics';
COMMENT ON POLICY "Customers can like portfolio items" ON public.portfolio_likes IS 'Allows customers to like portfolio items';
COMMENT ON POLICY "Customers can save portfolio items" ON public.portfolio_saves IS 'Allows customers to save/bookmark portfolio items';
COMMENT ON POLICY "Anyone can record portfolio views" ON public.portfolio_views IS 'Allows recording views for analytics';
COMMENT ON POLICY "Anyone can view visible portfolio items" ON public.portfolio_items IS 'Respects is_visible flag for feed visibility';

