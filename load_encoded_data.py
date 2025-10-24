#!/usr/bin/env python3
"""
Load Encoded Data for Training
Demonstrates how to load the preprocessed encoded data for use in training.
"""

import numpy as np

def load_encoded_data(filename):
    """
    Load encoded data from file.
    
    Args:
        filename: Path to the encoded data file
        
    Returns:
        List of encoded sequences (each sequence is a list of integers)
    """
    with open(filename, 'r') as f:
        lines = f.readlines()
    
    # Convert each line back to list of integers
    encoded_sequences = []
    for line in lines:
        sequence = [int(x) for x in line.strip().split()]
        encoded_sequences.append(sequence)
    
    return encoded_sequences

def create_training_pairs(sequences, context_length=8):
    """
    Create training pairs (input, target) for language modeling.
    
    Args:
        sequences: List of encoded sequences
        context_length: Length of context window
        
    Returns:
        Tuple of (inputs, targets) as numpy arrays
    """
    inputs = []
    targets = []
    
    for sequence in sequences:
        if len(sequence) < context_length + 1:
            continue
            
        for i in range(len(sequence) - context_length):
            # Input: context_length tokens
            input_seq = sequence[i:i + context_length]
            # Target: next token
            target_token = sequence[i + context_length]
            
            inputs.append(input_seq)
            targets.append(target_token)
    
    return np.array(inputs), np.array(targets)

def main():
    """Demonstrate loading and processing encoded data."""
    
    # Load encoded data
    print("Loading encoded data...")
    encoded_sequences = load_encoded_data('encoded_data.txt')
    
    print(f"Loaded {len(encoded_sequences)} sequences")
    print(f"Sample sequence: {encoded_sequences[0]}")
    print(f"Sequence lengths: {[len(seq) for seq in encoded_sequences]}")
    
    # Create training pairs
    print("\nCreating training pairs...")
    inputs, targets = create_training_pairs(encoded_sequences, context_length=8)
    
    print(f"Created {len(inputs)} training pairs")
    print(f"Input shape: {inputs.shape}")
    print(f"Target shape: {targets.shape}")
    
    # Show some examples
    print("\nSample training pairs:")
    for i in range(min(3, len(inputs))):
        print(f"Input {i}: {inputs[i]}")
        print(f"Target {i}: {targets[i]}")
        print()
    
    # Save processed data for training
    np.save('training_inputs.npy', inputs)
    np.save('training_targets.npy', targets)
    print("Saved training data as numpy arrays:")
    print("- training_inputs.npy")
    print("- training_targets.npy")

if __name__ == "__main__":
    main() 