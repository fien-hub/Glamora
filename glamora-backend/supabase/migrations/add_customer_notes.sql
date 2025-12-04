-- Create customer_notes table for providers to keep notes about their customers
CREATE TABLE IF NOT EXISTS public.customer_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID REFERENCES public.provider_profiles(id) ON DELETE CASCADE NOT NULL,
    customer_id UUID REFERENCES public.customer_profiles(id) ON DELETE CASCADE NOT NULL,
    note TEXT NOT NULL,
    is_favorite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider_id, customer_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_customer_notes_provider ON public.customer_notes(provider_id);
CREATE INDEX IF NOT EXISTS idx_customer_notes_customer ON public.customer_notes(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_notes_favorite ON public.customer_notes(provider_id, is_favorite);

-- Add updated_at trigger
CREATE TRIGGER update_customer_notes_updated_at
    BEFORE UPDATE ON public.customer_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Providers can view their own customer notes"
    ON public.customer_notes FOR SELECT
    USING (provider_id IN (
        SELECT id FROM public.provider_profiles
        WHERE id IN (
            SELECT id FROM public.profiles
            WHERE user_id = auth.uid()
        )
    ));

CREATE POLICY "Providers can insert their own customer notes"
    ON public.customer_notes FOR INSERT
    WITH CHECK (provider_id IN (
        SELECT id FROM public.provider_profiles
        WHERE id IN (
            SELECT id FROM public.profiles
            WHERE user_id = auth.uid()
        )
    ));

CREATE POLICY "Providers can update their own customer notes"
    ON public.customer_notes FOR UPDATE
    USING (provider_id IN (
        SELECT id FROM public.provider_profiles
        WHERE id IN (
            SELECT id FROM public.profiles
            WHERE user_id = auth.uid()
        )
    ));

CREATE POLICY "Providers can delete their own customer notes"
    ON public.customer_notes FOR DELETE
    USING (provider_id IN (
        SELECT id FROM public.provider_profiles
        WHERE id IN (
            SELECT id FROM public.profiles
            WHERE user_id = auth.uid()
        )
    ));

-- Add comment
COMMENT ON TABLE public.customer_notes IS 'Provider notes and preferences about their customers';

