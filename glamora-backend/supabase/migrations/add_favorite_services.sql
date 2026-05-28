-- Create the favorite_services table that was missing from add_personalization_fields.sql.
--
-- This table is queried by ProfileScreen (favorites count), FavoritesScreen,
-- PersonalizedHome, and accountDeletion. Its absence caused "Failed to load
-- profile data" errors on every authenticated screen load.

CREATE TABLE IF NOT EXISTS public.favorite_services (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
    service_id  UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(customer_id, service_id)
);

CREATE INDEX IF NOT EXISTS idx_favorite_services_customer
    ON public.favorite_services(customer_id);

CREATE INDEX IF NOT EXISTS idx_favorite_services_service
    ON public.favorite_services(service_id);

-- Row Level Security
ALTER TABLE public.favorite_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own favorite services"   ON public.favorite_services;
DROP POLICY IF EXISTS "Users can manage their own favorite services" ON public.favorite_services;

CREATE POLICY "Users can view their own favorite services"
ON public.favorite_services
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = favorite_services.customer_id
          AND p.user_id = auth.uid()
    )
);

CREATE POLICY "Users can manage their own favorite services"
ON public.favorite_services
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = favorite_services.customer_id
          AND p.user_id = auth.uid()
    )
);
