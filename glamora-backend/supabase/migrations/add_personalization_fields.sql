-- Add personalization fields to customer_profiles
ALTER TABLE public.customer_profiles
ADD COLUMN IF NOT EXISTS preferred_categories TEXT[],
ADD COLUMN IF NOT EXISTS location_address TEXT,
ADD COLUMN IF NOT EXISTS location_city TEXT,
ADD COLUMN IF NOT EXISTS location_state TEXT,
ADD COLUMN IF NOT EXISTS location_zip_code TEXT,
ADD COLUMN IF NOT EXISTS booking_time_preference TEXT,
ADD COLUMN IF NOT EXISTS budget_preference TEXT;

-- Add favorite providers table
CREATE TABLE IF NOT EXISTS public.favorite_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(customer_id, provider_id)
);

-- Add promo codes table
CREATE TABLE IF NOT EXISTS public.promo_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10, 2) NOT NULL,
    min_purchase_amount DECIMAL(10, 2) DEFAULT 0,
    max_discount_amount DECIMAL(10, 2),
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add promo code usage tracking
CREATE TABLE IF NOT EXISTS public.promo_code_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    promo_code_id UUID REFERENCES public.promo_codes(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    discount_amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(promo_code_id, customer_id, booking_id)
);

-- Add loyalty points table
CREATE TABLE IF NOT EXISTS public.loyalty_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
    points INTEGER DEFAULT 0,
    lifetime_points INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(customer_id)
);

-- Add loyalty transactions table
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
    points INTEGER NOT NULL,
    transaction_type TEXT CHECK (transaction_type IN ('earned', 'redeemed', 'expired')),
    description TEXT,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add referrals table
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id UUID REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
    referred_id UUID REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
    referral_code TEXT UNIQUE NOT NULL,
    status TEXT CHECK (status IN ('pending', 'completed', 'rewarded')) DEFAULT 'pending',
    reward_amount DECIMAL(10, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    UNIQUE(referrer_id, referred_id)
);

-- Add portfolio items table for providers
CREATE TABLE IF NOT EXISTS public.portfolio_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
    title TEXT,
    description TEXT,
    image_url TEXT NOT NULL,
    service_category_id UUID REFERENCES public.service_categories(id) ON DELETE SET NULL,
    is_before_after BOOLEAN DEFAULT false,
    before_image_url TEXT,
    after_image_url TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add messages table for chat
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT CHECK (type IN ('booking', 'message', 'payment', 'review', 'promotion', 'system')),
    related_id UUID,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add provider availability table
CREATE TABLE IF NOT EXISTS public.provider_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
    day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add provider time off table
CREATE TABLE IF NOT EXISTS public.provider_time_off (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add booking promo code field
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS promo_code_id UUID REFERENCES public.promo_codes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS original_price DECIMAL(10, 2);

-- Create indexes for new tables
CREATE INDEX IF NOT EXISTS idx_favorite_providers_customer ON public.favorite_providers(customer_id);
CREATE INDEX IF NOT EXISTS idx_favorite_providers_provider ON public.favorite_providers(provider_id);
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON public.promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON public.promo_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_customer ON public.loyalty_points(customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_customer ON public.loyalty_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_portfolio_items_provider ON public.portfolio_items(provider_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_booking ON public.messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_provider_availability_provider ON public.provider_availability(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_time_off_provider ON public.provider_time_off(provider_id);

-- Add updated_at triggers for new tables
CREATE TRIGGER update_promo_codes_updated_at BEFORE UPDATE ON public.promo_codes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loyalty_points_updated_at BEFORE UPDATE ON public.loyalty_points
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portfolio_items_updated_at BEFORE UPDATE ON public.portfolio_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_provider_availability_updated_at BEFORE UPDATE ON public.provider_availability
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies for new tables
ALTER TABLE public.favorite_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_code_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_time_off ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own favorites" ON public.favorite_providers;
DROP POLICY IF EXISTS "Users can manage their own favorites" ON public.favorite_providers;
DROP POLICY IF EXISTS "Anyone can view active promo codes" ON public.promo_codes;
DROP POLICY IF EXISTS "Users can view their own loyalty points" ON public.loyalty_points;
DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Anyone can view portfolio items" ON public.portfolio_items;
DROP POLICY IF EXISTS "Providers can manage their own portfolio" ON public.portfolio_items;
DROP POLICY IF EXISTS "Anyone can view provider availability" ON public.provider_availability;
DROP POLICY IF EXISTS "Providers can manage their own availability" ON public.provider_availability;
DROP POLICY IF EXISTS "Providers can manage their own time off" ON public.provider_time_off;

-- Favorite providers policies
CREATE POLICY "Users can view their own favorites" ON public.favorite_providers
    FOR SELECT USING (auth.uid() IN (
        SELECT p.user_id FROM public.profiles p WHERE p.id = customer_id
    ));

CREATE POLICY "Users can manage their own favorites" ON public.favorite_providers
    FOR ALL USING (auth.uid() IN (
        SELECT p.user_id FROM public.profiles p WHERE p.id = customer_id
    ));

-- Promo codes policies
CREATE POLICY "Anyone can view active promo codes" ON public.promo_codes
    FOR SELECT USING (is_active = true);

-- Loyalty points policies
CREATE POLICY "Users can view their own loyalty points" ON public.loyalty_points
    FOR SELECT USING (auth.uid() IN (
        SELECT p.user_id FROM public.profiles p WHERE p.id = customer_id
    ));

-- Messages policies
CREATE POLICY "Users can view their own messages" ON public.messages
    FOR SELECT USING (auth.uid() IN (sender_id, receiver_id));

CREATE POLICY "Users can send messages" ON public.messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Portfolio items policies
CREATE POLICY "Anyone can view portfolio items" ON public.portfolio_items
    FOR SELECT USING (true);

CREATE POLICY "Providers can manage their own portfolio" ON public.portfolio_items
    FOR ALL USING (auth.uid() IN (
        SELECT p.user_id FROM public.profiles p WHERE p.id = provider_id
    ));

-- Provider availability policies
CREATE POLICY "Anyone can view provider availability" ON public.provider_availability
    FOR SELECT USING (true);

CREATE POLICY "Providers can manage their own availability" ON public.provider_availability
    FOR ALL USING (auth.uid() IN (
        SELECT p.user_id FROM public.profiles p WHERE p.id = provider_id
    ));

-- Provider time off policies
CREATE POLICY "Providers can manage their own time off" ON public.provider_time_off
    FOR ALL USING (auth.uid() IN (
        SELECT p.user_id FROM public.profiles p WHERE p.id = provider_id
    ));

