<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Groq-Llama_3.3-orange?style=for-the-badge" alt="Groq" />
  <img src="https://img.shields.io/badge/Pinecone-Vector_DB-purple?style=for-the-badge" alt="Pinecone" />
</p>

<h1 align="center">🧠 Omniscience</h1>

<p align="center">
  <strong>Your Second Brain powered by AI</strong><br/>
  Upload documents and get intelligent answers grounded in your content.
</p>

---

## ✨ Features

- 📄 **PDF Processing** - Upload multiple PDFs with smart chunking
- 💬 **RAG Chat** - AI answers grounded in your documents with source citations
- 🎤 **Voice Input** - Speak your questions
- 💡 **Smart Suggestions** - AI-generated follow-up questions
- 🌓 **Dark/Light Mode** - Theme toggle with persistence
- 📤 **Export Chat** - Download as Markdown or JSON

---

## 🛠 Tech Stack

| Category | Technologies |
|----------|-------------|
| **Frontend** | Next.js 16, TypeScript, Tailwind CSS 4, shadcn/ui |
| **AI/LLM** | Groq (Llama 3.3 70B), Google Gemini |
| **Database** | Pinecone Vector DB |
| **Deployment** | Vercel |

---

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/fozanmujtaba/Omniscience-AI.git
cd Omniscience-AI/omniscience-app
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env.local
```

Add your API keys to `.env.local`:
```env
GOOGLE_AI_API_KEY=your_gemini_key
PINECONE_API_KEY=your_pinecone_key
PINECONE_INDEX=omniscience
GROQ_API_KEY=your_groq_key
```

### 3. Setup Pinecone
- Create index at [Pinecone Console](https://app.pinecone.io/)
- Name: `omniscience` | Dimensions: `768` | Metric: `cosine`

### 4. Run
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

---

## 🏗 How It Works

```
PDF Upload → Text Chunking → Vector Embeddings → Pinecone Storage
     ↓
User Query → Semantic Search → Context Retrieval → Groq LLM → Response
```

---

## � API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/ingest` | Upload & process PDFs |
| `POST /api/chat` | Stream chat responses |
| `POST /api/search` | Search document chunks |
| `POST /api/suggest` | Get follow-up suggestions |

---

## 🚢 Deploy to Vercel

1. Push to GitHub
2. Import at [vercel.com/new](https://vercel.com/new)
3. Set root directory: `omniscience-app`
4. Add environment variables
5. Deploy!

---

## 📄 License

MIT License - see [LICENSE](LICENSE)

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/fozanmujtaba">Fozan Mujtaba</a>
</p>
