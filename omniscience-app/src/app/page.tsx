import { PDFUploader } from "@/components/pdf-uploader";
import { ChatInterface } from "@/components/chat-interface";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Animated gradient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-radial from-violet-900/20 via-transparent to-transparent animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-radial from-cyan-900/20 via-transparent to-transparent animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-zinc-800/50 backdrop-blur-xl bg-zinc-950/50 sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                  Omniscience
                </h1>
                <p className="text-xs text-zinc-500">Intelligent RAG Knowledge Base</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">Powered by</span>
              <span className="text-xs font-medium text-zinc-300">Gemini 1.5 Pro</span>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 py-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-800/50 border border-zinc-700 mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-sm text-zinc-300">Zero hallucinations • 100% grounded in your documents</span>
          </div>

          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              Your Second Brain,
            </span>
            <br />
            <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              Powered by AI
            </span>
          </h2>

          <p className="text-zinc-400 max-w-2xl mx-auto mb-12">
            Upload your PDFs and ask questions. Every answer is grounded in your documents
            with precise source citations. No hallucinations, just facts.
          </p>
        </section>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 pb-16">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left: Upload */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                  <span className="text-violet-400 font-bold text-sm">1</span>
                </div>
                <h3 className="text-lg font-semibold">Upload Documents</h3>
              </div>
              <PDFUploader />

              {/* Features */}
              <div className="grid grid-cols-2 gap-4 mt-8">
                {[
                  { icon: "🔒", title: "Private", desc: "Your data stays yours" },
                  { icon: "⚡", title: "Fast", desc: "Semantic search in ms" },
                  { icon: "📚", title: "50+ PDFs", desc: "Scale your knowledge" },
                  { icon: "🎯", title: "Accurate", desc: "Cited sources always" },
                ].map((feature) => (
                  <div
                    key={feature.title}
                    className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors"
                  >
                    <span className="text-2xl">{feature.icon}</span>
                    <h4 className="font-medium mt-2">{feature.title}</h4>
                    <p className="text-xs text-zinc-500">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Chat */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <span className="text-cyan-400 font-bold text-sm">2</span>
                </div>
                <h3 className="text-lg font-semibold">Ask Questions</h3>
              </div>
              <ChatInterface />
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-zinc-800/50 py-8">
          <div className="max-w-7xl mx-auto px-6 text-center text-zinc-500 text-sm">
            Built with Next.js 15 • Gemini 1.5 Pro • Pinecone
          </div>
        </footer>
      </div>
    </div>
  );
}
