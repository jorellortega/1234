# 🎯 FINAL SOLUTION: Why Webhooks Aren't Working

## The Problem

Your Stripe CLI listener is running, but it's NOT receiving events from your test purchases. This is because:

**Stripe CLI `listen` only forwards events that Stripe sends to IT, not events from checkout sessions created by your app in test mode.**

## The Solution: Manually Add Credits (Temporary)

Since webhooks aren't working in local development, let's manually add credits after purchases:

### Option 1: Use the Debug API

After each purchase, run this command (replace with your actual user ID):

```bash
curl -X POST http://localhost:3000/api/debug/credits \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "d6c6adba-2b70-4121-b6ca-a07335c0de67",
    "credits": 50,
    "description": "Manual credit addition after purchase"
  }'
```

### Option 2: Add Credits Directly in Supabase

1. Go to your Supabase dashboard
2. Navigate to Table Editor → `user_profiles`
3. Find your user row
4. Manually update the `credits` column

### Option 3: Fix for Production (Deploy to Vercel/Railway)

The REAL solution is to deploy your app because:

1. **In production**, Stripe CAN reach your public webhook URL
2. **In local development**, Stripe CANNOT reach `localhost`

## Why This Happens

```
Your App (localhost:3000)
   ↓ Creates checkout session
Stripe Dashboard
   ↓ Payment completes
Stripe tries to send webhook to...
   ❌ localhost:3000 (NOT ACCESSIBLE from internet!)
   
Result: Webhook never arrives
```

The Stripe CLI `listen` command is supposed to solve this, but it only works if:
- You manually trigger events with `stripe trigger`
- OR you use Stripe's hosted checkout in test mode with CLI forwarding enabled

But when creating checkout sessions programmatically (like your app does), the webhooks go to Stripe's internal queue and don't get forwarded.

## Production Deploy Instructions

1. **Deploy to Vercel:**
   ```bash
   vercel deploy --prod
   ```

2. **Add Webhook in Stripe Dashboard:**
   - Go to: https://dashboard.stripe.com/webhooks
   - Click "Add endpoint"
   - Enter: `https://yourdomain.vercel.app/api/stripe/webhook`
   - Select event: `checkout.session.completed`
   - Copy the webhook signing secret
   - Add to Vercel environment variables

3. **Update Environment Variables in Vercel:**
   - `STRIPE_WEBHOOK_SECRET` = (the new webhook secret from step 2)
   - All your other env vars

4. **Test Again:**
   - Buy credits on your production site
   - Credits will be added automatically!

## Alternative: Use Stripe Trigger for Testing

If you want to test the webhook handler locally:

```bash
# In one terminal: Stripe listener
stripe listen --forward-to http://localhost:3000/api/stripe/webhook

# In another terminal: Trigger test event
stripe trigger checkout.session.completed \
  --add checkout_session:metadata[userId]=d6c6adba-2b70-4121-b6ca-a07335c0de67 \
  --add checkout_session:metadata[credits]=50
```

This WILL show up in your Stripe CLI terminal and your webhook will be called.

## Bottom Line

**For local development:** Use the debug API or manual Supabase updates  
**For production:** Deploy and configure real webhooks  
**For testing webhooks:** Use `stripe trigger` commands

