-- Add subscription column to user_profiles table
-- This will track whether a user has an active subscription

-- Add the subscription column with default false (no subscription)
ALTER TABLE public.user_profiles 
ADD COLUMN has_subscription BOOLEAN NOT NULL DEFAULT false;

-- Add a comment to document the column
COMMENT ON COLUMN public.user_profiles.has_subscription IS 'Indicates if the user has an active subscription. Defaults to false (no subscription).';

-- Create an index for faster subscription lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription 
ON public.user_profiles (has_subscription);

-- Optional: Update existing users to explicitly set subscription status
-- (This is optional since DEFAULT false will handle new users)
UPDATE public.user_profiles 
SET has_subscription = false 
WHERE has_subscription IS NULL;
