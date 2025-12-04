-- Add video support to portfolio_items table
-- This allows providers to upload videos in addition to images

-- Add media type column to distinguish between images and videos
ALTER TABLE public.portfolio_items
ADD COLUMN IF NOT EXISTS media_type VARCHAR(10) DEFAULT 'image' CHECK (media_type IN ('image', 'video'));

-- Add video URL column (separate from image_url for clarity)
ALTER TABLE public.portfolio_items
ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Add thumbnail URL for video previews
ALTER TABLE public.portfolio_items
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Add video duration in seconds (useful for display)
ALTER TABLE public.portfolio_items
ADD COLUMN IF NOT EXISTS video_duration_seconds INTEGER;

-- Create index for media type filtering
CREATE INDEX IF NOT EXISTS idx_portfolio_items_media_type 
ON public.portfolio_items(provider_id, media_type);

-- Add comments
COMMENT ON COLUMN public.portfolio_items.media_type IS 'Type of media: image or video';
COMMENT ON COLUMN public.portfolio_items.video_url IS 'URL of the video file (for video type)';
COMMENT ON COLUMN public.portfolio_items.thumbnail_url IS 'URL of the video thumbnail (for video type)';
COMMENT ON COLUMN public.portfolio_items.video_duration_seconds IS 'Duration of video in seconds';

-- Update existing records to have media_type = 'image'
UPDATE public.portfolio_items SET media_type = 'image' WHERE media_type IS NULL;

