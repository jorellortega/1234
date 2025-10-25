# 🔍 Webhook Troubleshooting Guide

## Issue Identified: Wrong Webhook Secret

Your webhook endpoint is configured correctly, but it has the **WRONG webhook secret**.

### Current State:
- ✅ Webhook endpoint is accessible: `http://localhost:3000/api/stripe/webhook`
- ✅ Stripe CLI is running and listening
- ✅ Stripe CLI webhook secret: `whsec_a9ae43a791831d4ca22cc4b93c3fc211d78aeb63a999a9f38d35efdb4c1392b7`
- ❌ Server is using: `whsec_74BW...` (WRONG!)

## 🔧 Step-by-Step Fix

### Step 1: Update `.env.local`

Open `/Users/covionstudio/Desktop/WEBSITES/INFINITO/.env.local` and ensure it contains:

```env
STRIPE_WEBHOOK_SECRET=whsec_a9ae43a791831d4ca22cc4b93c3fc211d78aeb63a999a9f38d35efdb4c1392b7
```

**Important:** Make sure there are:
- No extra spaces
- No quotes around the value
- No extra characters

### Step 2: Restart Next.js Server

1. Stop your current dev server (Ctrl+C)
2. Start it again:
```bash
cd /Users/covionstudio/Desktop/WEBSITES/INFINITO
npm run dev
```

### Step 3: Verify Configuration

Run this command to check if the correct secret is loaded:

```bash
curl http://localhost:3000/api/stripe/webhook
```

Expected output should show:
```json
{
  "webhook_secret_prefix": "whsec_a9ae"
}
```

If it still shows `whsec_74BW`, the file wasn't updated correctly or the server didn't restart.

### Step 4: Test with Stripe CLI

Trigger a test event:

```bash
stripe trigger payment_intent.succeeded
```

Check your Next.js server logs. You should see:
```
================================================================================
🔔 WEBHOOK RECEIVED - START
📅 Timestamp: 2025-10-25T...
🔐 Signature present: true
🔐 Signature value: t=...
🔑 Webhook secret configured: true
🔑 Webhook secret length: 71
```

### Step 5: Test with Real Purchase

1. Go to `http://localhost:3000/credits`
2. Click on 120 credits ($12)
3. Use test card: `4242 4242 4242 4242`
4. Complete purchase

Expected logs in your Next.js server:
```
================================================================================
🔔 WEBHOOK RECEIVED - START
🔐 Verifying webhook signature...
✅ Webhook signature verified
📦 Event type: checkout.session.completed
💳 Checkout session completed: cs_test_xxx
👤 User ID: d6c6adba-2b70-4121-b6ca-a07335c0de67
💰 Credits to add: 120
✅ Added 120 credits to user
💳 Credit Balance Change:
📊 Old Balance: 5073
📊 New Balance: 5193
✅ Change Applied: true
```

## 🐛 Still Not Working?

### Check Stripe CLI Status

Make sure the Stripe CLI listener is still running:

```bash
ps aux | grep "stripe listen"
```

If not running, restart it:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### Check for Port Conflicts

Make sure your Next.js server is running on port 3000:

```bash
lsof -i :3000
```

### View Real-Time Logs

In your Stripe CLI terminal (the one running `stripe listen`), you should see:

```
2025-10-25 12:XX:XX  --> checkout.session.completed [evt_xxx]
2025-10-25 12:XX:XX  <-- [200] POST http://localhost:3000/api/stripe/webhook
```

If you see `<-- [500]` or `<-- [400]`, the webhook is reaching your server but failing.

### Check Environment Variables

Create a test endpoint to verify all env vars:

```bash
curl http://localhost:3000/api/stripe/webhook-test
```

## 📊 Debug Checklist

- [ ] `.env.local` file exists in project root
- [ ] `.env.local` contains correct `STRIPE_WEBHOOK_SECRET`
- [ ] Next.js dev server was restarted after updating `.env.local`
- [ ] `curl http://localhost:3000/api/stripe/webhook` shows correct secret prefix
- [ ] Stripe CLI `stripe listen` is running
- [ ] `stripe trigger payment_intent.succeeded` shows webhook in logs
- [ ] Test purchase shows webhook received in Next.js logs

## 🎯 Expected Flow

1. User completes purchase on Stripe checkout
2. Stripe sends webhook to Stripe CLI listener
3. Stripe CLI forwards to `localhost:3000/api/stripe/webhook`
4. Your server verifies signature with matching secret
5. Server processes `checkout.session.completed` event
6. Server calls `add_user_credits` database function
7. Credits are added to user's account
8. Transaction is logged
9. Success page shows updated credit balance

If ANY step fails, credits won't be added.

