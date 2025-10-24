# train_llm.py
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim

# Load data
inputs = np.load("training_inputs.npy")
targets = np.load("training_targets.npy")

# Convert to tensors
x = torch.tensor(inputs, dtype=torch.long)
y = torch.tensor(targets, dtype=torch.long)

# Hyperparameters
vocab_size = 100  # Same as sentencepiece vocab size
embedding_dim = 64
hidden_dim = 128
context_length = x.shape[1]

# Model definition
class MiniLLM(nn.Module):
    def __init__(self):
        super().__init__()
        self.embed = nn.Embedding(vocab_size, embedding_dim)
        self.lstm = nn.LSTM(embedding_dim, hidden_dim, batch_first=True)
        self.fc = nn.Linear(hidden_dim, vocab_size)

    def forward(self, x):
        x = self.embed(x)
        out, _ = self.lstm(x)
        out = self.fc(out[:, -1, :])
        return out

model = MiniLLM()
loss_fn = nn.CrossEntropyLoss()
optimizer = optim.Adam(model.parameters(), lr=0.001)

# Training
epochs = 20
for epoch in range(epochs):
    optimizer.zero_grad()
    logits = model(x)
    loss = loss_fn(logits, y)
    loss.backward()
    optimizer.step()
    print(f"Epoch {epoch+1}/{epochs}, Loss: {loss.item():.4f}")

# Save model
torch.save(model.state_dict(), "mini_llm.pth")
print("Model trained and saved as mini_llm.pth")

