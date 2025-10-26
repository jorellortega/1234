# GPT Model Versions Used in INFINITO

## Current Model Usage

### 1. **AiO Mode (Default - OpenAI)**
- **Model**: `gpt-4`
- **File**: `app/api/generate/route.ts`
- **Line**: 286
- **Usage**: Used when mode is set to "openai" for text generation

### 2. **GPT Mode (OpenAI Streaming)**
- **Model**: `gpt-3.5-turbo`
- **File**: `app/api/generate-stream/route.ts`
- **Line**: 214
- **Usage**: Used when mode is set to "gpt" for streaming text generation

## Key Differences

| Mode | Model | Type | When Used |
|------|-------|------|-----------|
| **openai** | `gpt-4` | Non-streaming | Full response mode |
| **gpt** | `gpt-3.5-turbo` | Streaming | Real-time streaming |

## Notes

- **gpt-4** is more powerful and accurate but slower and more expensive
- **gpt-3.5-turbo** is faster and cheaper, optimized for streaming responses
- Both models are accessed through the OpenAI Chat Completions API
- API keys are stored securely in the database and retrieved dynamically

## To Change Model Version

To update the model version, modify these files:

1. **For non-streaming (AiO mode)**: Edit `app/api/generate/route.ts` line 286
   ```typescript
   model: "gpt-4"  // Change this to any available OpenAI model
   ```

2. **For streaming (GPT mode)**: Edit `app/api/generate-stream/route.ts` line 214
   ```typescript
   model: "gpt-3.5-turbo"  // Change this to any available OpenAI model
   ```

## Available OpenAI Models (as of 2024)

- `gpt-4`
- `gpt-4-turbo-preview`
- `gpt-4-0125-preview`
- `gpt-3.5-turbo`
- `gpt-3.5-turbo-16k`
- And other newer models

Check OpenAI's [official documentation](https://platform.openai.com/docs/models) for the latest available models.
