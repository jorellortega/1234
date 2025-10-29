# RunwayML Credits Guide

## Two Credit Systems

INFINITO uses **two separate credit systems** for video generation:

### 1. INFINITO Credits (Internal)
- **Purpose**: Pay for using INFINITO's platform
- **Cost**: 26 credits per video generation
- **Where to buy**: `/credits` page in INFINITO
- **Status**: ✅ Automatically deducted before video generation

### 2. RunwayML API Credits (External)
- **Purpose**: Pay RunwayML for their AI video generation service
- **Cost**: Varies by model (see pricing below)
- **Where to buy**: https://app.runwayml.com/billing
- **Status**: ❌ Must be manually managed in your RunwayML account

## Why Two Systems?

INFINITO is a **platform** that uses RunwayML's **API** to generate videos. Think of it like:
- **INFINITO Credits** = Platform usage fee
- **RunwayML Credits** = Actual video generation cost (charged by RunwayML directly)

## RunwayML Pricing (Per Second)

| Model | Credits/Second | 5s Video | 10s Video | Speed | Quality |
|-------|---------------|----------|-----------|-------|---------|
| **VEO 3** | 40 | 200 | 400 | Slow | Highest |
| **VEO 3.1** | 40 | 200 | 400 | Medium | Very High |
| **VEO 3.1 Fast** | 20 | 100 | 200 | Fast | High |
| **Gen4 Turbo** | 5 | 25 | 50 | Very Fast | High |
| **Gen4 Aleph (V2V)** | 15 | 75 | 150 | Fast | Very High |
| **Act Two** | 5 | 25 | 50 | Fast | High |

*Note: Prices are based on duration. Longer videos cost proportionally more.*
*Source: [RunwayML API Pricing](https://api.dev.runwayml.com/docs)*

## How to Check RunwayML Credits

1. Go to https://app.runwayml.com
2. Log in with your RunwayML account
3. Click **"Billing"** in the left sidebar
4. See **"Current credits"** at the top

## How to Add RunwayML Credits

1. Go to https://app.runwayml.com/billing
2. Scroll to **"Autobilling"** or **"Buy Credits"**
3. Add credits (minimum usually $10-20)
4. Credits appear instantly

## Error: "You do not have enough credits"

If you see this error:
- ✅ Your **INFINITO credits** were deducted (26 credits)
- ❌ Your **RunwayML account** doesn't have enough credits

**Solution:**
1. Add more credits to your RunwayML account
2. **OR** try a cheaper model:
   - Switch from VEO → Gen3a Turbo (much cheaper)
   - Switch from VEO → Gen4 Turbo (moderate price)

## Best Practice

**For budget-conscious users:**
- Use **Gen4 Turbo** for most videos (5 credits/sec = 25-50 credits per video!)
- Use **VEO 3.1 Fast** for better quality (20 credits/sec = 100-200 credits per video)
- Use **VEO 3/3.1** only for final/premium videos (40 credits/sec = 200-400 credits per video)

**Credit recommendations:**
- Minimum RunwayML credits: **500** (10-20 videos with Gen4 Turbo)
- Comfortable amount: **2000+** (20-40 videos with VEO 3.1 Fast)
- For VEO 3/3.1 models: **5000+** (12-25 VEO videos)

## Troubleshooting

### "I have 4370 INFINITO credits but video generation failed"
- Check your **RunwayML** account credits, not INFINITO credits
- RunwayML needs separate credits in their system

### "Video generation is expensive"
- Try Gen3a Turbo instead of VEO models
- Use shorter durations (5s instead of 10s)
- Lower resolution (720:1280 instead of 1080:1920)

### "Can I get a refund on INFINITO credits?"
- If video generation fails due to RunwayML credits, contact support
- INFINITO credits are deducted upfront to prevent abuse

## Future Enhancement Ideas

- Display RunwayML credit balance in INFINITO UI
- Automatic credit top-up integration
- Estimated RunwayML cost per generation
- Credit bundle packages

---

**Last Updated**: October 28, 2025

