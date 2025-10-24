from typing import Iterable
import threading
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, TextIteratorStreamer

class HFTextGen:
    def __init__(self, model_name: str = "distilgpt2"):
        self.tok = AutoTokenizer.from_pretrained(model_name)
        # distilgpt2 has no pad token; use eos as pad
        if self.tok.pad_token_id is None and self.tok.eos_token_id is not None:
            self.tok.pad_token = self.tok.eos_token
        self.model = AutoModelForCausalLM.from_pretrained(model_name)
        self.model.eval()
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model.to(self.device)

    def generate_once(
        self,
        prompt: str,
        max_tokens: int = 60,
        temperature: float = 0.8,
        top_k: int = 50,
    ) -> str:
        """Return FULL text (prompt + continuation)."""
        enc = self.tok(prompt, return_tensors="pt").to(self.device)
        with torch.no_grad():
            out = self.model.generate(
                **enc,
                max_new_tokens=max(1, int(max_tokens)),
                do_sample=True,
                temperature=max(0.01, float(temperature)),
                top_k=int(top_k),
                eos_token_id=self.tok.eos_token_id,
                pad_token_id=self.tok.pad_token_id or self.tok.eos_token_id,
            )
        text = self.tok.decode(out[0], skip_special_tokens=True)
        return text

    def stream(
        self,
        prompt: str,
        max_tokens: int = 60,
        temperature: float = 0.8,
        top_k: int = 50,
    ) -> Iterable[str]:
        """Yield ONLY the continuation (no prompt) in small chunks."""
        enc = self.tok(prompt, return_tensors="pt").to(self.device)
        streamer = TextIteratorStreamer(
            self.tok,
            skip_special_tokens=True,
            skip_prompt=True,
        )
        t = threading.Thread(
            target=self.model.generate,
            kwargs=dict(
                **enc,
                streamer=streamer,
                max_new_tokens=max(1, int(max_tokens)),
                do_sample=True,
                temperature=max(0.01, float(temperature)),
                top_k=int(top_k),
                eos_token_id=self.tok.eos_token_id,
                pad_token_id=self.tok.pad_token_id or self.tok.eos_token_id,
            ),
            daemon=True,
        )
        t.start()
        for chunk in streamer:
            yield chunk
