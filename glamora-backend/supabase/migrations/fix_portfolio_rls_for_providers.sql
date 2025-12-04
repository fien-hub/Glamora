-- Fix RLS policies to allow providers to like and save posts too
-- Currently only customers can like/save, but providers should be able to as well

-- Drop existing policies
DROP POLICY IF EXISTS "Customers can like portfolio items" ON public.portfolio_likes;
DROP POLICY IF EXISTS "Customers can unlike their own likes" ON public.portfolio_likes;
DROP POLICY IF EXISTS "Customers can save portfolio items" ON public.portfolio_saves;
DROP POLICY IF EXISTS "Customers can unsave their own saves" ON public.portfolio_saves;
DROP POLICY IF EXISTS "Customers can view their own saves" ON public.portfolio_saves;

-- Portfolio Likes Policies (Updated to allow both customers and providers)
-- Users can like portfolio items (both customers and providers)
CREATE POLICY "Users can like portfolio items"
ON public.portfolio_likes
FOR INSERT
WITH CHECK (
    -- Check if the customer_id belongs to the authenticated user
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = portfolio_likes.customer_id
        AND p.user_id = auth.uid()
    )
);

-- Users can unlike their own likes
CREATE POLICY "Users can unlike their own likes"
ON public.portfolio_likes
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = portfolio_likes.customer_id
        AND p.user_id = auth.uid()
    )
);

-- Portfolio Saves Policies (Updated to allow both customers and providers)
-- Users can view their own saves
CREATE POLICY "Users can view their own saves"
ON public.portfolio_saves
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = portfolio_saves.customer_id
        AND p.user_id = auth.uid()
    )
);

-- Users can save portfolio items
CREATE POLICY "Users can save portfolio items"
ON public.portfolio_saves
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = portfolio_saves.customer_id
        AND p.user_id = auth.uid()
    )
);

-- Users can unsave their own saves
CREATE POLICY "Users can unsave their own saves"
ON public.portfolio_saves
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = portfolio_saves.customer_id
        AND p.user_id = auth.uid()
    )
);

-- Add comments
COMMENT ON POLICY "Users can like portfolio items" ON public.portfolio_likes IS 'Allows both customers and providers to like portfolio items';
COMMENT ON POLICY "Users can unlike their own likes" ON public.portfolio_likes IS 'Allows users to unlike their own likes';
COMMENT ON POLICY "Users can save portfolio items" ON public.portfolio_saves IS 'Allows both customers and providers to save/bookmark portfolio items';
COMMENT ON POLICY "Users can unsave their own saves" ON public.portfolio_saves IS 'Allows users to unsave their own saves';
COMMENT ON POLICY "Users can view their own saves" ON public.portfolio_saves IS 'Allows users to view their own saved items';

