# Document Processing & AI Reading System

## ✅ **Supported File Formats**

The system currently supports:
- **PDF** (`application/pdf`)
- **Microsoft Word** (`.doc` and `.docx`)
- **Plain Text** (`.txt`)

Maximum file size: **10MB**

## 📖 **How It Works**

### 1. **Document Upload**
- Drag & drop documents onto the main interface
- Or use the "Import Document" button
- Files are stored in Supabase Storage

### 2. **Text Extraction**
The system extracts text content from different file types:

- **PDFs**: Uses `pdf-parse` library to extract text
- **Word Documents**: Uses `mammoth` library to extract text and formatting
- **Text Files**: Direct text reading

### 3. **AI Memory Extraction**
Currently using **simulated AI processing** to extract:
- Key concepts from the document
- Document metadata
- Structure analysis (headers, paragraphs, tables)

### 4. **AI Can Read & Answer Questions**
When you ask questions about the document:

```typescript
// The AI receives:
Document Context: filename.pdf
Extracted Text: [full text from PDF/Word]

Current Question: What is this document about?
```

**The AI can:**
- ✅ Answer questions about the document content
- ✅ Provide summaries
- ✅ Find specific information
- ✅ Explain concepts from the document
- ✅ Continue conversations about the document

## 🎯 **Example Usage**

### Drop a PDF/Word Document
1. Upload "project-proposal.pdf"
2. System extracts all text
3. Shows document icon in the interface

### Ask Questions
- **"What is this document about?"** → AI reads extracted text and summarizes
- **"What are the main points?"** → AI identifies key concepts
- **"Summarize the first section"** → AI analyzes specific parts
- **"What are the project goals?"** → AI searches for relevant info

## 📝 **Current Processing (Simulated)**

The system currently uses **simulated AI** for memory extraction, meaning it:
- ✅ Extracts ALL text from PDFs and Word documents
- ✅ Stores text for AI to read when answering questions
- ⚠️ Creates generic memory structures (not real AI analysis)

## 🚀 **Upgrade to Real AI Processing**

To use real AI for document analysis, you can upgrade the `simulateDocumentProcessing` function in:
`app/api/documents/process/route.ts`

### Example Implementation:
```typescript
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

async function processWithRealAI(text: string, filename: string) {
  const prompt = `Analyze this document and extract key concepts:
  
  Document: ${filename}
  Content: ${text.substring(0, 4000)}...
  
  Extract 5 key concepts with descriptions, salience scores, and relevant tags.`

  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }]
  })

  return JSON.parse(completion.choices[0].message.content)
}
```

## 📊 **Current Limitations**

1. **Memory Extraction**: Uses simulated AI (generic structures)
2. **Text Extraction**: Works but limited by library quality
3. **Complex PDFs**: May struggle with scanned images/OCR
4. **Large Documents**: Limited to 10MB files

## ✅ **What Works Right Now**

- ✅ PDF text extraction
- ✅ Word document text extraction  
- ✅ Text file reading
- ✅ AI can read extracted text
- ✅ AI can answer questions about documents
- ✅ Document persistence in storage
- ✅ Document context in conversations

## 🎯 **Best Use Cases**

Currently perfect for:
- ✅ Research papers (PDF)
- ✅ Reports and documents (Word)
- ✅ Meeting notes (text/Word)
- ✅ Summarizing documents
- ✅ Asking questions about content
- ✅ Extracting key information

## 📦 **Required Packages**

Make sure you have installed:
```bash
npm install pdf-parse mammoth
```

## 🔧 **Configuration**

File type validation in:
- `app/api/documents/process/route.ts` (line 23-29)
- `components/DocumentUpload.tsx` (line 26-31)

## 💡 **Tips**

1. **For PDFs**: Works best with text-based PDFs (not scanned images)
2. **For Word**: Preserves basic formatting
3. **File Size**: Keep under 10MB for best performance
4. **Multiple Documents**: You can upload multiple documents
5. **Conversation Context**: Document context persists in the conversation

---

**Summary**: The system can read PDFs and Word documents, extract text, and the AI can answer questions about the content. Currently uses simulated AI for memory extraction, but real AI processing can be easily added.
