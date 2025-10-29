# INFINITO Credit Pricing Structure
## 60% Markup on All External API Costs

---

## Pricing Philosophy

**All INFINITO credit costs include a 60% markup** over the actual API provider costs. This covers:
- Platform maintenance
- Infrastructure costs
- Support and development
- Business sustainability

---

## Text Models (OpenAI)

### Current Implementation:
- **GPT-4o, GPT-4, GPT-3.5, O1, etc.**: Variable cost based on tokens
- **Vision Models (BLIP, LLaVA)**: 3 credits
- **Standard Text**: 1 credit

### Recommended Fixed Pricing with 60% Markup:

| Model | Avg API Cost/msg | 60% Markup | INFINITO Credits | Current |
|-------|------------------|------------|------------------|---------|
| **GPT-4o** | $0.003 | +$0.0018 | **5 credits** | ❌ 1 credit |
| **GPT-4o Mini** | $0.0002 | +$0.00012 | **1 credit** | ✅ 1 credit |
| **GPT-4 Turbo** | $0.011 | +$0.0066 | **18 credits** | ❌ 1 credit |
| **GPT-4** | $0.027 | +$0.0162 | **43 credits** | ❌ 1 credit |
| **GPT-3.5 Turbo** | $0.0006 | +$0.00036 | **1 credit** | ✅ 1 credit |
| **O1 (Reasoning)** | $0.020 | +$0.012 | **32 credits** | ❌ 1 credit |
| **O1-Mini** | $0.004 | +$0.0024 | **6 credits** | ❌ 1 credit |
| **Vision (BLIP/LLaVA)** | FREE (local) | N/A | **0 credits** | ❌ 3 credits |

*Note: $0.001 = 1 credit (1:1000 ratio for easy conversion)*

---

## Image Models

### Current Implementation:
- **DALL-E 3**: 13 credits ✅ (API: ~$0.04 → 40 credits, but we're charging 13)
- **RunwayML Gen4 Image**: 16 credits ❌ (API: 5 credits → should be 8)
- **RunwayML Gen4 Image Turbo**: 16 credits ❌ (API: 2 credits → should be 3)
- **Gemini 2.5 Flash**: 16 credits ❌ (API: 5 credits → should be 8)

### Corrected Pricing with 60% Markup:

| Model | RunwayML API Cost | 60% Markup | INFINITO Credits | Current |
|-------|-------------------|------------|------------------|---------|
| **DALL-E 3** | varies (~$0.04) | +varies | **40 credits** ⚠️ | 13 credits (underpriced) |
| **Gen4 Image** | 5 credits | +3 | **8 credits** | 16 credits (overpriced) |
| **Gen4 Image Turbo** | 2 credits | +1.2 | **3 credits** | 16 credits (overpriced) |
| **Gemini 2.5 Flash** | 5 credits | +3 | **8 credits** | 16 credits (overpriced) |
| **Gen4 (Legacy)** | 5 credits | +3 | **8 credits** | 16 credits (overpriced) |
| **BLIP/LLaVA** | FREE (local) | N/A | **0 credits** | FREE ✅ |

---

## Video Models

### Current Implementation:
- **All RunwayML Models**: 26 credits (flat rate)

### Corrected Pricing with 60% Markup:

| Model | RunwayML Cost (5s) | 60% Markup | INFINITO Credits | Current |
|-------|-------------------|------------|------------------|---------|
| **Gen4 Turbo** | 25 credits | +15 | **40 credits** | 26 (underpriced) |
| **Gen3a Turbo** | 50 credits | +30 | **80 credits** | 26 (severely underpriced) |
| **VEO 3.1** | 200 credits | +120 | **320 credits** | 26 (severely underpriced) |
| **VEO 3.1 Fast** | 100 credits | +60 | **160 credits** | 26 (severely underpriced) |
| **VEO 3** | 320 credits (8s) | +192 | **512 credits** | 26 (severely underpriced) |
| **Gen4 Aleph** | 75 credits | +45 | **120 credits** | 26 (severely underpriced) |

**⚠️ CRITICAL: Your video pricing is currently losing money on most models!**

---

## Audio Models (ElevenLabs)

### Current Implementation:
- **Not charging credits yet**

### Recommended Pricing with 60% Markup:

| Model | ElevenLabs Cost | 60% Markup | INFINITO Credits |
|-------|-----------------|------------|------------------|
| **ElevenLabs TTS** | ~$0.30/1K chars | +$0.18 | **48 credits/1K chars** |
| **Short Audio (100 chars)** | ~$0.03 | +$0.018 | **5 credits** |
| **Medium Audio (500 chars)** | ~$0.15 | +$0.09 | **24 credits** |

---

## Recommended Action Plan

### Phase 1: Fix Video Pricing (URGENT)
```typescript
// app/page.tsx - Video credit costs
const videoCredits = {
  'gen4_turbo': 40,        // was 26
  'gen3a_turbo': 80,       // was 26
  'veo3.1': 320,           // was 26
  'veo3.1_fast': 160,      // was 26
  'veo3': 512,             // was 26 (8 seconds)
  'gen4_aleph': 120        // was 26
}
```

### Phase 2: Fix Image Pricing
```typescript
// app/page.tsx - Image credit costs
const imageCredits = {
  'dalle_image': 40,           // was 13
  'gen4_image': 8,             // was 16
  'gen4_image_turbo': 3,       // was 16
  'gemini_2.5_flash': 8,       // was 16
  'runway_image': 8            // was 16
}
```

### Phase 3: Fix Text Model Pricing
```typescript
// app/page.tsx - Text credit costs (per message)
const textCredits = {
  'gpt-4o': 5,                // was 1
  'gpt-4o-mini': 1,           // OK
  'gpt-4-turbo': 18,          // was 1
  'gpt-4': 43,                // was 1
  'gpt-3.5-turbo': 1,         // OK
  'o1': 32,                   // was 1
  'o1-mini': 6,               // was 1
  'o1-preview': 32,           // was 1
  'blip': 0,                  // was 3 (should be free)
  'llava': 0                  // was 3 (should be free)
}
```

### Phase 4: Add Audio Pricing
```typescript
// Charge per audio generation based on character count
const audioCreditsPerChar = 0.048 // 48 credits per 1000 chars
```

---

## Current Revenue Analysis

### What You're Currently Charging:
- Text: **1 credit/msg** (flat rate)
- Vision: **3 credits/msg**
- Image: **13-16 credits/img**
- Video: **26 credits/video** (flat rate)
- Audio: **0 credits** (free)

### What You're Actually Spending (API Costs):

**Video (biggest issue):**
- Gen4 Turbo: Charging 26, Costing 25 = **+1 profit** ✅ (tiny margin)
- Gen3a Turbo: Charging 26, Costing 50 = **-24 loss per video** ❌
- VEO 3.1: Charging 26, Costing 200 = **-174 loss per video** ❌❌❌
- VEO 3: Charging 26, Costing 320 = **-294 loss per video** ❌❌❌

**Text (variable loss):**
- GPT-4o: Charging 1, Should charge 5 = **-4 loss per msg**
- GPT-4: Charging 1, Should charge 43 = **-42 loss per msg**
- O1: Charging 1, Should charge 32 = **-31 loss per msg**

**Image (some overpriced, DALL-E underpriced):**
- DALL-E: Charging 13, Should charge 40 = **-27 loss per image**
- RunwayML: Charging 16, Should charge 3-8 = **+8-13 overcharge** (compensating for other losses)

---

## Implementation Priority

1. **🚨 URGENT: Fix video pricing** (currently losing money)
2. **🔴 HIGH: Fix text model pricing** (GPT-4, O1 series underpriced)
3. **🟡 MEDIUM: Fix image pricing** (DALL-E underpriced, RunwayML overpriced)
4. **🟢 LOW: Add audio pricing** (currently free)

---

## Grandfather Clause Considerations

If users already bought credits at current prices, consider:
- **Grandfathering** existing credits (honor old pricing)
- **Clear communication** about new pricing
- **Grace period** before price changes
- **Credit bonuses** to ease transition

---

**Last Updated**: October 28, 2025
**Pricing Model**: 60% markup on all external API costs

