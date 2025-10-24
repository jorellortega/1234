#!/usr/bin/env python3
"""
Simple SentencePiece Example
Demonstrates the exact code provided by the user.
"""

import sentencepiece as spm

def main():
    # Create training data
    sample_texts = [
        "Hello, I am building my own LLM!",
        "This is a sample text for training the tokenizer.",
        "Machine learning and natural language processing are fascinating fields.",
        "The quick brown fox jumps over the lazy dog.",
        "Python is a great programming language for data science.",
        "Neural networks and deep learning have revolutionized AI.",
        "Tokenization is an important step in NLP pipelines.",
        "Subword tokenization helps handle unknown words better.",
        "SentencePiece is a popular subword tokenization library.",
        "BPE and unigram are common subword tokenization algorithms."
    ]
    
    # Write training data to file
    with open('training_data.txt', 'w', encoding='utf-8') as f:
        for text in sample_texts:
            f.write(text + '\n')
    
    print("Training data created: training_data.txt")
    
    # Train tokenizer (exact code from user)
    print("\nTraining SentencePiece model...")
    spm.SentencePieceTrainer.train(
        input='training_data.txt',
        model_prefix='mymodel',
        vocab_size=100,
        model_type='bpe'
    )
    
    # Load tokenizer (exact code from user)
    print("Loading trained model...")
    sp = spm.SentencePieceProcessor()
    sp.load('mymodel.model')
    
    # Test encoding and decoding (exact code from user)
    test_text = 'Hello, I am building my own LLM!'
    print(f"\nOriginal text: {test_text}")
    
    encoded = sp.encode(test_text, out_type=int)
    print(f"Encoded: {encoded}")
    
    decoded = sp.decode(sp.encode(test_text))
    print(f"Decoded: {decoded}")
    
    # Additional examples
    print(f"\nVocabulary size: {sp.get_piece_size()}")
    
    # Show some vocabulary items
    print("\nSample vocabulary items:")
    for i in range(min(20, sp.get_piece_size())):
        piece = sp.id_to_piece(i)
        print(f"  {i}: '{piece}'")

if __name__ == "__main__":
    main() 