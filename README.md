# INFINITO AI Frontend

Next.js 15 frontend for the INFINITO AI Personal Memory System.

## 🚀 Features

- **Modern UI**: Built with Next.js 15, React 19, and Tailwind CSS
- **AI Integration**: Multiple AI backend support
- **Memory Management**: Hierarchical memory organization
- **Document Processing**: PDF and Word document upload
- **Real-time Streaming**: Live AI response streaming

## 📦 Dependencies

See `package.json` for all Node.js dependencies.

## 🔧 Environment Variables

See [ENV_SETUP_TEMPLATE.md](./ENV_SETUP_TEMPLATE.md) for complete setup instructions.

**Quick reference:**
```env
# Core Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Video Generation APIs
RUNWAYML_API_SECRET=key_xxxxxxxxxxxxx
KLING_ACCESS_KEY=ak_xxxxxxxxxxxxxxxxxxxxxxxxx
KLING_SECRET_KEY=sk_xxxxxxxxxxxxxxxxxxxxxxxxx

# Payment Processing
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx

# Backend
NEXT_PUBLIC_API_BASE_URL=your_railway_backend_url
```

## 🚀 Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

## 🚀 Vercel Deployment

This frontend is configured for Vercel deployment with:

- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Node.js Version**: 18.x

## 📱 Pages

- `/` - Main AI interface
- `/memory-core` - Memory management
- `/library` - AI generation library
- `/ai-settings` - API key management

## 🎨 UI Components

Built with shadcn/ui components and Tailwind CSS for a modern, responsive design.
