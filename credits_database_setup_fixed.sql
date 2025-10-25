-- Credits system database setup for INFINITO (FIXED VERSION)
-- Run this in your Supabase SQL editor

-- Add credits column to user_profiles table
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 0;

-- Drop existing functions if they exist to avoid conflicts
DROP FUNCTION IF EXISTS public.add_user_credits(UUID, INTEGER);
DROP FUNCTION IF EXISTS public.add_user_credits(UUID, INTEGER, VARCHAR(50), TEXT, VARCHAR(255));
DROP FUNCTION IF EXISTS public.deduct_user_credits(UUID, INTEGER);
DROP FUNCTION IF EXISTS public.deduct_user_credits(UUID, INTEGER, VARCHAR(50), TEXT, VARCHAR(255));
DROP FUNCTION IF EXISTS public.has_sufficient_credits(UUID, INTEGER);
DROP FUNCTION IF EXISTS public.log_credit_transaction(UUID, INTEGER, VARCHAR(50), TEXT, VARCHAR(255));

-- Create function to add credits to a user (with transaction logging)
CREATE OR REPLACE FUNCTION public.add_user_credits(
  user_id UUID,
  credits_to_add INTEGER,
  transaction_type VARCHAR(50) DEFAULT 'purchase',
  description TEXT DEFAULT NULL,
  reference_id VARCHAR(255) DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.user_profiles 
  SET credits = credits + credits_to_add,
      updated_at = NOW()
  WHERE id = user_id;
  
  -- If user doesn't exist in user_profiles, create them
  IF NOT FOUND THEN
    INSERT INTO public.user_profiles (id, credits, created_at, updated_at)
    VALUES (user_id, credits_to_add, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET 
      credits = user_profiles.credits + credits_to_add,
      updated_at = NOW();
  END IF;
  
  -- Log the transaction
  PERFORM public.log_credit_transaction(
    user_id,
    credits_to_add,
    transaction_type,
    description,
    reference_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to deduct credits from a user (with transaction logging)
CREATE OR REPLACE FUNCTION public.deduct_user_credits(
  user_id UUID,
  credits_to_deduct INTEGER,
  transaction_type VARCHAR(50) DEFAULT 'usage',
  description TEXT DEFAULT NULL,
  reference_id VARCHAR(255) DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  current_credits INTEGER;
BEGIN
  -- Get current credits
  SELECT credits INTO current_credits 
  FROM public.user_profiles 
  WHERE id = user_id;
  
  -- Check if user has enough credits
  IF current_credits IS NULL OR current_credits < credits_to_deduct THEN
    RETURN FALSE;
  END IF;
  
  -- Deduct credits
  UPDATE public.user_profiles 
  SET credits = credits - credits_to_deduct,
      updated_at = NOW()
  WHERE id = user_id;
  
  -- Log the transaction
  PERFORM public.log_credit_transaction(
    user_id,
    -credits_to_deduct,
    transaction_type,
    description,
    reference_id
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user has enough credits
CREATE OR REPLACE FUNCTION public.has_sufficient_credits(
  user_id UUID,
  required_credits INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  current_credits INTEGER;
BEGIN
  SELECT credits INTO current_credits 
  FROM public.user_profiles 
  WHERE id = user_id;
  
  RETURN COALESCE(current_credits, 0) >= required_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create credits transaction log table
CREATE TABLE IF NOT EXISTS public.credits_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- Positive for additions, negative for deductions
  transaction_type VARCHAR(50) NOT NULL, -- 'purchase', 'usage', 'refund', etc.
  description TEXT,
  reference_id VARCHAR(255), -- Stripe session ID, generation ID, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_credits_transactions_user_id ON public.credits_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credits_transactions_created_at ON public.credits_transactions(created_at);

-- Enable RLS on credits_transactions
ALTER TABLE public.credits_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own credit transactions" ON public.credits_transactions;
DROP POLICY IF EXISTS "Users can insert own credit transactions" ON public.credits_transactions;

-- Create RLS policies for credits_transactions
CREATE POLICY "Users can view own credit transactions" ON public.credits_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credit transactions" ON public.credits_transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create function to log credit transactions
CREATE OR REPLACE FUNCTION public.log_credit_transaction(
  user_id UUID,
  amount INTEGER,
  transaction_type VARCHAR(50),
  description TEXT DEFAULT NULL,
  reference_id VARCHAR(255) DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.credits_transactions (
    user_id,
    amount,
    transaction_type,
    description,
    reference_id
  ) VALUES (
    user_id,
    amount,
    transaction_type,
    description,
    reference_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for user credit summary
CREATE OR REPLACE VIEW public.user_credit_summary AS
SELECT 
  up.id as user_id,
  up.credits as current_credits,
  COALESCE(SUM(ct.amount) FILTER (WHERE ct.amount > 0), 0) as total_purchased,
  COALESCE(SUM(ct.amount) FILTER (WHERE ct.amount < 0), 0) as total_used,
  COUNT(ct.id) as transaction_count,
  MAX(ct.created_at) as last_transaction
FROM public.user_profiles up
LEFT JOIN public.credits_transactions ct ON up.id = ct.user_id
GROUP BY up.id, up.credits;

-- Grant permissions
GRANT SELECT ON public.user_credit_summary TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_user_credits TO authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_user_credits TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_sufficient_credits TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_credit_transaction TO authenticated;
