# 🚨 CRITICAL: Test Webhook NOW

## I just restarted your Stripe listener!

### Step 1: Check Your Next.js Server Logs

Look at your Next.js terminal RIGHT NOW. Did you see this after I ran `stripe trigger`?

```
================================================================================
🔔 WEBHOOK RECEIVED - START
📅 Timestamp: 2025-10-25T...
📦 Event type: checkout.session.completed
```

### ✅ If YES - Webhooks are working!
- Now do a test purchase
- You'll see credits added in real-time
- Problem solved!

### ❌ If NO - The listener isn't forwarding

This means one of these issues:

1. **Stripe listener terminal closed** - You need to keep it open!
2. **Port conflict** - Something else is using the port
3. **Firewall blocking localhost connections**

## Quick Test

Run this command and check your Next.js logs:

```bash
stripe trigger checkout.session.completed
```

You MUST see the `================` webhook banner in your Next.js terminal.

If you don't see it, the Stripe listener is not forwarding events to your server.

## Solution: Manual Listener

Open a NEW terminal window and run:

```bash
cd /Users/covionstudio/Desktop/WEBSITES/INFINITO
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
```

Keep this terminal OPEN. You should see:

```
> Ready! Your webhook signing secret is whsec_xxxxx
```

Then when events happen:

```
2025-10-25 12:XX:XX  --> checkout.session.completed [evt_xxx]
2025-10-25 12:XX:XX  <-- [200] POST http://localhost:3000/api/stripe/webhook
```

## Test Purchase Flow

1. Keep Stripe listener terminal open
2. Keep Next.js terminal visible  
3. Go to http://localhost:3000/credits
4. Buy 50 credits ($5)
5. Use card: 4242 4242 4242 4242
6. Watch BOTH terminals

**Stripe Listener Terminal** should show:
```
--> checkout.session.completed
<-- [200] POST
```

**Next.js Terminal** should show:
```
================================================================================
🔔 WEBHOOK RECEIVED - START
✅ Added 50 credits
```

If you see both, credits will be added!

