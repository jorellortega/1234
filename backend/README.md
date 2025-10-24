# INFINITO AI Backend

FastAPI backend for the INFINITO AI Personal Memory System.

## 🚀 Features

- **Multi-AI Backend Support**: Local LSTM models and Hugging Face transformers
- **Streaming Responses**: Real-time text generation with Server-Sent Events
- **Model Management**: Automatic model loading and switching
- **API Documentation**: Interactive docs at `/docs`

## 📦 Dependencies

See `requirements.txt` for all Python dependencies.

## 🔧 Environment Variables

```env
MODEL_BACKEND=hf  # or "local"
HF_MODEL_NAME=distilgpt2
```

## 🚀 Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run with Hugging Face backend
MODEL_BACKEND=hf HF_MODEL_NAME=distilgpt2 uvicorn api_server:app --host 0.0.0.0 --port 8000

# Run with local backend
uvicorn api_server:app --host 0.0.0.0 --port 8000
```

## 🚀 Railway Deployment

This backend is configured for Railway deployment with:

- **Procfile**: `web: uvicorn api_server:app --host 0.0.0.0 --port $PORT`
- **Entry Point**: `api_server.py`
- **Dependencies**: `requirements.txt`

## 📡 API Endpoints

- `GET /health` - Health check
- `POST /generate` - Text generation
- `POST /generate_stream` - Streaming generation
- `GET /vocab` - Vocabulary information
- `GET /docs` - Interactive API documentation

## 🔧 Configuration

The backend supports two modes:

1. **Local Mode**: Uses custom LSTM model with SentencePiece tokenizer
2. **Hugging Face Mode**: Uses pre-trained transformers models

Switch between modes using the `MODEL_BACKEND` environment variable.
