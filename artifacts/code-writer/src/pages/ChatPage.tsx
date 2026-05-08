import { useState, useRef, useEffect, useCallback } from "react";
import { useUser, useClerk } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateOpenaiConversation,
  useListOpenaiConversations,
  useDeleteOpenaiConversation,
  getListOpenaiConversationsQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Trash2, Send, Loader2, Bot, LogOut,
  Sparkles, Zap, MessageSquare, Menu, X, Copy, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message { id: string; role: "user" | "assistant"; content: string; }

/* ── detect mobile ── */
function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return mobile;
}

/* ── Code block ── */
function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="my-3 rounded-xl overflow-hidden" style={{ background: "rgba(0,0,0,0.55)", border: "1px solid rgba(124,58,237,0.2)" }}>
      <div className="code-block-header">
        <span className="text-[10px] font-mono" style={{ color: "rgba(167,139,250,0.65)" }}>{lang || "code"}</span>
        <button onClick={copy} className="flex items-center gap-1.5 text-[10px] transition-colors" style={{ color: copied ? "#34d399" : "rgba(167,139,250,0.55)" }}>
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="p-4 m-0 overflow-x-auto text-[13px] leading-relaxed" style={{ color: "#c8d8f0", fontFamily: "'JetBrains Mono', monospace" }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

/* ── Message renderer ── */
function MessageContent({ content }: { content: string }) {
  const parts: Array<{ type: "text" | "code"; content: string; lang?: string }> = [];
  const regex = /```(\w*)\n?([\s\S]*?)```/g;
  let last = 0, m;
  while ((m = regex.exec(content)) !== null) {
    if (m.index > last) parts.push({ type: "text", content: content.slice(last, m.index) });
    parts.push({ type: "code", content: m[2].trim(), lang: m[1] || undefined });
    last = m.index + m[0].length;
  }
  if (last < content.length) parts.push({ type: "text", content: content.slice(last) });
  return (
    <div>
      {parts.map((p, i) =>
        p.type === "code"
          ? <CodeBlock key={i} code={p.content} lang={p.lang} />
          : <p key={i} className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#d4ccf0" }}>{p.content}</p>
      )}
    </div>
  );
}

const SUGGESTIONS = [
  "Explain quantum entanglement simply",
  "Write a Rust TCP server",
  "What caused the fall of Rome?",
  "Solve: ∫x²·sin(x)dx step by step",
  "Debug my Python async code",
  "Design a microservices system",
];

const DIVIDER = "1px solid rgba(124,58,237,0.14)";
const SIDEBAR_BG = "rgba(4,0,14,0.97)";

export default function ChatPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // always closed initially — safe for both mobile and desktop

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: conversations = [] } = useListOpenaiConversations();
  const createConv = useCreateOpenaiConversation();
  const deleteConv = useDeleteOpenaiConversation();

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const startNew = useCallback(async () => {
    const conv = await createConv.mutateAsync({ data: { title: "New Chat" } });
    setConversationId(conv.id);
    setMessages([]);
    queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
    if (isMobile) setSidebarOpen(false);
    return conv.id;
  }, [createConv, queryClient, isMobile]);

  useEffect(() => { startNew(); }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;
    let cid = conversationId;
    if (!cid) cid = await startNew();

    const uid = Date.now().toString();
    const aid = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: uid, role: "user", content: text }]);
    setInput("");
    if (textareaRef.current) { textareaRef.current.style.height = "auto"; }
    setIsStreaming(true);
    setMessages(prev => [...prev, { id: aid, role: "assistant", content: "" }]);

    try {
      const res = await fetch(`/api/openai/conversations/${cid}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      if (!res.ok || !res.body) throw new Error("API error");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.done) break;
            if (parsed.content) {
              setMessages(prev => prev.map(m => m.id === aid ? { ...m, content: m.content + parsed.content } : m));
            }
          } catch {}
        }
      }
    } catch {
      toast({ title: "Failed to get response", variant: "destructive" });
      setMessages(prev => prev.filter(m => m.id !== aid));
    } finally {
      setIsStreaming(false);
    }
  }, [conversationId, isStreaming, startNew, toast]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !isMobile) { e.preventDefault(); sendMessage(input); }
  };

  const handleDelete = async (id: number) => {
    await deleteConv.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
    if (conversationId === id) startNew();
  };

  const selectConv = (id: number) => {
    setConversationId(id);
    setMessages([]);
    if (isMobile) setSidebarOpen(false);
  };

  const displayName = user?.firstName || user?.username || user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "User";
  const avatarUrl = user?.imageUrl;

  return (
    <div className="flex h-[100dvh] w-screen overflow-hidden" style={{ position: "relative" }}>
      {/* Background */}
      <div className="nexus-bg"><div className="orb-3" /></div>
      <div className="nexus-grid" />

      {/* ── SIDEBAR OVERLAY (mobile) ── */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-30"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── SIDEBAR ── */}
      <div
        className={cn(
          "flex flex-col shrink-0 transition-all duration-300 overflow-hidden",
          isMobile
            ? "fixed inset-y-0 left-0 z-40"
            : "relative z-20"
        )}
        style={{
          background: SIDEBAR_BG,
          borderRight: DIVIDER,
          width: sidebarOpen ? "280px" : "0px",
          minWidth: sidebarOpen ? "280px" : "0px",
          transition: "width 0.3s ease, min-width 0.3s ease",
        }}
      >
        <div className="flex flex-col h-full" style={{ width: "280px" }}>
          {/* Sidebar header */}
          <div className="flex items-center gap-3 px-4 py-4 shrink-0" style={{ borderBottom: DIVIDER }}>
            <div
              className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
              style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)", boxShadow: "0 0 14px rgba(124,58,237,0.6)" }}
            >
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-black gradient-text-gold tracking-tight">Nexus AI</p>
              <p className="text-[10px]" style={{ color: "#4a3a6a" }}>Infinite intelligence</p>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="flex items-center justify-center w-8 h-8 rounded-lg"
              style={{ color: "#4a3a6a" }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* New chat */}
          <div className="px-3 py-3 shrink-0">
            <button
              onClick={startNew}
              className="w-full flex items-center gap-2.5 px-3 py-3 rounded-xl text-sm font-medium transition-all"
              style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)", color: "#a78bfa" }}
            >
              <Plus className="w-4 h-4" />
              New conversation
            </button>
          </div>

          {/* Chat history label */}
          <div className="px-4 pb-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#2a1a40" }}>Chat History</p>
          </div>

          {/* Conversations list */}
          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
            {conversations.length === 0 ? (
              <p className="text-xs text-center mt-4" style={{ color: "#2a1a40" }}>No conversations yet</p>
            ) : (
              conversations.map(conv => (
                <div
                  key={conv.id}
                  onClick={() => selectConv(conv.id)}
                  className={cn("sidebar-item group flex items-center gap-2", conversationId === conv.id && "active")}
                  style={{ minHeight: "44px", padding: "10px 10px" }}
                >
                  <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-60" />
                  <span className="text-xs truncate flex-1">{conv.title}</span>
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(conv.id); }}
                    className="p-1.5 rounded transition-all text-red-400 opacity-0 group-hover:opacity-100 active:opacity-100"
                    style={{ touchAction: "manipulation" }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* User profile */}
          <div className="flex items-center gap-3 px-4 py-4 shrink-0" style={{ borderTop: DIVIDER }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-9 h-9 rounded-full object-cover shrink-0" />
            ) : (
              <div
                className="flex items-center justify-center w-9 h-9 rounded-full shrink-0 text-sm font-bold text-white"
                style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6)" }}
              >
                {displayName[0]?.toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate text-white">{displayName}</p>
              <p className="text-[10px] truncate" style={{ color: "#3a2a5a" }}>{user?.emailAddresses?.[0]?.emailAddress}</p>
            </div>
            <button
              onClick={() => signOut()}
              className="flex items-center justify-center w-9 h-9 rounded-xl transition-all shrink-0"
              style={{ color: "#3a2a5a", background: "rgba(124,58,237,0.05)", border: "1px solid rgba(124,58,237,0.1)" }}
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── MAIN CHAT AREA ── */}
      <div className="relative z-10 flex flex-col flex-1 overflow-hidden">

        {/* Top bar */}
        <div
          className="flex items-center gap-3 px-4 py-3 shrink-0"
          style={{ background: "rgba(4,0,12,0.9)", borderBottom: DIVIDER, backdropFilter: "blur(20px)", minHeight: "56px" }}
        >
          {/* Hamburger */}
          <button
            onClick={() => setSidebarOpen(p => !p)}
            className="flex items-center justify-center w-10 h-10 rounded-xl transition-all shrink-0"
            style={{ color: "#7c6aaa", background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)", touchAction: "manipulation" }}
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div
              className="flex items-center justify-center w-8 h-8 rounded-xl shrink-0"
              style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(6,182,212,0.2))", border: "1px solid rgba(124,58,237,0.45)", boxShadow: "0 0 16px rgba(124,58,237,0.4)" }}
            >
              <Bot className="w-4 h-4" style={{ color: "#a78bfa" }} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold gradient-text leading-none">Nexus AI</p>
              <p className="text-[10px] truncate" style={{ color: isStreaming ? "#06b6d4" : "#3a2a5a" }}>
                {isStreaming ? "● Generating..." : "● Ready"}
              </p>
            </div>
          </div>

          {/* GPT-5 badge — hidden on small phones */}
          <div
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full shrink-0"
            style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)" }}
          >
            <Sparkles className="w-3 h-3" style={{ color: "#7c3aed" }} />
            <span className="text-xs font-medium" style={{ color: "#7c6aaa" }}>GPT-5</span>
          </div>

          {/* New chat shortcut on mobile */}
          <button
            onClick={startNew}
            className="flex sm:hidden items-center justify-center w-10 h-10 rounded-xl shrink-0"
            style={{ color: "#a78bfa", background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)", touchAction: "manipulation" }}
            title="New chat"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto" style={{ padding: "20px 0", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
          <div className="max-w-3xl mx-auto px-4 space-y-5">

            {/* Empty state */}
            {messages.length === 0 && (
              <div className="flex flex-col items-center text-center gap-5 pt-8">
                <div
                  className="relative flex items-center justify-center w-20 h-20 rounded-3xl"
                  style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(6,182,212,0.1))", border: "1px solid rgba(124,58,237,0.3)", boxShadow: "0 0 60px rgba(124,58,237,0.2)" }}
                >
                  <Zap className="w-10 h-10" style={{ color: "#a78bfa" }} />
                  <div
                    className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-6 h-6 rounded-full"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)", boxShadow: "0 0 12px rgba(124,58,237,0.8)" }}
                  >
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl sm:text-3xl font-black gradient-text" style={{ letterSpacing: "-0.02em" }}>
                    Hello, {displayName}
                  </h2>
                  <p className="text-sm mt-2" style={{ color: "#5a4a82" }}>
                    Ask me anything — code, science, math, history, and more.
                  </p>
                </div>

                {/* Suggestion chips — 1 col on mobile, 2 col on larger */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-2xl">
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="flex items-center gap-2.5 px-4 py-3.5 rounded-2xl text-sm text-left transition-all active:scale-95"
                      style={{ background: "rgba(10,2,24,0.7)", border: "1px solid rgba(124,58,237,0.12)", color: "#7c6aaa", backdropFilter: "blur(12px)", touchAction: "manipulation" }}
                    >
                      <Sparkles className="w-3.5 h-3.5 shrink-0 opacity-60" />
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map(msg => (
              <div key={msg.id} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
                {msg.role === "assistant" && (
                  <div
                    className="flex items-center justify-center w-8 h-8 rounded-xl shrink-0 mt-1"
                    style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.35)" }}
                  >
                    <Bot className="w-4 h-4" style={{ color: "#a78bfa" }} />
                  </div>
                )}

                <div className={cn("max-w-[85%] rounded-2xl px-4 py-3", msg.role === "user" ? "bubble-user" : "bubble-ai")}>
                  {msg.role === "assistant" ? (
                    msg.content
                      ? <MessageContent content={msg.content} />
                      : (
                        <div className="flex items-center gap-3 py-1">
                          <div className="flex gap-1">
                            {[0, 1, 2].map(i => (
                              <div key={i} className="w-2 h-2 rounded-full" style={{ background: "#7c3aed", animation: `thinking-dot 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                            ))}
                          </div>
                          <span className="text-xs" style={{ color: "#4a3a6a" }}>Thinking...</span>
                        </div>
                      )
                  ) : (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#ede8ff" }}>{msg.content}</p>
                  )}
                </div>

                {msg.role === "user" && (
                  <div
                    className="flex items-center justify-center w-8 h-8 rounded-xl shrink-0 mt-1 text-xs font-bold text-white"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6)", boxShadow: "0 0 10px rgba(124,58,237,0.5)" }}
                  >
                    {displayName[0]?.toUpperCase()}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input area */}
        <div
          className="px-4 pb-4 pt-3 shrink-0"
          style={{ borderTop: DIVIDER, background: "rgba(4,0,12,0.85)", backdropFilter: "blur(20px)" }}
        >
          <div className="max-w-3xl mx-auto">
            <div
              className="flex items-end gap-3 rounded-2xl px-4 py-3 transition-all"
              style={{ background: "rgba(8,2,22,0.9)", border: "1px solid rgba(124,58,237,0.25)" }}
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
                }}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything..."
                rows={1}
                className="flex-1 bg-transparent outline-none resize-none text-sm leading-relaxed"
                style={{ color: "#e0d8ff", fontFamily: "'Inter', sans-serif", minHeight: "28px", maxHeight: "140px" }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isStreaming}
                className="btn-nexus flex items-center justify-center rounded-xl shrink-0"
                style={{ width: "44px", height: "44px", touchAction: "manipulation" }}
              >
                {isStreaming
                  ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                  : <Send className="w-4 h-4 text-white" />}
              </button>
            </div>
            <p className="text-center text-[10px] mt-2 hidden sm:block" style={{ color: "#1e1030" }}>
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
