import torch
import torch.nn.functional as F
import sentencepiece as spm
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
import json, time

import os
from hf_backend import HFTextGen

# Load tokenizer
sp = spm.SentencePieceProcessor()
sp.load("mymodel.model")

class TinyModel(torch.nn.Module):
    def __init__(self, vocab_size=100, dim=64, hidden_size=128):  # LSTM hidden size is 128
        super().__init__()
        self.embed = torch.nn.Embedding(vocab_size, dim)
        self.lstm = torch.nn.LSTM(dim, hidden_size, batch_first=True)  # dim=64, hidden_size=128
        self.fc = torch.nn.Linear(hidden_size, vocab_size)  # hidden_size=128 to vocab_size=100
    
    def forward(self, x, h=None):
        x = self.embed(x)
        if h is None:
            x, (h, c) = self.lstm(x)
        else:
            x, (h, c) = self.lstm(x, h)
        return self.fc(x), (h, c)

# Initialize model
model = TinyModel()
try:
    state = torch.load("mini_llm.pth", map_location="cpu")
    model.load_state_dict(state, strict=False)
    load_msg = "model loaded successfully"
except Exception as e:
    load_msg = f"model load warning: {e}"

model.eval()

# ----------------------------
# Backend selection
# ----------------------------
MODEL_BACKEND = os.getenv("MODEL_BACKEND", "local")  # "local" or "hf"
HF_MODEL_NAME = os.getenv("HF_MODEL_NAME", "distilgpt2")

hf = None
if MODEL_BACKEND == "hf":
    hf = HFTextGen(HF_MODEL_NAME)
    print(f"🤖 Using HF backend: {HF_MODEL_NAME}")
else:
    print("🧠 Using local tiny LSTM backend")

app = FastAPI(title="AI Model API", version="1.0.0")

@app.get("/health")
def health():
    return {
        "ok": True, 
        "tokenizer_vocab": sp.get_piece_size(), 
        "status": load_msg,
        "model_parameters": sum(p.numel() for p in model.parameters())
    }

class GenIn(BaseModel):
    prompt: str
    max_tokens: int = 64
    temperature: float = 0.9
    top_k: int = 50

@app.post("/generate")
def generate_text(request: GenIn):
    """
    Unified generate endpoint:
    - If HF backend is enabled (hf is not None), use Hugging Face model.
    - Otherwise fall back to the local tiny LSTM + SentencePiece path.
    """
    try:
        prompt = request.prompt or ""
        max_tokens = int(request.max_tokens or 40)
        temperature = float(request.temperature or 0.8)
        top_k = int(request.top_k or 50)

        # --- HF backend ---
        if hf is not None:
            text = hf.generate_once(
                prompt,
                max_tokens=max_tokens,
                temperature=temperature,
                top_k=top_k,
            )
            return {
                "success": True,
                "input": prompt,
                "generated": text,
                "backend": "hf",
            }

        # --- Local backend (your original logic) ---
        input_ids = sp.encode(prompt, out_type=int)
        input_tensor = torch.tensor([input_ids], dtype=torch.long)

        with torch.no_grad():
            hidden = None
            generated_ids = input_ids.copy()

            for _ in range(max_tokens):
                output, hidden = model(input_tensor, hidden)

                logits = output[0, -1, :] / max(temperature, 1e-6)

                if top_k > 0:
                    k = min(top_k, logits.size(-1))
                    top_k_logits, top_k_indices = torch.topk(logits, k)
                    logits = torch.full_like(logits, float("-inf"))
                    logits[top_k_indices] = top_k_logits

                probs = F.softmax(logits, dim=-1)
                next_token = torch.multinomial(probs, 1).item()

                generated_ids.append(next_token)
                input_tensor = torch.tensor([[next_token]], dtype=torch.long)

                if next_token == sp.eos_id():
                    break

        generated_text = sp.decode(generated_ids)

        return {
            "success": True,
            "input": prompt,
            "generated": generated_text,
            "tokens_generated": len(generated_ids) - len(input_ids),
            "input_tokens": len(input_ids),
            "total_tokens": len(generated_ids),
            "backend": "local",
        }

    except Exception as e:
        return {"success": False, "error": str(e), "input": request.prompt}
@app.post("/generate_stream")
def generate_stream(req: GenIn):
    """
    Streams output using Server-Sent Events (SSE).
    Uses HF backend if enabled; otherwise falls back to local chunking.
    """
    prompt = req.prompt or ""
    max_tokens = int(req.max_tokens or 40)
    temperature = float(req.temperature or 0.8)
    top_k = int(req.top_k or 50)

    def sse_hf():
        # Stream token pieces directly from the HF backend
        for piece in hf.stream(
            prompt=prompt,
            max_tokens=max_tokens,
            temperature=temperature,
            top_k=top_k,
        ):
            # Frontend expects {"delta": "..."} lines
            yield f"data: {json.dumps({'delta': piece})}\n\n"
        yield "event: done\ndata: {}\n\n"

    def sse_local():
        # Fallback: generate full text then emit in small chunks
        try:
            result = generate_text(GenIn(
                prompt=prompt,
                max_tokens=max_tokens,
                temperature=temperature,
                top_k=top_k
            ))
            if not result.get("success"):
                raise Exception(result.get("error", "Generation failed"))
            full = result.get("generated", "")
        except Exception as e:
            def err():
                yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"
            return StreamingResponse(err(), media_type="text/event-stream")

        def chunker():
            words = full.split(" ")
            buf = ""
            for i, w in enumerate(words):
                buf = (buf + " " + w).strip()
                if i % 3 == 2 or i == len(words) - 1:
                    yield f"data: {json.dumps({'delta': buf})}\n\n"
                    buf = ""
                    time.sleep(0.03)
            yield "event: done\ndata: {}\n\n"

        return StreamingResponse(chunker(), media_type="text/event-stream")

    # Choose the streaming path
    if hf is not None:
        return StreamingResponse(sse_hf(), media_type="text/event-stream")
    else:
        return sse_local()

@app.get("/vocab")
def get_vocabulary():
    try:
        vocab_size = sp.get_piece_size()
        sample_pieces = []
        
        # Get sample vocabulary items
        for i in range(min(50, vocab_size)):
            piece = sp.id_to_piece(i)
            sample_pieces.append({"id": i, "piece": piece})
        
        return {
            "vocab_size": vocab_size,
            "sample_pieces": sample_pieces,
            "special_tokens": {
                "unk_id": sp.unk_id(),
                "bos_id": sp.bos_id(),
                "eos_id": sp.eos_id(),
                "pad_id": sp.pad_id()
            }
        }
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    print(f"🚀 Starting AI Model API Server...")
    print(f"📊 Model Status: {load_msg}")
    print(f"🔤 Vocabulary Size: {sp.get_piece_size()}")
    print(f"🌐 API will be available at: http://localhost:8000")
    print(f"📚 API Documentation: http://localhost:8000/docs")
    
    uvicorn.run(app, host="0.0.0.0", port=8000)
