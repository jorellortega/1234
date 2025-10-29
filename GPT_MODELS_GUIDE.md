# GPT Models Management System

## Overview
Complete admin system for managing OpenAI GPT model availability and preferences across INFINITO.

## Page Location
**URL**: `/gpt-models` (Admin only)

## Features

### 1. **Comprehensive Model Catalog**
All 50+ OpenAI models organized into categories:

#### **GPT-5 Series** (7 models)
- gpt-5, gpt-5-mini, gpt-5-nano
- gpt-5-chat-latest, gpt-5-codex, gpt-5-pro
- gpt-5-search-api

#### **GPT-4.1 Series** (3 models)
- gpt-4.1, gpt-4.1-mini, gpt-4.1-nano

#### **GPT-4o Series** (3 models)
- gpt-4o, gpt-4o-2024-05-13, gpt-4o-mini

#### **O-Series (Reasoning)** (9 models)
- o1, o1-mini, o1-pro
- o3, o3-mini, o3-pro, o3-deep-research
- o4-mini, o4-mini-deep-research

#### **Real-Time Models** (4 models)
- gpt-realtime, gpt-realtime-mini
- gpt-4o-realtime-preview, gpt-4o-mini-realtime-preview

#### **Audio Models** (4 models)
- gpt-audio, gpt-audio-mini
- gpt-4o-audio-preview, gpt-4o-mini-audio-preview

#### **Image Models** (2 models)
- gpt-image-1, gpt-image-1-mini

#### **Search Models** (2 models)
- gpt-4o-search-preview, gpt-4o-mini-search-preview

#### **Codex Models** (1 model)
- codex-mini-latest

#### **Special Models** (1 model)
- computer-use-preview

#### **Legacy GPT-4** (8 models)
- chatgpt-4o-latest, gpt-4-turbo-2024-04-09
- gpt-4-0125-preview, gpt-4-1106-preview
- gpt-4-1106-vision-preview, gpt-4-0613
- gpt-4-0314, gpt-4-32k

#### **Legacy GPT-3.5** (7 models)
- gpt-3.5-turbo, gpt-3.5-turbo-0125
- gpt-3.5-turbo-1106, gpt-3.5-turbo-0613
- gpt-3.5-0301, gpt-3.5-turbo-instruct
- gpt-3.5-turbo-16k-0613

#### **Base Models** (2 models)
- davinci-002, babbage-002

### 2. **Model Information Display**

Each model shows:
- ✅ **Model ID**: Exact API identifier
- ✅ **Model Name**: Human-readable name
- ✅ **Input Cost**: Per 1M tokens (Standard Tier)
- ✅ **Output Cost**: Per 1M tokens (Standard Tier)
- ✅ **Cached Input Cost**: Per 1M tokens (if available)
- ✅ **Description**: Model capabilities/purpose
- ✅ **Enabled Status**: Toggle on/off

### 3. **Quick Stats Dashboard**

Shows:
- Total number of models (50+)
- Number of enabled models
- Number of categories (13)

### 4. **Enable/Disable System**

- Click the checkmark/X button to toggle each model
- Green = Enabled (available to users)
- Red = Disabled (hidden from users)
- Changes are saved to database

### 5. **Category Organization**

Models grouped by:
- Functionality (text, audio, image, search)
- Generation (GPT-5, GPT-4.1, GPT-4o, GPT-3.5)
- Purpose (reasoning, real-time, legacy)

## Database Schema

### Table: `gpt_model_preferences`

```sql
CREATE TABLE gpt_model_preferences (
  id UUID PRIMARY KEY,
  model_id TEXT NOT NULL UNIQUE,
  model_name TEXT NOT NULL,
  input_cost NUMERIC(10, 5) NOT NULL,
  output_cost NUMERIC(10, 5) NOT NULL,
  cached_input_cost NUMERIC(10, 5),
  enabled BOOLEAN DEFAULT true,
  category TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## API Endpoints

### GET `/api/admin/gpt-models`
Fetches all model preferences.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "models": [
    {
      "model_id": "gpt-4o",
      "model_name": "GPT-4o",
      "input_cost": 2.50,
      "output_cost": 10.00,
      "cached_input_cost": 1.25,
      "enabled": true,
      "category": "GPT-4o Series",
      "description": "GPT-4 Optimized"
    }
  ]
}
```

### POST `/api/admin/gpt-models`
Saves model preferences.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Body:**
```json
{
  "models": [
    {
      "id": "gpt-4o",
      "name": "GPT-4o",
      "inputCost": 2.50,
      "outputCost": 10.00,
      "cachedInputCost": 1.25,
      "enabled": true,
      "category": "GPT-4o Series",
      "description": "GPT-4 Optimized"
    }
  ]
}
```

## Setup Instructions

### 1. Run SQL Migration
Execute the SQL file to create the table:
```bash
psql -h <supabase-host> -U postgres -d postgres -f create_gpt_model_preferences.sql
```

### 2. Verify RLS Policies
- Authenticated users can READ model preferences
- Only admins can INSERT/UPDATE/DELETE

### 3. Access the Page
Navigate to: `/gpt-models` (must be logged in as admin)

### 4. Configure Models
1. Toggle models on/off based on your needs
2. Click "Save Preferences"
3. Preferences are applied across all INFINITO pages

## Usage in Other Pages

### Fetching Enabled Models

```typescript
const { data: models } = await supabase
  .from('gpt_model_preferences')
  .select('*')
  .eq('enabled', true)
  .order('category', { ascending: true })
```

### Building Model Selector Dropdown

```typescript
const enabledModels = models.filter(m => m.enabled)
const categories = [...new Set(enabledModels.map(m => m.category))]

categories.map(category => {
  const categoryModels = enabledModels.filter(m => m.category === category)
  return (
    <optgroup label={category}>
      {categoryModels.map(model => (
        <option key={model.model_id} value={model.model_id}>
          {model.model_name}
        </option>
      ))}
    </optgroup>
  )
})
```

### Cost Calculation

```typescript
async function calculateCost(modelId: string, inputTokens: number, outputTokens: number) {
  const { data: model } = await supabase
    .from('gpt_model_preferences')
    .select('input_cost, output_cost')
    .eq('model_id', modelId)
    .single()
  
  if (!model) return 0
  
  const inputCostPerToken = model.input_cost / 1000000
  const outputCostPerToken = model.output_cost / 1000000
  
  const totalCost = (inputTokens * inputCostPerToken) + (outputTokens * outputCostPerToken)
  const costWithMarkup = totalCost * 1.6 // 60% markup
  
  return costWithMarkup
}
```

## Default Enabled Models

By default, these models are enabled:
- ✅ GPT-5, GPT-5 Mini, GPT-5 Nano
- ✅ GPT-4.1, GPT-4.1 Mini, GPT-4.1 Nano
- ✅ GPT-4o, GPT-4o Mini
- ✅ O1, O1-Mini, O3, O3-Mini, O4-Mini
- ✅ GPT-4 Turbo, ChatGPT-4o Latest
- ✅ GPT-3.5 Turbo

Premium/Specialized models disabled by default:
- ❌ GPT-5 Pro, O1 Pro, O3 Pro (very expensive)
- ❌ Real-time models (specialized use)
- ❌ Audio models (specialized use)
- ❌ Image models (specialized use)
- ❌ Search models (preview/beta)
- ❌ Most legacy models (outdated)

## Cost Reference (OpenAI Standard Tier)

### Most Affordable:
- GPT-5 Nano: $0.05 in / $0.40 out
- GPT-4o Mini: $0.15 in / $0.60 out
- GPT-4.1 Nano: $0.10 in / $0.40 out

### Balanced:
- GPT-5: $1.25 in / $10.00 out
- GPT-4o: $2.50 in / $10.00 out
- GPT-4.1: $2.00 in / $8.00 out

### Premium:
- O1: $15.00 in / $60.00 out
- GPT-4 Turbo: $10.00 in / $30.00 out

### Ultra-Premium:
- O1 Pro: $150.00 in / $600.00 out
- GPT-5 Pro: $15.00 in / $120.00 out

## Future Integration

This system is designed to be used by:
1. Homepage prompt model selector
2. AI Settings page model configuration
3. Admin analytics for cost tracking
4. API usage reports
5. User-facing model selection dropdowns
6. Automatic cost calculation for billing

## Notes

- All costs are per 1M tokens (OpenAI Standard Tier)
- Cached input costs available for some models (prompt caching)
- Model availability subject to OpenAI's API
- Preferences saved per admin, applied globally
- Real-time updates when models are toggled

## Troubleshooting

### Models not showing up
- Check that table exists: `SELECT * FROM gpt_model_preferences LIMIT 1;`
- Verify RLS policies allow reads
- Check admin role: `SELECT role FROM profiles WHERE id = auth.uid();`

### Can't save preferences
- Verify admin role
- Check SUPABASE_SERVICE_ROLE_KEY is set
- Review API logs for errors

### Pricing outdated
- Update costs manually in the page
- OpenAI pricing may change - refer to their official docs

