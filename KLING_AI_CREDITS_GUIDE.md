# Kling AI Credits Guide

## ⚠️ Important: Two Separate Credit Systems

Kling AI has **TWO completely separate credit systems**:

### 1. Website Credits (Kling AI App)
- **Where**: klingai.com web interface
- **Used for**: Desktop/mobile app video generation
- **Your balance**: 513 credits (from your screenshot)
- **Where to see**: Main Kling AI app account page
- **Usage**: NOT used for API calls

### 2. API Credits (Developer Console)
- **Where**: Developer console (api-key.klingai.com)
- **Used for**: API integration like INFINITO
- **Your balance**: 0 credits (need to purchase)
- **Where to see**: https://app.klingai.com/global/dev/api-key or billing page
- **Usage**: Required for all API calls

## Why Two Systems?

Just like RunwayML and other AI platforms, Kling AI separates:
- **Consumer-facing credits** (website app)
- **Developer-facing credits** (API access)

This allows different pricing and billing models for different use cases.

## How to Add API Credits

1. **Visit the pricing page**:
   ```
   https://klingai.com/global/dev/pricing
   ```

2. **Choose a Video Generation API Resource Package**:

   **🎁 Trial Package (Recommended to start)**:
   - **$9.79** for 100 units (5-second videos)
   - **$97.99** for 1,000 units
   - Valid for 30 days
   - Limited to one purchase per account

   **💼 Production Packages**:
   - **Package 1**: $4,200 for 30,000 units ($0.14/unit)
   - **Package 2**: $6,300 for 45,000 units ($0.126/unit) - 10% off
   - **Package 3**: $8,400 for 60,000 units ($0.112/unit) - 20% off
   - Valid for 90 days

   **📊 Pricing breakdown**:
   - Pro mode, 5s video: 2.5 units ($0.35)
   - Pro mode, 10s video: 5 units ($0.70)

3. **Purchase your package** from the pricing page

4. **Verify your balance**:
   - Go to https://app.klingai.com/global/dev/api-key
   - Check "Account Information Inquiry" or billing section
   - Look for API-specific credit balance

5. **Try generating a video again** in INFINITO

## How to Check API Credits

Based on the Kling AI documentation, you can:
1. Log in to the developer console: https://app.klingai.com/global/dev/api-key
2. Look for "Account Information Inquiry" or billing section
3. Check your API credit balance

## Common Confusion

**You might see**:
- ✅ 513 credits in your regular Kling AI account
- ❌ Error saying "Account balance not enough"

**Why?**
- You have website credits ✓
- You DON'T have API credits ✗

**Solution**: Purchase API credits separately from the developer console.

## Pricing Comparison

Similar to RunwayML's dual credit system:
- **Regular usage**: Cheaper, for consumers
- **API usage**: Different pricing, for developers

## Error Messages

If you see: `"Account balance not enough"` (code 1102):
- This means your **API credits** are low
- Not your website credits
- Purchase API resource package to fix

## Next Steps

1. Visit: https://klingai.com/global/dev/model/video
2. Purchase an API resource package
3. Check your developer console balance
4. Try generating a video in INFINITO

---

For more information, see [KLING_AI_SETUP.md](./KLING_AI_SETUP.md)

