# OpenAI Models Guide

## Available OpenAI Models in INFINITO

INFINITO now supports all major OpenAI models with different capabilities and pricing tiers. Admins can see the exact pricing for each model in the dropdown.

---

## GPT Models (Standard Chat)

### **GPT-4o** (Recommended)
- **Model ID**: `gpt-4o`
- **Best For**: Most general-purpose tasks
- **Pricing**: $2.50 per 1M input tokens, $10 per 1M output tokens
- **Features**: 
  - Latest and most capable model
  - Fastest response times
  - Best balance of quality and cost
  - 128K context window
  - Multimodal (can process images)

### **GPT-4o Mini**
- **Model ID**: `gpt-4o-mini`
- **Best For**: High-volume, low-cost tasks
- **Pricing**: $0.15 per 1M input tokens, $0.60 per 1M output tokens
- **Features**:
  - Most affordable GPT-4 level model
  - Very fast responses
  - Great for simple queries
  - 128K context window

### **GPT-4 Turbo**
- **Model ID**: `gpt-4-turbo`
- **Best For**: Complex reasoning tasks
- **Pricing**: $10 per 1M input tokens, $30 per 1M output tokens
- **Features**:
  - Previous flagship model
  - Strong reasoning capabilities
  - 128K context window
  - Vision capabilities

### **GPT-4** (Legacy)
- **Model ID**: `gpt-4`
- **Best For**: Maximum accuracy (legacy)
- **Pricing**: $30 per 1M input tokens, $60 per 1M output tokens
- **Features**:
  - Original GPT-4 model
  - Most expensive option
  - 8K context window
  - Being phased out in favor of GPT-4o

### **GPT-3.5 Turbo** (Legacy)
- **Model ID**: `gpt-3.5-turbo`
- **Best For**: Budget-conscious applications
- **Pricing**: $0.50 per 1M input tokens, $1.50 per 1M output tokens
- **Features**:
  - Cheapest option
  - Fast responses
  - Good for simple tasks
  - 16K context window
  - Lower quality than GPT-4 models

---

## O1 Models (Advanced Reasoning)

### **O1** (Reasoning)
- **Model ID**: `o1`
- **Best For**: Complex problem-solving, math, coding
- **Pricing**: $15 per 1M input tokens, $60 per 1M output tokens
- **Features**:
  - Advanced reasoning capabilities
  - "Thinks" before responding
  - Excels at math, science, coding
  - Slower response time (worth it for complex problems)
  - 128K context window

### **O1-Mini**
- **Model ID**: `o1-mini`
- **Best For**: Faster reasoning tasks
- **Pricing**: $3 per 1M input tokens, $12 per 1M output tokens
- **Features**:
  - Affordable reasoning model
  - Faster than O1
  - Good for STEM questions
  - 128K context window

### **O1-Preview** (Beta)
- **Model ID**: `o1-preview`
- **Best For**: Testing latest reasoning features
- **Pricing**: $15 per 1M input tokens, $60 per 1M output tokens
- **Features**:
  - Preview version of O1
  - Latest experimental features
  - Same pricing as O1
  - May have breaking changes

---

## Legacy Shortcuts (Backward Compatibility)

### **AiO** (GPT-3.5)
- **Model ID**: `openai`
- **Maps To**: `gpt-3.5-turbo`
- **Pricing**: $0.50 per 1M input tokens
- **Note**: Maintained for backward compatibility

### **GPT** (GPT-4)
- **Model ID**: `gpt`
- **Maps To**: `gpt-4`
- **Pricing**: $30 per 1M input tokens
- **Note**: Maintained for backward compatibility

---

## Pricing Comparison

| Model | Input (per 1M tokens) | Output (per 1M tokens) | Use Case |
|-------|----------------------|------------------------|----------|
| GPT-4o | $2.50 | $10.00 | Best overall choice |
| GPT-4o Mini | $0.15 | $0.60 | High-volume, low-cost |
| GPT-4 Turbo | $10.00 | $30.00 | Complex reasoning |
| GPT-4 | $30.00 | $60.00 | Legacy/Maximum accuracy |
| GPT-3.5 Turbo | $0.50 | $1.50 | Budget option |
| O1 | $15.00 | $60.00 | Advanced reasoning |
| O1-Mini | $3.00 | $12.00 | Affordable reasoning |
| O1-Preview | $15.00 | $60.00 | Beta reasoning |

---

## Cost Estimation Examples

**Average message** (500 input tokens, 200 output tokens):

| Model | Cost per message | Cost per 1000 messages |
|-------|------------------|------------------------|
| GPT-4o | $0.00325 | $3.25 |
| GPT-4o Mini | $0.000195 | $0.20 |
| GPT-4 Turbo | $0.011 | $11.00 |
| GPT-3.5 Turbo | $0.00055 | $0.55 |
| O1 | $0.0195 | $19.50 |

---

## Which Model Should I Use?

### For Most Tasks:
**GPT-4o** - Best balance of quality, speed, and cost

### For High Volume:
**GPT-4o Mini** - Nearly as good as GPT-4o, much cheaper

### For Budget Projects:
**GPT-3.5 Turbo** - Cheapest option, still quite capable

### For Math/Coding/Complex Problems:
**O1** or **O1-Mini** - Advanced reasoning capabilities

### For Maximum Quality (Legacy):
**GPT-4 Turbo** - Previous flagship, very capable but expensive

---

## Admin Features

When logged in as an admin (`role: "admin"`), you can:
- See the exact pricing for each model in the dropdown
- Monitor cost per request
- Enable/disable specific models in the admin preferences
- Set system-wide default models

---

## Setup

1. **Run the SQL migration**:
   ```bash
   psql your_database < add_openai_models.sql
   ```

2. **Add OpenAI API Key**:
   - Go to `/ai-settings` page
   - Add your OpenAI API key
   - Or contact admin to set system-wide key

3. **Select Model**:
   - Choose from the MODEL dropdown
   - Pricing info visible to admins
   - Models are enabled by default

---

## Notes

- All models support streaming responses for real-time output
- O1 models have slower initial response (they "think" first)
- GPT-4o supports vision (image input)
- Pricing is per token, not per character
- ~750 words = ~1000 tokens (rough estimate)

