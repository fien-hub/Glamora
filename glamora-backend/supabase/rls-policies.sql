-- Enable Row Level Security on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own data" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Profiles policies
CREATE POLICY "Anyone can view profiles" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Customer profiles policies
CREATE POLICY "Anyone can view customer profiles" ON public.customer_profiles
    FOR SELECT USING (true);

CREATE POLICY "Customers can update their own profile" ON public.customer_profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = customer_profiles.id
            AND profiles.user_id = auth.uid()
        )
    );

CREATE POLICY "Customers can insert their own profile" ON public.customer_profiles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = customer_profiles.id
            AND profiles.user_id = auth.uid()
        )
    );

-- Provider profiles policies
CREATE POLICY "Anyone can view verified providers" ON public.provider_profiles
    FOR SELECT USING (is_verified = true OR 
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = provider_profiles.id
            AND profiles.user_id = auth.uid()
        )
    );

CREATE POLICY "Providers can update their own profile" ON public.provider_profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = provider_profiles.id
            AND profiles.user_id = auth.uid()
        )
    );

CREATE POLICY "Providers can insert their own profile" ON public.provider_profiles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = provider_profiles.id
            AND profiles.user_id = auth.uid()
        )
    );

-- Service categories policies (read-only for users)
CREATE POLICY "Anyone can view service categories" ON public.service_categories
    FOR SELECT USING (true);

-- Services policies (read-only for users)
CREATE POLICY "Anyone can view services" ON public.services
    FOR SELECT USING (true);

-- Provider services policies
CREATE POLICY "Anyone can view active provider services" ON public.provider_services
    FOR SELECT USING (is_active = true OR 
        EXISTS (
            SELECT 1 FROM public.provider_profiles pp
            JOIN public.profiles p ON p.id = pp.id
            WHERE pp.id = provider_services.provider_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Providers can manage their own services" ON public.provider_services
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.provider_profiles pp
            JOIN public.profiles p ON p.id = pp.id
            WHERE pp.id = provider_services.provider_id
            AND p.user_id = auth.uid()
        )
    );

-- Bookings policies
CREATE POLICY "Users can view their own bookings" ON public.bookings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.customer_profiles cp
            JOIN public.profiles p ON p.id = cp.id
            WHERE cp.id = bookings.customer_id
            AND p.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.provider_profiles pp
            JOIN public.profiles p ON p.id = pp.id
            WHERE pp.id = bookings.provider_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Customers can create bookings" ON public.bookings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.customer_profiles cp
            JOIN public.profiles p ON p.id = cp.id
            WHERE cp.id = bookings.customer_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own bookings" ON public.bookings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.customer_profiles cp
            JOIN public.profiles p ON p.id = cp.id
            WHERE cp.id = bookings.customer_id
            AND p.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.provider_profiles pp
            JOIN public.profiles p ON p.id = pp.id
            WHERE pp.id = bookings.provider_id
            AND p.user_id = auth.uid()
        )
    );

-- Reviews policies
CREATE POLICY "Anyone can view reviews" ON public.reviews
    FOR SELECT USING (true);

CREATE POLICY "Customers can create reviews for their bookings" ON public.reviews
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.customer_profiles cp
            JOIN public.profiles p ON p.id = cp.id
            WHERE cp.id = reviews.customer_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Customers can update their own reviews" ON public.reviews
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.customer_profiles cp
            JOIN public.profiles p ON p.id = cp.id
            WHERE cp.id = reviews.customer_id
            AND p.user_id = auth.uid()
        )
    );

-- Payments policies
CREATE POLICY "Users can view their own payments" ON public.payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.bookings b
            JOIN public.customer_profiles cp ON cp.id = b.customer_id
            JOIN public.profiles p ON p.id = cp.id
            WHERE b.id = payments.booking_id
            AND p.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.bookings b
            JOIN public.provider_profiles pp ON pp.id = b.provider_id
            JOIN public.profiles p ON p.id = pp.id
            WHERE b.id = payments.booking_id
            AND p.user_id = auth.uid()
        )
    );

-- Availability policies
CREATE POLICY "Anyone can view provider availability" ON public.availability
    FOR SELECT USING (is_available = true);

CREATE POLICY "Providers can manage their own availability" ON public.availability
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.provider_profiles pp
            JOIN public.profiles p ON p.id = pp.id
            WHERE pp.id = availability.provider_id
            AND p.user_id = auth.uid()
        )
    );

-- Portfolio policies
CREATE POLICY "Anyone can view portfolio items" ON public.portfolio_items
    FOR SELECT USING (true);

CREATE POLICY "Providers can manage their own portfolio" ON public.portfolio_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.provider_profiles pp
            JOIN public.profiles p ON p.id = pp.id
            WHERE pp.id = portfolio_items.provider_id
            AND p.user_id = auth.uid()
        )
    );

