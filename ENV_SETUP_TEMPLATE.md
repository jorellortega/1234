# Environment Variables Setup Template

## Quick Setup

Create or edit your `.env.local` file in the root directory of the INFINITO project and add the following:

```env
# Kling AI Video Generation API Credentials
KLING_ACCESS_KEY=your_actual_access_key_here
KLING_SECRET_KEY=your_actual_secret_key_here
```

## Example Format

```env
# Kling AI Video Generation API Credentials
KLING_ACCESS_KEY=ak_abc123def456ghi789jkl012mno345pqr678stu901vwx234
KLING_SECRET_KEY=sk_zyx987wvu654tsr321qpo098nml765kji432hgf109edc876
```

## Where to Get Your Keys

1. Log in to your Kling AI account
2. Navigate to API Settings or Developer Console
3. Generate or copy your:
   - **Access Key (AK)**: Starts with `ak_`
   - **Secret Key (SK)**: Starts with `sk_`

## Complete .env.local Template

For reference, here's what a complete `.env.local` file should look like (with all INFINITO services):

```env
# ============================================
# SUPABASE CONFIGURATION
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# ============================================
# RUNWAYML API (Video Generation)
# ============================================
RUNWAYML_API_SECRET=key_xxxxxxxxxxxxx

# ============================================
# KLING AI API (Video Generation)
# ============================================
KLING_ACCESS_KEY=ak_xxxxxxxxxxxxxxxxxxxxxxxxx
KLING_SECRET_KEY=sk_xxxxxxxxxxxxxxxxxxxxxxxxx

# ============================================
# STRIPE (Payment Processing)
# ============================================
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# ============================================
# BACKEND API (Optional)
# ============================================
NEXT_PUBLIC_API_BASE_URL=your_backend_url_here
```

## Important Security Notes

- **Never commit `.env.local`** to version control (it's already in `.gitignore`)
- **Never share your API keys** publicly or in screenshots
- **Use different keys** for development and production
- **Rotate keys** regularly for security
- **Store production keys** securely in your hosting platform's environment variables

## After Adding Keys

1. Save your `.env.local` file
2. **Restart your development server**:
   ```bash
   npm run dev
   # or
   pnpm dev
   ```
3. Test Kling AI video generation

## Troubleshooting

### Error: "KLING_ACCESS_KEY and KLING_SECRET_KEY environment variables are not set"

**Solution**: Make sure:
1. Your `.env.local` file is in the **root directory** of the project
2. The file is named exactly `.env.local` (not `.env` or `.env.local.txt`)
3. There are **no spaces** around the `=` sign
4. The values are not wrapped in quotes (unless your key contains spaces)
5. You've **restarted the development server** after adding the keys

### Error: "Invalid credentials"

**Solution**: Verify that:
1. Your keys are copied correctly (no extra spaces or characters)
2. You're using the correct keys from your Kling AI account
3. The keys haven't expired or been revoked

## Verification

To verify your keys are loaded correctly, you can check the server logs when starting the development server. You should NOT see the error message about missing environment variables.

## Getting Help

If you continue to experience issues:
1. Check the [KLING_AI_SETUP.md](./KLING_AI_SETUP.md) file for detailed documentation
2. Verify your API credentials are active on the Kling AI platform
3. Contact Kling AI support if you believe your credentials are invalid

