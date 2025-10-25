# 🔥 REAL DEBUGGING - Let's Actually See What's Happening

## I just added REAL debug tools. Here's what to do:

### Step 1: Restart Your Next.js Server
The middleware and debug endpoint need to be loaded.

```bash
# Stop server (Ctrl+C)
# Then start again:
npm run dev
```

### Step 2: Test the Debug Endpoint First

In a new terminal, run:
```bash
curl -X POST http://localhost:3000/api/stripe/webhook-debug -d '{"test":"data"}'
```

**Look at your Next.js terminal.** You MUST see:
```
🟢🟢🟢 WEBHOOK-DEBUG ENDPOINT HIT! 🟢🟢🟢
```

If you DON'T see this, your Next.js server has a problem.

### Step 3: Test Stripe Listener with Debug Endpoint

In your Stripe CLI terminal, **temporarily** change the forward URL:

```bash
# Stop current listener (Ctrl+C)
# Start with debug endpoint:
stripe listen --forward-to http://localhost:3000/api/stripe/webhook-debug
```

Then trigger a test:
```bash
stripe trigger checkout.session.completed
```

**Check your Next.js terminal** - you should see:
```
🟢🟢🟢 WEBHOOK-DEBUG ENDPOINT HIT! 🟢🟢🟢
```

And in Stripe CLI you should see:
```
--> checkout.session.completed
<-- [200] POST http://localhost:3000/api/stripe/webhook-debug
```

### Step 4: If Debug Works, Switch Back

If the debug endpoint works, the problem is in the main webhook handler.

Stop the listener and restart with main endpoint:
```bash
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
```

### Step 5: Do a Real Purchase

Now try a purchase and watch for:

**In Next.js terminal:**
```
🚨 MIDDLEWARE: Webhook request intercepted!
================================================================================
🔔 WEBHOOK RECEIVED - START
```

**In Stripe CLI terminal:**
```
--> checkout.session.completed
<-- [???] POST http://localhost:3000/api/stripe/webhook
```

The `[???]` will tell us what's wrong:
- `[200]` = SUCCESS! Credits should be added
- `[400]` = Signature verification failed (wrong webhook secret)
- `[500]` = Server error (check logs for details)
- Nothing = Request never reached endpoint

## What To Report Back

Tell me:
1. Did the debug endpoint test work? (Step 2)
2. Did Stripe CLI forward to debug endpoint work? (Step 3)
3. What status code do you see in Stripe CLI when using main endpoint? (Step 5)
4. Do you see the middleware log `🚨 MIDDLEWARE`?
5. Do you see the main webhook log `🔔 WEBHOOK RECEIVED`?

This will tell me EXACTLY where the problem is!

