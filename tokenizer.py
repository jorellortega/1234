#!/usr/bin/env python3
"""
Advanced Tokenizer Implementation
A tokenizer with both basic word-based and SentencePiece subword tokenization.
"""

import re
from typing import List, Dict, Any, Optional
from collections import Counter

try:
    import sentencepiece as spm
    SENTENCEPIECE_AVAILABLE = True
except ImportError:
    SENTENCEPIECE_AVAILABLE = False
    print("Warning: sentencepiece not available. Install with: pip install sentencepiece")


class Tokenizer:
    """
    A basic tokenizer class for text processing.
    """
    
    def __init__(self, lowercase: bool = True, remove_punctuation: bool = True):
        """
        Initialize the tokenizer.
        
        Args:
            lowercase: Whether to convert text to lowercase
            remove_punctuation: Whether to remove punctuation marks
        """
        self.lowercase = lowercase
        self.remove_punctuation = remove_punctuation
        self.vocab = {}
        self.vocab_size = 0
        
    def preprocess_text(self, text: str) -> str:
        """
        Preprocess the input text.
        
        Args:
            text: Input text string
            
        Returns:
            Preprocessed text string
        """
        if self.lowercase:
            text = text.lower()
            
        if self.remove_punctuation:
            # Remove punctuation but keep apostrophes for contractions
            text = re.sub(r'[^\w\s\']', '', text)
            
        # Normalize whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        
        return text
    
    def tokenize(self, text: str) -> List[str]:
        """
        Tokenize the input text into words.
        
        Args:
            text: Input text string
            
        Returns:
            List of tokens (words)
        """
        text = self.preprocess_text(text)
        tokens = text.split()
        return tokens
    
    def build_vocab(self, texts: List[str], min_freq: int = 1) -> Dict[str, int]:
        """
        Build vocabulary from a list of texts.
        
        Args:
            texts: List of text strings
            min_freq: Minimum frequency for a word to be included in vocabulary
            
        Returns:
            Dictionary mapping words to their indices
        """
        word_counts = Counter()
        
        for text in texts:
            tokens = self.tokenize(text)
            word_counts.update(tokens)
        
        # Filter by minimum frequency
        vocab = {word: idx for idx, (word, count) in enumerate(word_counts.most_common()) 
                if count >= min_freq}
        
        self.vocab = vocab
        self.vocab_size = len(vocab)
        
        return vocab
    
    def encode(self, text: str) -> List[int]:
        """
        Encode text to token indices.
        
        Args:
            text: Input text string
            
        Returns:
            List of token indices
        """
        tokens = self.tokenize(text)
        indices = [self.vocab.get(token, 0) for token in tokens]  # 0 for unknown tokens
        return indices
    
    def decode(self, indices: List[int]) -> str:
        """
        Decode token indices back to text.
        
        Args:
            indices: List of token indices
            
        Returns:
            Decoded text string
        """
        # Create reverse mapping
        reverse_vocab = {idx: word for word, idx in self.vocab.items()}
        tokens = [reverse_vocab.get(idx, '<UNK>') for idx in indices]
        return ' '.join(tokens)
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get tokenizer statistics.
        
        Returns:
            Dictionary with tokenizer statistics
        """
        return {
            'vocab_size': self.vocab_size,
            'lowercase': self.lowercase,
            'remove_punctuation': self.remove_punctuation
        }


class SentencePieceTokenizer:
    """
    A SentencePiece-based tokenizer for subword tokenization.
    """
    
    def __init__(self, model_path: Optional[str] = None):
        """
        Initialize the SentencePiece tokenizer.
        
        Args:
            model_path: Path to the trained SentencePiece model
        """
        if not SENTENCEPIECE_AVAILABLE:
            raise ImportError("sentencepiece is not available. Install with: pip install sentencepiece")
        
        self.sp = spm.SentencePieceProcessor()
        if model_path:
            self.load_model(model_path)
    
    def train(self, input_file: str, model_prefix: str, vocab_size: int = 8000, 
              model_type: str = 'bpe', **kwargs) -> None:
        """
        Train a SentencePiece model.
        
        Args:
            input_file: Path to training data file
            model_prefix: Prefix for output model files
            vocab_size: Size of vocabulary
            model_type: Type of model ('bpe', 'unigram', 'char', 'word')
            **kwargs: Additional training parameters
        """
        train_args = {
            'input': input_file,
            'model_prefix': model_prefix,
            'vocab_size': vocab_size,
            'model_type': model_type,
            **kwargs
        }
        
        spm.SentencePieceTrainer.train(**train_args)
        self.load_model(f"{model_prefix}.model")
    
    def load_model(self, model_path: str) -> None:
        """
        Load a trained SentencePiece model.
        
        Args:
            model_path: Path to the model file
        """
        self.sp.load(model_path)
    
    def encode(self, text: str, out_type: str = 'int') -> List[int]:
        """
        Encode text to token indices.
        
        Args:
            text: Input text string
            out_type: Output type ('int' or 'str')
            
        Returns:
            List of token indices or token strings
        """
        if out_type == 'int':
            return self.sp.encode(text, out_type=int)
        else:
            return self.sp.encode(text, out_type=str)
    
    def decode(self, tokens: List[int]) -> str:
        """
        Decode token indices back to text.
        
        Args:
            tokens: List of token indices
            
        Returns:
            Decoded text string
        """
        return self.sp.decode(tokens)
    
    def get_vocab_size(self) -> int:
        """
        Get the vocabulary size.
        
        Returns:
            Number of tokens in vocabulary
        """
        return self.sp.get_piece_size()
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get tokenizer statistics.
        
        Returns:
            Dictionary with tokenizer statistics
        """
        return {
            'vocab_size': self.get_vocab_size(),
            'model_type': 'sentencepiece'
        }


def create_training_data():
    """
    Create sample training data for SentencePiece.
    """
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
    
    with open('training_data.txt', 'w', encoding='utf-8') as f:
        for text in sample_texts:
            f.write(text + '\n')
    
    print("Training data created: training_data.txt")


def main():
    """
    Example usage of both tokenizer classes.
    """
    print("=== Basic Word-based Tokenizer ===")
    
    # Example texts
    texts = [
        "Hello, world! This is a test.",
        "The quick brown fox jumps over the lazy dog.",
        "Python is a great programming language for data science."
    ]
    
    # Initialize basic tokenizer
    tokenizer = Tokenizer(lowercase=True, remove_punctuation=True)
    
    # Build vocabulary
    vocab = tokenizer.build_vocab(texts, min_freq=1)
    print(f"Vocabulary size: {tokenizer.vocab_size}")
    
    # Test tokenization
    test_text = "Hello world! This is a test sentence."
    tokens = tokenizer.tokenize(test_text)
    print(f"Tokenized text: {tokens}")
    
    # Test encoding/decoding
    encoded = tokenizer.encode(test_text)
    decoded = tokenizer.decode(encoded)
    print(f"Encoded: {encoded}")
    print(f"Decoded: {decoded}")
    
    print("\n=== SentencePiece Tokenizer ===")
    
    if SENTENCEPIECE_AVAILABLE:
        # Create training data
        create_training_data()
        
        # Initialize SentencePiece tokenizer
        sp_tokenizer = SentencePieceTokenizer()
        
        # Train the model
        print("Training SentencePiece model...")
        sp_tokenizer.train(
            input_file='training_data.txt',
            model_prefix='mymodel',
            vocab_size=100,
            model_type='bpe'
        )
        
        # Test SentencePiece tokenization
        test_text = "Hello, I am building my own LLM!"
        encoded_sp = sp_tokenizer.encode(test_text, out_type=int)
        decoded_sp = sp_tokenizer.decode(encoded_sp)
        
        print(f"Original: {test_text}")
        print(f"Encoded: {encoded_sp}")
        print(f"Decoded: {decoded_sp}")
        print(f"Vocabulary size: {sp_tokenizer.get_vocab_size()}")
        
        # Test with string tokens
        string_tokens = sp_tokenizer.encode(test_text, out_type='str')
        print(f"String tokens: {string_tokens}")
        
    else:
        print("SentencePiece not available. Install with: pip install sentencepiece")


if __name__ == "__main__":
    main() 