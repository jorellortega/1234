-- Add role column to user_profiles table
-- This column will be used to distinguish admin users from regular users
-- Only admins can access the admin API keys management page

-- Add the role column with default value 'user'
ALTER TABLE public.user_profiles 
ADD COLUMN role text DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- Add an index on the role column for better performance
CREATE INDEX idx_user_profiles_role ON public.user_profiles(role);

-- Add a comment to document the column
COMMENT ON COLUMN public.user_profiles.role IS 'User role: user (default) or admin. Only admins can access admin features.';

-- Example: To manually promote a user to admin (run this manually in Supabase SQL editor)
-- UPDATE public.user_profiles SET role = 'admin' WHERE email = 'admin@example.com';

-- Note: The role column is NOT included in signup process
-- Admins must be manually promoted by running UPDATE statements
