import torch
import torch.nn as nn
import numpy as np
import sentencepiece as spm

# Load SentencePiece model
sp = spm.SentencePieceProcessor()
sp.load("mymodel.model")

# Load training parameters
context_length = 8
vocab_size = sp.get_piece_size()

# Define the same model class used during training
class MiniLLM(nn.Module):
    def __init__(self, vocab_size, embedding_dim=64, hidden_dim=128):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, embedding_dim)
        self.rnn = nn.GRU(embedding_dim, hidden_dim, batch_first=True)
        self.fc = nn.Linear(hidden_dim, vocab_size)

    def forward(self, x, hidden=None):
        x = self.embedding(x)
        out, hidden = self.rnn(x, hidden)
        logits = self.fc(out)
        return logits[:, -1, :], hidden

# Load model
model = MiniLLM(vocab_size)
model.load_state_dict(torch.load("mini_llm.pth"))
model.eval()

def generate_text(seed_text, length=20):
    tokens = sp.encode(seed_text, out_type=int)
    tokens = tokens[-context_length:]  # Trim if longer than context
    input_ids = torch.tensor(tokens, dtype=torch.long).unsqueeze(0)

    result = tokens[:]

    hidden = None
    for _ in range(length):
        logits, hidden = model(input_ids, hidden)
        probs = torch.softmax(logits, dim=-1)
        next_id = torch.multinomial(probs, num_samples=1).item()
        result.append(next_id)
        input_ids = torch.tensor(result[-context_length:], dtype=torch.long).unsqueeze(0)

    return sp.decode(result)

if __name__ == "__main__":
    print("Generated:", generate_text("Hello, I am", length=30))

