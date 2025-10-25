# ⚠️ CRITICAL: Wrong Webhook Secret Detected!

## The Problem

Your `.env.local` file has the WRONG webhook secret!

- **Current secret in `.env.local`:** `whsec_74BW...` (wrong!)
- **Correct secret from Stripe CLI:** `whsec_a9ae43a791831d4ca22cc4b93c3fc211d78aeb63a999a9f38d35efdb4c1392b7`

## 🔧 Fix This Now

1. Open your `.env.local` file in the project root
2. Replace the current `STRIPE_WEBHOOK_SECRET` with the correct one:

```env
STRIPE_WEBHOOK_SECRET=whsec_a9ae43a791831d4ca22cc4b93c3fc211d78aeb63a999a9f38d35efdb4c1392b7
```

3. **Save the file**
4. **Restart your Next.js dev server** (Ctrl+C and run `npm run dev`)

## Why This Matters

The Stripe CLI is forwarding webhooks with signatures generated using:
```
whsec_a9ae43a791831d4ca22cc4b93c3fc211d78aeb63a999a9f38d35efdb4c1392b7
```

But your server is trying to verify them using:
```
whsec_74BW... (some old/different secret)
```

This causes signature verification to fail silently, and the webhook events are rejected before they can process the credit addition.

## After Fixing

Once you update the secret and restart the server:

1. Try another test purchase
2. You should see in the logs:
```
================================================================================
🔔 WEBHOOK RECEIVED - START
📅 Timestamp: ...
🔐 Signature present: true
✅ Webhook signature verified
💳 Checkout session completed
✅ Added 120 credits to user
```

## Verification

After restarting, you can verify the correct secret is loaded:

```bash
curl http://localhost:3000/api/stripe/webhook
```

Should show:
```json
{
  "webhook_secret_prefix": "whsec_a9ae"
}
```

