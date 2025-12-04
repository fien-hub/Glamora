-- Fix portfolio_likes and portfolio_saves to allow both customers AND providers to like/save posts
-- Currently, these tables only reference customer_profiles, which prevents providers from liking posts

-- Step 1: Drop existing foreign key constraints
ALTER TABLE public.portfolio_likes 
DROP CONSTRAINT IF EXISTS portfolio_likes_customer_id_fkey;

ALTER TABLE public.portfolio_saves 
DROP CONSTRAINT IF EXISTS portfolio_saves_customer_id_fkey;

-- Step 2: Rename customer_id columns to profile_id for clarity
ALTER TABLE public.portfolio_likes 
RENAME COLUMN customer_id TO profile_id;

ALTER TABLE public.portfolio_saves 
RENAME COLUMN customer_id TO profile_id;

-- Step 3: Add new foreign key constraints to profiles table (parent of both customer_profiles and provider_profiles)
ALTER TABLE public.portfolio_likes 
ADD CONSTRAINT portfolio_likes_profile_id_fkey 
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.portfolio_saves 
ADD CONSTRAINT portfolio_saves_profile_id_fkey 
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Step 4: Update unique constraints to use new column name
ALTER TABLE public.portfolio_likes 
DROP CONSTRAINT IF EXISTS portfolio_likes_portfolio_item_id_customer_id_key;

ALTER TABLE public.portfolio_likes 
ADD CONSTRAINT portfolio_likes_portfolio_item_id_profile_id_key 
UNIQUE(portfolio_item_id, profile_id);

ALTER TABLE public.portfolio_saves 
DROP CONSTRAINT IF EXISTS portfolio_saves_portfolio_item_id_customer_id_key;

ALTER TABLE public.portfolio_saves 
ADD CONSTRAINT portfolio_saves_portfolio_item_id_profile_id_key 
UNIQUE(portfolio_item_id, profile_id);

-- Step 5: Update RLS policies to allow both customers and providers

-- Drop old policies
DROP POLICY IF EXISTS "Customers can like portfolio items" ON public.portfolio_likes;
DROP POLICY IF EXISTS "Customers can unlike their own likes" ON public.portfolio_likes;
DROP POLICY IF EXISTS "Customers can view their own saves" ON public.portfolio_saves;
DROP POLICY IF EXISTS "Customers can save portfolio items" ON public.portfolio_saves;
DROP POLICY IF EXISTS "Customers can unsave their own saves" ON public.portfolio_saves;

-- Create new policies for portfolio_likes
CREATE POLICY "Authenticated users can like portfolio items"
ON public.portfolio_likes
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = portfolio_likes.profile_id
        AND p.user_id = auth.uid()
    )
);

CREATE POLICY "Users can unlike their own likes"
ON public.portfolio_likes
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = portfolio_likes.profile_id
        AND p.user_id = auth.uid()
    )
);

-- Create new policies for portfolio_saves
CREATE POLICY "Users can view their own saves"
ON public.portfolio_saves
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = portfolio_saves.profile_id
        AND p.user_id = auth.uid()
    )
);

CREATE POLICY "Authenticated users can save portfolio items"
ON public.portfolio_saves
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = portfolio_saves.profile_id
        AND p.user_id = auth.uid()
    )
);

CREATE POLICY "Users can unsave their own saves"
ON public.portfolio_saves
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = portfolio_saves.profile_id
        AND p.user_id = auth.uid()
    )
);

-- Step 6: Update portfolio_views to also use profile_id (it's nullable, so providers and customers can view)
ALTER TABLE public.portfolio_views 
DROP CONSTRAINT IF EXISTS portfolio_views_customer_id_fkey;

ALTER TABLE public.portfolio_views 
RENAME COLUMN customer_id TO profile_id;

ALTER TABLE public.portfolio_views 
ADD CONSTRAINT portfolio_views_profile_id_fkey 
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Step 7: Update any functions that reference customer_id to use profile_id
-- Note: You may need to update get_personalized_feed and other functions manually
-- to use profile_id instead of customer_id

COMMENT ON COLUMN public.portfolio_likes.profile_id IS 'References profiles table - can be customer or provider';
COMMENT ON COLUMN public.portfolio_saves.profile_id IS 'References profiles table - can be customer or provider';
COMMENT ON COLUMN public.portfolio_views.profile_id IS 'References profiles table - can be customer or provider (nullable for anonymous views)';

