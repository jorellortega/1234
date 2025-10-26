-- Test script to manually set a user's subscription status
-- Replace 'user-email@example.com' with the actual user email you want to test

-- Set a specific user's subscription to true (for testing)
UPDATE public.user_profiles 
SET has_subscription = true 
WHERE email = 'vidaxci@gmail.com';

-- Verify the update
SELECT id, email, has_subscription, created_at 
FROM public.user_profiles 
WHERE email = 'vidaxci@gmail.com';

-- Optional: Set all users to have subscription (for testing)
-- UPDATE public.user_profiles SET has_subscription = true;

-- Optional: Reset all users to no subscription
-- UPDATE public.user_profiles SET has_subscription = false;
