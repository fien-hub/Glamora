-- Add service tagging to portfolio items
-- This allows providers to tag each portfolio post with a specific service
-- Customers can then directly book that service from the post

-- Add provider_service_id column to link portfolio posts to specific services
ALTER TABLE public.portfolio_items
ADD COLUMN IF NOT EXISTS provider_service_id UUID REFERENCES public.provider_services(id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_portfolio_items_provider_service 
ON public.portfolio_items(provider_service_id) WHERE provider_service_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.portfolio_items.provider_service_id IS 'Links portfolio post to a specific provider service for direct booking';

