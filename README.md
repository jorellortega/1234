# INFINITO AI - Personal AI Memory System

A comprehensive AI-powered memory and knowledge management system with multiple AI backends, document processing, and streaming responses.

## 🚀 Features

### Core Functionality
- **Multi-AI Backend Support** - Switch between OpenAI, Anthropic, Google AI, Hugging Face, and local models
- **Memory Core System** - Store, organize, and retrieve personal memories/knowledge with hierarchical structure
- **Document Processing** - Upload PDFs, Word docs, and extract AI-generated memories automatically
- **AI Generation Library** - Save and manage AI conversations with tags, notes, and search
- **Streaming AI Responses** - Real-time text generation with customizable parameters
- **API Key Management** - Secure storage and management of multiple AI service API keys

### AI Models Supported
- **OpenAI**: GPT-4, GPT-3.5, DALL-E, Whisper
- **Anthropic**: Claude 3, Claude 2
- **Google AI**: Gemini Pro, PaLM, Vertex AI
- **Hugging Face**: Open source models and inference
- **Local Models**: Custom LSTM with SentencePiece tokenizer
- **Replicate**: Open source model hosting
- **Stability AI**: SDXL, Stable Diffusion
- **ElevenLabs**: Text-to-speech, voice cloning

## 🏗️ Architecture

### Frontend (Next.js 15)
- **Framework**: Next.js 15 with React 19
- **Styling**: Tailwind CSS + shadcn/ui components
- **Database**: Supabase for data persistence
- **File Processing**: PDF, Word document support

### Backend (Python FastAPI)
- **AI Server**: FastAPI with dual backend support
- **Local Model**: Custom LSTM + SentencePiece tokenizer
- **HF Model**: Hugging Face transformers integration
- **Streaming**: Server-Sent Events for real-time responses

## 📦 Installation

### Prerequisites
- Node.js 18+
- Python 3.8+
- Supabase account

### Backend Setup
```bash
# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run AI server
MODEL_BACKEND=hf HF_MODEL_NAME=distilgpt2 uvicorn api_server:app --host 0.0.0.0 --port 8000
```

### Frontend Setup
```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

## 🔧 Environment Variables

### Frontend (.env.local)
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

### Backend
```env
MODEL_BACKEND=hf  # or "local"
HF_MODEL_NAME=distilgpt2
```

## 🚀 Deployment

### Vercel (Frontend)
1. Connect your GitHub repository
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push

### Railway (Backend)
1. Connect your GitHub repository
2. Set environment variables
3. Deploy with automatic scaling

### Database Setup
1. Create Supabase project
2. Run the SQL schema from `database_schema.sql`
3. Configure storage buckets for file uploads

## 📊 Database Schema

The application uses Supabase with the following main tables:
- `memories` - Hierarchical memory storage
- `generations` - AI conversation history
- `api_keys` - Secure API key storage
- `ai_services` - Available AI service configurations

## 🎯 Usage

### Memory Core
- Create and organize personal memories
- Upload documents for AI processing
- Build knowledge graphs with relationships

### AI Generation
- Chat with multiple AI models
- Save conversations to library
- Tag and organize generated content

### Document Processing
- Upload PDFs, Word documents
- AI extracts key concepts automatically
- Review and edit before saving

## 🔒 Security

- API keys encrypted in database
- User authentication via Supabase
- Secure file upload handling
- Environment variable protection

## 📈 Performance

- Streaming responses for real-time interaction
- Optimized model loading
- Efficient database queries
- Caching for improved performance

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the API documentation at `/docs` when running locally

## 🔄 Version History

- **v1.0.2-GAMMA** - Current version with full AI backend support
- Multi-model architecture
- Document processing capabilities
- Memory core system
- Streaming responses

---

Built with ❤️ using Next.js, FastAPI, and Supabase
