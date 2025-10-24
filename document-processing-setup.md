# Document Processing Setup Guide

## 📚 **Document Import & AI Reading System**

Your memory core now supports importing Word documents, PDFs, and text files, with AI-powered content extraction and memory creation.

## 🚀 **Features**

- **File Upload**: Drag & drop or browse for documents
- **Format Support**: PDF, Word (.doc, .docx), Text files
- **AI Processing**: Automatic content extraction and analysis
- **Memory Review**: Edit and approve extracted memories before saving
- **Batch Import**: Process multiple concepts from one document

## 📦 **Required Dependencies**

Add these to your `package.json`:

```json
{
  "dependencies": {
    "pdf-parse": "^1.1.1",
    "mammoth": "^1.6.0",
    "multer": "^1.4.5-lts.1"
  }
}
```

Install with:
```bash
npm install pdf-parse mammoth multer
```

## 🔧 **Advanced Document Processing (Optional)**

For production use, you can enhance the document processing with:

### **Real AI Integration**
```typescript
// Replace the simulateDocumentProcessing function with:
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

async function processWithAI(text: string, filename: string) {
  const prompt = `Analyze this document and extract key concepts as structured memories:
  
  Document: ${filename}
  Content: ${text.substring(0, 4000)}...
  
  Extract 3-5 key concepts with:
  - Concept name
  - Detailed description
  - Salience (0.0-1.0)
  - Relevant tags
  - Memory category (project/idea/family_tree/question/general)
  
  Return as JSON array.`

  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3
  })

  return JSON.parse(completion.choices[0].message.content || '[]')
}
```

### **Enhanced File Processing**
```typescript
// Real PDF processing
import pdf from 'pdf-parse'
import mammoth from 'mammoth'

async function extractText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  
  if (file.type.includes('pdf')) {
    const data = await pdf(Buffer.from(buffer))
    return data.text
  } else if (file.type.includes('word') || file.type.includes('document')) {
    const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) })
    return result.value
  } else {
    // Text file
    return new TextDecoder().decode(buffer)
  }
}
```

## 🎯 **How It Works**

1. **Upload**: User selects Word/PDF document
2. **Extract**: System extracts text content
3. **Analyze**: AI processes content for key concepts
4. **Review**: User reviews and edits extracted memories
5. **Save**: Selected memories are stored in the hierarchy

## 📁 **File Storage (Optional)**

For document storage, you can add Supabase Storage:

```typescript
// In your API route
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Upload file to storage
const { data, error } = await supabase.storage
  .from('documents')
  .upload(`${Date.now()}-${filename}`, file)
```

## 🔒 **Security Considerations**

- File size limits (currently 10MB)
- File type validation
- Content sanitization
- Rate limiting for uploads

## 🎨 **Customization**

You can customize:
- **Memory categories** based on document content
- **AI prompts** for different document types
- **Extraction rules** for specific formats
- **Batch processing** for multiple documents

## 🚀 **Next Steps**

1. Install dependencies
2. Test with sample documents
3. Customize AI prompts for your use case
4. Add real AI integration (OpenAI/Claude)
5. Implement document storage if needed

The system is ready to use with simulated AI processing, and you can enhance it step by step!








