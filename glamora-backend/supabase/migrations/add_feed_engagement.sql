-- Create portfolio likes table
CREATE TABLE IF NOT EXISTS public.portfolio_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_item_id UUID REFERENCES public.portfolio_items(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(portfolio_item_id, customer_id)
);

-- Create portfolio saves table (bookmarks)
CREATE TABLE IF NOT EXISTS public.portfolio_saves (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_item_id UUID REFERENCES public.portfolio_items(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(portfolio_item_id, customer_id)
);

-- Create portfolio views table (for analytics)
CREATE TABLE IF NOT EXISTS public.portfolio_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_item_id UUID REFERENCES public.portfolio_items(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customer_profiles(id) ON DELETE SET NULL,
    viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_portfolio_likes_item 
ON public.portfolio_likes(portfolio_item_id);

CREATE INDEX IF NOT EXISTS idx_portfolio_likes_customer 
ON public.portfolio_likes(customer_id);

CREATE INDEX IF NOT EXISTS idx_portfolio_saves_item 
ON public.portfolio_saves(portfolio_item_id);

CREATE INDEX IF NOT EXISTS idx_portfolio_saves_customer 
ON public.portfolio_saves(customer_id);

CREATE INDEX IF NOT EXISTS idx_portfolio_views_item 
ON public.portfolio_views(portfolio_item_id);

CREATE INDEX IF NOT EXISTS idx_portfolio_views_date 
ON public.portfolio_views(viewed_at DESC);

-- Create function to update like_count on portfolio_items
CREATE OR REPLACE FUNCTION update_portfolio_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.portfolio_items
        SET like_count = like_count + 1
        WHERE id = NEW.portfolio_item_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.portfolio_items
        SET like_count = GREATEST(like_count - 1, 0)
        WHERE id = OLD.portfolio_item_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for like_count updates
DROP TRIGGER IF EXISTS trigger_update_portfolio_like_count ON public.portfolio_likes;
CREATE TRIGGER trigger_update_portfolio_like_count
AFTER INSERT OR DELETE ON public.portfolio_likes
FOR EACH ROW
EXECUTE FUNCTION update_portfolio_like_count();

-- Create function to update view_count on portfolio_items
CREATE OR REPLACE FUNCTION update_portfolio_view_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.portfolio_items
    SET view_count = view_count + 1
    WHERE id = NEW.portfolio_item_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for view_count updates
DROP TRIGGER IF EXISTS trigger_update_portfolio_view_count ON public.portfolio_views;
CREATE TRIGGER trigger_update_portfolio_view_count
AFTER INSERT ON public.portfolio_views
FOR EACH ROW
EXECUTE FUNCTION update_portfolio_view_count();

-- Add comments
COMMENT ON TABLE public.portfolio_likes IS 'Tracks customer likes on portfolio items';
COMMENT ON TABLE public.portfolio_saves IS 'Tracks customer saves/bookmarks on portfolio items';
COMMENT ON TABLE public.portfolio_views IS 'Tracks views on portfolio items for analytics';

