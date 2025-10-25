# Stripe Webhook Local Testing Setup

## ✅ Setup Complete!

The Stripe CLI is now installed and configured. A webhook listener is running in the background to forward Stripe events to your local server.

## 🔑 Important: Get Your Webhook Secret

When you ran `stripe listen --forward-to localhost:3000/api/stripe/webhook`, the terminal displayed a webhook signing secret that looks like:

```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxxxxxxxxxx (^C to quit)
```

### Add This Secret to Your Environment Variables

1. Copy the `whsec_xxxxx` secret from the terminal output
2. Add it to your `.env.local` file:

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx
```

3. Restart your Next.js development server for the changes to take effect

## 🧪 Testing the Credit Purchase Flow

Now you can test the complete credit purchase flow:

### 1. Make a Test Purchase

1. Go to `http://localhost:3000/credits`
2. Click on any credit package
3. Complete the test payment using Stripe test card: `4242 4242 4242 4242`
4. Use any future expiry date (e.g., 12/28)
5. Use any 3-digit CVC (e.g., 123)
6. Use any ZIP code (e.g., 12345)

### 2. Watch the Logs

You should see detailed logs in **three places**:

#### A. Stripe CLI Terminal (Background Process)
```
2025-10-25 12:30:45  --> checkout.session.completed [evt_xxx]
2025-10-25 12:30:45  <-- [200] POST http://localhost:3000/api/stripe/webhook
```

#### B. Next.js Server Terminal
```
🔔 Webhook received
📅 Timestamp: 2025-10-25T19:30:45.000Z
🔐 Verifying webhook signature...
✅ Webhook signature verified
💳 Checkout session completed: cs_test_xxx
👤 User ID: d6c6adba-2b70-4121-b6ca-a07335c0de67
💰 Credits to add: 120
✅ Added 120 credits to user d6c6adba-2b70-4121-b6ca-a07335c0de67
💳 Credit Balance Change:
👤 User: d6c6adba-2b70-4121-b6ca-a07335c0de67
🔄 Operation: add
💵 Amount: +120
📊 Old Balance: 5073
📊 New Balance: 5193
✅ Change Applied: true
```

#### C. Browser Console (Payment Success Page)
```
🔄 Payment success page: Starting credit fetch
👤 User authentication: {user: true, userId: "xxx", ...}
📊 Profile fetch result: {credits: 5193, ...}
✅ Credits set to: 5193
```

## 🐛 Troubleshooting

### Issue: Webhook Not Received

**Check:**
1. Is the Stripe CLI listener running? Look for the background process
2. Is the webhook secret in your `.env.local` file?
3. Did you restart your Next.js dev server after adding the secret?

**Solution:**
```bash
# Stop any existing listener
pkill -f "stripe listen"

# Start a new listener in a separate terminal
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Copy the webhook secret and add to .env.local
# Restart your Next.js server
```

### Issue: Signature Verification Failed

**Check:**
- The webhook secret in `.env.local` matches the one shown by `stripe listen`
- You restarted your Next.js server after updating `.env.local`

### Issue: Credits Still Not Added

**Check:**
1. Look for error messages in the webhook logs
2. Verify the user ID in the session metadata matches your authenticated user
3. Use the debug API to test: `POST /api/debug/credits` with your userId

## 🎯 Manual Testing

You can also manually trigger test webhook events:

```bash
# Trigger a test checkout.session.completed event
stripe trigger checkout.session.completed
```

Or test with specific data:

```bash
# Test the credit addition directly
curl -X POST http://localhost:3000/api/debug/credits \
  -H "Content-Type: application/json" \
  -d '{"userId": "d6c6adba-2b70-4121-b6ca-a07335c0de67", "credits": 10, "description": "Test"}'
```

## 📝 Next Steps for Production

When deploying to production:

1. Go to your Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Enter your production URL: `https://yourdomain.com/api/stripe/webhook`
4. Select event: `checkout.session.completed`
5. Copy the webhook signing secret
6. Add it to your production environment variables

## 🔄 Stopping the Webhook Listener

To stop the background webhook listener:

```bash
pkill -f "stripe listen"
```

To check if it's running:

```bash
ps aux | grep "stripe listen"
```

## 📚 Additional Resources

- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Testing Webhooks Locally](https://stripe.com/docs/webhooks/test)

