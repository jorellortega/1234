# preprocess.py
import sentencepiece as spm

# Load the trained SentencePiece model
sp = spm.SentencePieceProcessor()
sp.load('mymodel.model')

def encode_text_file(filename):
    with open(filename, 'r') as f:
        lines = f.readlines()
    encoded = [sp.encode(line.strip(), out_type=int) for line in lines]
    return encoded

if __name__ == '__main__':
    data = encode_text_file('training_data.txt')
    with open('encoded_data.txt', 'w') as f:
        for line in data:
            f.write(' '.join(map(str, line)) + '\n') 