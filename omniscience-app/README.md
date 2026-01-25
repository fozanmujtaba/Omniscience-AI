<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind-4-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Pinecone-Vector_DB-purple?style=for-the-badge" alt="Pinecone" />
</p>

<h1 align="center">🧠 Omniscience</h1>

<p align="center">
  <strong>Your Second Brain powered by AI</strong><br/>
  An intelligent RAG (Retrieval-Augmented Generation) knowledge base that lets you<br/>
  upload documents and get AI-powered answers grounded in your content.
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#demo">Demo</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#api-reference">API Reference</a>
</p>

---

## ✨ Features

### 📄 Document Intelligence
- **PDF Upload & Processing** - Drag & drop multiple PDFs at once
- **Smart Chunking** - Documents are split into semantic chunks for better retrieval
- **Vector Embeddings** - Content is transformed into searchable vector representations
- **Session Isolation** - Each chat session has its own private knowledge namespace

### 💬 AI-Powered Chat
- **Contextual Responses** - Answers are grounded in your uploaded documents
- **Source Citations** - Every response shows exactly where information came from
- **Streaming Responses** - Real-time token-by-token response generation
- **Regenerate Answers** - Re-run any query for fresh responses

### 🎤 Premium UX Features
- **Voice Input** - Speak your questions using Web Speech API
- **AI Suggested Questions** - Smart follow-up suggestions after each response
- **Multi-File Upload Queue** - Batch upload with individual progress tracking
- **Dark/Light Mode** - Theme toggle with system preference detection
- **Export Chat** - Download conversations as Markdown or JSON
- **Copy Messages** - One-click copy with toast notifications

### 🔐 Privacy & Security
- **Session-Based Namespaces** - Documents are isolated per session
- **No Data Persistence** - Conversations stay in your browser
- **Secure API Routes** - Server-side processing for all AI operations

---

## 🎬 Demo

### Light Mode
![Light Mode](https://via.placeholder.com/800x450?text=Omniscience+Light+Mode)

### Dark Mode
![Dark Mode](https://via.placeholder.com/800x450?text=Omniscience+Dark+Mode)

---

## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| [Next.js 16](https://nextjs.org/) | React framework with App Router |
| [TypeScript](https://www.typescriptlang.org/) | Type-safe development |
| [Tailwind CSS 4](https://tailwindcss.com/) | Utility-first styling |
| [shadcn/ui](https://ui.shadcn.com/) | Beautifully designed components |
| [React Markdown](https://github.com/remarkjs/react-markdown) | Markdown rendering |
| [react-hot-toast](https://react-hot-toast.com/) | Toast notifications |
| [Lucide React](https://lucide.dev/) | Beautiful icons |

### AI & ML
| Technology | Purpose |
|------------|---------|
| [Groq](https://groq.com/) | Ultra-fast LLM inference (Llama 3.3 70B) |
| [Google Gemini](https://ai.google.dev/) | Embeddings & fallback LLM |
| [Pinecone](https://pinecone.io/) | Vector database for semantic search |

### Document Processing
| Technology | Purpose |
|------------|---------|
| [pdf-parse](https://www.npmjs.com/package/pdf-parse) | PDF text extraction |
| Custom Chunker | Semantic text splitting with overlap |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- API keys for:
  - [Groq](https://console.groq.com/) (free tier available)
  - [Google AI Studio](https://aistudio.google.com/apikey) (free tier available)
  - [Pinecone](https://app.pinecone.io/) (free tier available)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/fozanmujtaba/Omniscience-AI.git
   cd Omniscience-AI/omniscience-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` with your API keys:
   ```env
   GOOGLE_AI_API_KEY=your_gemini_api_key
   PINECONE_API_KEY=your_pinecone_api_key
   PINECONE_INDEX=omniscience
   GROQ_API_KEY=your_groq_api_key
   ```

4. **Create Pinecone Index**
   - Go to [Pinecone Console](https://app.pinecone.io/)
   - Create a new index named `omniscience`
   - Dimensions: `768` (for Gemini embeddings)
   - Metric: `cosine`

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        OMNISCIENCE                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │   Frontend   │────▶│  API Routes  │────▶│   Services   │    │
│  │   (Next.js)  │     │  (Server)    │     │              │    │
│  └──────────────┘     └──────────────┘     └──────────────┘    │
│         │                    │                    │             │
│         │                    │                    │             │
│         ▼                    ▼                    ▼             │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │  Components  │     │  /api/ingest │     │   Pinecone   │    │
│  │  - Chat      │     │  /api/chat   │     │  (Vectors)   │    │
│  │  - Uploader  │     │  /api/search │     └──────────────┘    │
│  │  - Voice     │     │  /api/suggest│            │             │
│  └──────────────┘     └──────────────┘            │             │
│                              │                    │             │
│                              ▼                    │             │
│                       ┌──────────────┐            │             │
│                       │   Groq LLM   │◀───────────┘             │
│                       │ (Llama 3.3)  │                          │
│                       └──────────────┘                          │
│                              │                                  │
│                              ▼                                  │
│                       ┌──────────────┐                          │
│                       │   Gemini     │                          │
│                       │ (Embeddings) │                          │
│                       └──────────────┘                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### RAG Pipeline Flow

1. **Document Ingestion**
   ```
   PDF Upload → Text Extraction → Chunking → Embedding → Vector Storage
   ```

2. **Query Processing**
   ```
   User Query → Embedding → Semantic Search → Context Retrieval → LLM Generation
   ```

3. **Response Generation**
   ```
   Retrieved Context + Query → Groq LLM → Streamed Response with Citations
   ```

---

## 📁 Project Structure

```
omniscience-app/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/          # Streaming chat endpoint
│   │   │   ├── ingest/        # PDF processing endpoint
│   │   │   ├── search/        # Vector search endpoint
│   │   │   ├── suggest/       # AI suggestions endpoint
│   │   │   └── documents/     # Document management
│   │   ├── globals.css        # Global styles + themes
│   │   ├── layout.tsx         # Root layout with providers
│   │   └── page.tsx           # Main application page
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   ├── chat-interface.tsx # Main chat component
│   │   ├── pdf-uploader.tsx   # Multi-file uploader
│   │   ├── voice-input.tsx    # Speech-to-text
│   │   ├── suggested-questions.tsx
│   │   ├── document-manager.tsx
│   │   ├── theme-provider.tsx
│   │   └── sidebar.tsx
│   ├── lib/
│   │   ├── gemini.ts          # Gemini AI client
│   │   ├── groq.ts            # Groq LLM client
│   │   ├── pinecone.ts        # Vector database
│   │   ├── chunker.ts         # Text chunking
│   │   └── export-chat.ts     # Export utilities
│   └── types/
│       └── index.ts           # TypeScript types
├── public/                    # Static assets
├── .env.example              # Environment template
└── package.json
```

---

## 📡 API Reference

### POST `/api/ingest`
Upload and process a PDF document.

**Request:**
```typescript
FormData {
  file: File,        // PDF file
  sessionId: string  // Session namespace
}
```

**Response:**
```json
{
  "success": true,
  "chunksCreated": 15,
  "vectorsUpserted": 15,
  "filename": "document.pdf"
}
```

### POST `/api/chat`
Stream a chat response with RAG context.

**Request:**
```json
{
  "message": "What are the key points?",
  "sessionId": "uuid-here",
  "history": []
}
```

**Response:** Server-Sent Events stream

### POST `/api/search`
Search for relevant document chunks.

**Request:**
```json
{
  "query": "search terms",
  "sessionId": "uuid-here",
  "topK": 5
}
```

### POST `/api/suggest`
Generate follow-up question suggestions.

**Request:**
```json
{
  "lastResponse": "AI's previous response",
  "lastQuestion": "User's question"
}
```

---

## 🎨 Customization

### Theming
Edit `src/app/globals.css` to customize colors:

```css
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.141 0.005 285.823);
  /* ... more CSS variables */
}

.dark {
  --background: oklch(0.141 0.005 285.823);
  /* ... dark mode overrides */
}
```

### LLM Configuration
Edit `src/lib/groq.ts` to change models:

```typescript
export const GROQ_MODELS = {
  LLAMA_70B: "llama-3.3-70b-versatile",  // Best quality
  LLAMA_8B: "llama-3.1-8b-instant",      // Faster
  MIXTRAL: "mixtral-8x7b-32768",         // Alternative
};
```

---

## 🚢 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project at [vercel.com/new](https://vercel.com/new)
3. Set root directory to `omniscience-app`
4. Add environment variables
5. Deploy!

### Environment Variables for Production

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_AI_API_KEY` | Yes | Gemini API key for embeddings |
| `PINECONE_API_KEY` | Yes | Pinecone API key |
| `PINECONE_INDEX` | Yes | Pinecone index name |
| `GROQ_API_KEY` | Yes | Groq API key for LLM |

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Vercel](https://vercel.com) for hosting
- [Groq](https://groq.com) for lightning-fast inference
- [Pinecone](https://pinecone.io) for vector search
- [Google](https://ai.google.dev) for Gemini embeddings
- [shadcn](https://ui.shadcn.com) for beautiful components

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/fozanmujtaba">Fozan Mujtaba</a>
</p>

<p align="center">
  <a href="https://github.com/fozanmujtaba/Omniscience-AI/stargazers">⭐ Star this repo</a> if you found it helpful!
</p>
