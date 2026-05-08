import { useState, useRef, useEffect, useCallback } from "react";
import { useUser } from "@clerk/react";
import { useClerk } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateOpenaiConversation,
  useListOpenaiConversations,
  useDeleteOpenaiConversation,
  getListOpenaiConversationsQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Trash2, Send, Loader2, Bot, LogOut, ChevronDown,
  Sparkles, Zap, MessageSquare, Menu, X, Copy, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message { id: string; role: "user" | "assistant"; content: string; }

/* ── Code block with copy button ── */
function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div
      className="my-3 rounded-xl overflow-hidden"
      style={{ background: "rgba(0,0,0,0.55)", border: "1px solid rgba(124,58,237,0.2)" }}
    >
      <div className="code-block-header">
        <span className="text-[10px] font-mono" style={{ color: "rgba(167,139,250,0.65)" }}>
          {lang || "code"}
        </span>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 text-[10px] transition-colors"
          style={{ color: copied ? "#34d399" : "rgba(167,139,250,0.55)" }}
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre
        className="p-4 m-0 overflow-x-auto text-[13px] leading-relaxed"
        style={{ color: "#c8d8f0", fontFamily: "'JetBrains Mono', monospace" }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}

/* ── Render markdown-ish content ── */
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
          : (
            <p
              key={i}
              className="text-sm leading-relaxed whitespace-pre-wrap"
              style={{ color: "#d4ccf0" }}
            >
              {p.content}
            </p>
          )
      )}
    </div>
  );
}

const SUGGESTIONS = [
  "Explain quantum entanglement simply",
  "Write a Rust TCP server from scratch",
  "What caused the fall of Rome?",
  "Solve: ∫x²·sin(x)dx step by step",
  "Debug my Python async code",
  "Design a scalable microservices system",
  "Translate this to French and explain grammar",
  "Write a short horror story",
];

const DIVIDER = "1px solid rgba(124,58,237,0.14)";
const SIDEBAR_BG = "rgba(4,0,14,0.92)";

export default function ChatPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [] } = useListOpenaiConversations();
  const createConv = useCreateOpenaiConversation();
  const deleteConv = useDeleteOpenaiConversation();

  /* auto-scroll */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startNew = useCallback(async () => {
    const conv = await createConv.mutateAsync({ data: { title: "New Chat" } });
    setConversationId(conv.id);
    setMessages([]);
    queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
    return conv.id;
  }, [createConv, queryClient]);

  useEffect(() => { startNew(); }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;
    let cid = conversationId;
    if (!cid) cid = await startNew();

    const uid = Date.now().toString();
    const aid = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: uid, role: "user", content: text }]);
    setInput("");
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
              setMessages(prev =>
                prev.map(m => m.id === aid ? { ...m, content: m.content + parsed.content } : m)
              );
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
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const handleDelete = async (id: number) => {
    await deleteConv.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
    if (conversationId === id) startNew();
  };

  const selectConv = (id: number) => {
    setConversationId(id);
    setMessages([]);
  };

  const displayName = user?.firstName || user?.username || user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "User";
  const avatarUrl = user?.imageUrl;

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Animated background */}
      <div className="nexus-bg"><div className="orb-3" /></div>
      <div className="nexus-grid" />

      {/* ── SIDEBAR ── */}
      <div
        className={cn(
          "relative z-20 flex flex-col shrink-0 transition-all duration-300 overflow-hidden",
          sidebarOpen ? "w-64" : "w-0"
        )}
        style={{ background: SIDEBAR_BG, borderRight: DIVIDER }}
      >
        <div className="flex flex-col h-full" style={{ minWidth: "256px" }}>
          {/* Sidebar header */}
          <div
            className="flex items-center gap-3 px-4 py-4 shrink-0"
            style={{ borderBottom: DIVIDER }}
          >
            <div
              className="flex items-center justify-center w-8 h-8 rounded-xl shrink-0"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
                boxShadow: "0 0 14px rgba(124,58,237,0.6)",
              }}
            >
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-black gradient-text-gold tracking-tight">Nexus AI</p>
              <p className="text-[10px]" style={{ color: "#3a2a5a" }}>Infinite intelligence</p>
            </div>
          </div>

          {/* New chat button */}
          <div className="px-3 py-3 shrink-0">
            <button
              onClick={startNew}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: "rgba(124,58,237,0.12)",
                border: "1px solid rgba(124,58,237,0.25)",
                color: "#a78bfa",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(124,58,237,0.2)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(124,58,237,0.5)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(124,58,237,0.12)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(124,58,237,0.25)";
              }}
            >
              <Plus className="w-4 h-4" />
              New conversation
            </button>
          </div>

          {/* Conversations list */}
          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
            {conversations.length === 0 ? (
              <p className="text-xs text-center mt-6" style={{ color: "#2a1a40" }}>
                No conversations yet
              </p>
            ) : (
              conversations.map(conv => (
                <div
                  key={conv.id}
                  onClick={() => selectConv(conv.id)}
                  className={cn("sidebar-item group flex items-center gap-2", conversationId === conv.id && "active")}
                >
                  <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-60" />
                  <span className="text-xs truncate flex-1">{conv.title}</span>
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(conv.id); }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-all hover:text-red-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* User profile */}
          <div
            className="flex items-center gap-3 px-4 py-4 shrink-0"
            style={{ borderTop: DIVIDER }}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-8 h-8 rounded-full object-cover shrink-0" />
            ) : (
              <div
                className="flex items-center justify-center w-8 h-8 rounded-full shrink-0 text-xs font-bold text-white"
                style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6)" }}
              >
                {displayName[0]?.toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate text-white">{displayName}</p>
              <p className="text-[10px] truncate" style={{ color: "#3a2a5a" }}>
                {user?.emailAddresses?.[0]?.emailAddress}
              </p>
            </div>
            <button
              onClick={() => signOut()}
              className="p-1.5 rounded-lg transition-all shrink-0"
              style={{ color: "#3a2a5a" }}
              title="Sign out"
              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = "#f87171")}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = "#3a2a5a")}
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── MAIN CHAT AREA ── */}
      <div className="relative z-10 flex flex-col flex-1 overflow-hidden">

        {/* Top bar */}
        <div
          className="flex items-center gap-3 px-5 py-3 shrink-0"
          style={{ background: "rgba(4,0,12,0.85)", borderBottom: DIVIDER, backdropFilter: "blur(20px)", minHeight: "56px" }}
        >
          <button
            onClick={() => setSidebarOpen(p => !p)}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-all"
            style={{ color: "#4a3a6a" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#a78bfa"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(124,58,237,0.1)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#4a3a6a"; (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          <div className="flex items-center gap-2.5">
            <div
              className="relative flex items-center justify-center w-8 h-8 rounded-xl"
              style={{
                background: "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(6,182,212,0.2))",
                border: "1px solid rgba(124,58,237,0.45)",
                boxShadow: "0 0 16px rgba(124,58,237,0.4)",
              }}
            >
              <Bot className="w-4 h-4" style={{ color: "#a78bfa" }} />
            </div>
            <div>
              <p className="text-sm font-bold gradient-text leading-none">Nexus AI</p>
              <p className="text-[10px]" style={{ color: isStreaming ? "#06b6d4" : "#3a2a5a" }}>
                {isStreaming ? "● Generating..." : "● Ready"}
              </p>
            </div>
          </div>

          <div className="flex-1" />

          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)" }}
          >
            <Sparkles className="w-3 h-3" style={{ color: "#7c3aed" }} />
            <span className="text-xs font-medium" style={{ color: "#7c6aaa" }}>GPT-5 · All Knowledge</span>
          </div>
        </div>

        {/* Messages area */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto"
          style={{ padding: "24px 0" }}
        >
          <div className="max-w-3xl mx-auto px-6 space-y-6">
            {/* Empty state */}
            {messages.length === 0 && (
              <div className="flex flex-col items-center text-center gap-6 pt-12">
                <div
                  className="relative flex items-center justify-center w-24 h-24 rounded-3xl"
                  style={{
                    background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(6,182,212,0.1))",
                    border: "1px solid rgba(124,58,237,0.3)",
                    boxShadow: "0 0 60px rgba(124,58,237,0.2), inset 0 0 40px rgba(124,58,237,0.05)",
                  }}
                >
                  <Zap className="w-11 h-11" style={{ color: "#a78bfa" }} />
                  <div
                    className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-6 h-6 rounded-full"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)", boxShadow: "0 0 12px rgba(124,58,237,0.8)" }}
                  >
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                </div>

                <div>
                  <h2
                    className="text-3xl font-black gradient-text"
                    style={{ letterSpacing: "-0.02em" }}
                  >
                    Hello, {displayName}
                  </h2>
                  <p className="text-base mt-2" style={{ color: "#5a4a82" }}>
                    I have mastery over all human knowledge.<br />What would you like to explore?
                  </p>
                </div>

                {/* Suggestion chips */}
                <div className="grid grid-cols-2 gap-2.5 w-full max-w-2xl">
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="flex items-center gap-2.5 px-4 py-3 rounded-2xl text-sm text-left transition-all"
                      style={{
                        background: "rgba(10,2,24,0.7)",
                        border: "1px solid rgba(124,58,237,0.12)",
                        color: "#7c6aaa",
                        backdropFilter: "blur(12px)",
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(124,58,237,0.4)";
                        (e.currentTarget as HTMLButtonElement).style.color = "#c4b5fd";
                        (e.currentTarget as HTMLButtonElement).style.background = "rgba(124,58,237,0.1)";
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(124,58,237,0.12)";
                        (e.currentTarget as HTMLButtonElement).style.color = "#7c6aaa";
                        (e.currentTarget as HTMLButtonElement).style.background = "rgba(10,2,24,0.7)";
                      }}
                    >
                      <ChevronDown className="w-3.5 h-3.5 rotate-[-90deg] shrink-0 opacity-50" />
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map(msg => (
              <div
                key={msg.id}
                className={cn("flex gap-4", msg.role === "user" ? "justify-end" : "justify-start")}
              >
                {msg.role === "assistant" && (
                  <div
                    className="flex items-center justify-center w-8 h-8 rounded-xl shrink-0 mt-1"
                    style={{
                      background: "rgba(124,58,237,0.15)",
                      border: "1px solid rgba(124,58,237,0.35)",
                    }}
                  >
                    <Bot className="w-4 h-4" style={{ color: "#a78bfa" }} />
                  </div>
                )}

                <div
                  className={cn(
                    "max-w-[82%] rounded-2xl px-5 py-4",
                    msg.role === "user" ? "bubble-user" : "bubble-ai"
                  )}
                >
                  {msg.role === "assistant" ? (
                    msg.content ? (
                      <MessageContent content={msg.content} />
                    ) : (
                      <div className="flex items-center gap-3 py-1">
                        <div className="flex gap-1">
                          {[0, 1, 2].map(i => (
                            <div
                              key={i}
                              className="w-2 h-2 rounded-full"
                              style={{
                                background: "#7c3aed",
                                animation: `thinking-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
                              }}
                            />
                          ))}
                        </div>
                        <span className="text-xs" style={{ color: "#4a3a6a" }}>Thinking...</span>
                      </div>
                    )
                  ) : (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#ede8ff" }}>
                      {msg.content}
                    </p>
                  )}
                </div>

                {msg.role === "user" && (
                  <div
                    className="flex items-center justify-center w-8 h-8 rounded-xl shrink-0 mt-1 text-xs font-bold text-white"
                    style={{
                      background: "linear-gradient(135deg, #7c3aed, #3b82f6)",
                      boxShadow: "0 0 10px rgba(124,58,237,0.5)",
                    }}
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
          className="px-6 pb-6 pt-4 shrink-0"
          style={{ borderTop: DIVIDER, background: "rgba(4,0,12,0.7)", backdropFilter: "blur(20px)" }}
        >
          <div className="max-w-3xl mx-auto">
            <div
              className="flex items-end gap-3 rounded-2xl px-5 py-4 transition-all"
              style={{
                background: "rgba(8,2,22,0.85)",
                border: "1px solid rgba(124,58,237,0.25)",
              }}
              onFocus={() => {}}
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
                }}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything — code, science, math, history, or anything else..."
                rows={1}
                className="flex-1 bg-transparent outline-none resize-none text-sm leading-relaxed"
                style={{
                  color: "#e0d8ff",
                  fontFamily: "'Inter', sans-serif",
                  minHeight: "24px",
                  maxHeight: "160px",
                }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isStreaming}
                className="btn-nexus flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
              >
                {isStreaming
                  ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                  : <Send className="w-4 h-4 text-white" />}
              </button>
            </div>
            <p className="text-center text-[10px] mt-2.5" style={{ color: "#1e1030" }}>
              Enter to send · Shift+Enter for new line · Nexus AI can make mistakes — verify important info
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
