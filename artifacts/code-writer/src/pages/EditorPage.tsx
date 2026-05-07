import { useState, useRef, useEffect, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateOpenaiConversation,
  useListOpenaiConversations,
  useDeleteOpenaiConversation,
  getListOpenaiConversationsQueryKey,
  getListSnippetsQueryKey,
  useCreateSnippet,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Copy, Trash2, Save, ChevronDown, Plus, Loader2,
  Send, Eraser, ChevronRight, ChevronLeft, Sparkles, Zap,
  Code2, Bot,
} from "lucide-react";

const LANGUAGES = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "rust", label: "Rust" },
  { value: "go", label: "Go" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
  { value: "c", label: "C" },
  { value: "csharp", label: "C#" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "sql", label: "SQL" },
  { value: "bash", label: "Bash" },
  { value: "yaml", label: "YAML" },
  { value: "json", label: "JSON" },
  { value: "markdown", label: "Markdown" },
  { value: "php", label: "PHP" },
  { value: "ruby", label: "Ruby" },
  { value: "swift", label: "Swift" },
  { value: "kotlin", label: "Kotlin" },
];

const AI_ACTIONS = [
  { label: "Generate", prompt: "Generate code for: " },
  { label: "Explain", prompt: "Explain what this code does in detail: " },
  { label: "Debug", prompt: "Find and fix all bugs in this code: " },
  { label: "Refactor", prompt: "Refactor this code to be cleaner and more efficient: " },
  { label: "Add Comments", prompt: "Add comprehensive comments to this code: " },
  { label: "Write Tests", prompt: "Write thorough unit tests for this code: " },
  { label: "Translate", prompt: "Translate this code to another language (specify which): " },
  { label: "Optimize", prompt: "Optimize this code for maximum performance: " },
];

interface Message { role: "user" | "assistant"; content: string; id: string; }

function CodeBlock({ code, language }: { code: string; language?: string }) {
  const { toast } = useToast();
  return (
    <div className="nexus-code-block">
      <div
        className="flex items-center justify-between px-3 py-1.5"
        style={{ borderBottom: "1px solid rgba(124,58,237,0.15)", background: "rgba(124,58,237,0.06)" }}
      >
        <span className="text-[10px] font-mono" style={{ color: "rgba(167,139,250,0.7)" }}>{language ?? "code"}</span>
        <button
          onClick={() => { navigator.clipboard.writeText(code); toast({ title: "Copied!" }); }}
          className="flex items-center gap-1 text-[10px] transition-colors"
          style={{ color: "rgba(167,139,250,0.6)" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#a78bfa")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(167,139,250,0.6)")}
        >
          <Copy className="w-3 h-3" /> Copy
        </button>
      </div>
      <pre className="p-4 text-[12.5px] leading-relaxed overflow-x-auto m-0" style={{ color: "#b8c8e8", fontFamily: "'JetBrains Mono', monospace" }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  const parts: Array<{ type: "text" | "code"; content: string; language?: string }> = [];
  const regex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0, match;
  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) parts.push({ type: "text", content: content.slice(lastIndex, match.index) });
    parts.push({ type: "code", content: match[2].trim(), language: match[1] || undefined });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) parts.push({ type: "text", content: content.slice(lastIndex) });
  return (
    <div>
      {parts.map((p, i) =>
        p.type === "code"
          ? <CodeBlock key={i} code={p.content} language={p.language} />
          : <p key={i} className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#b0a0d8" }}>{p.content}</p>
      )}
    </div>
  );
}

const TOPBAR = "rgba(4,0,12,0.9)";
const DIVIDER = "1px solid rgba(124,58,237,0.15)";

export default function EditorPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState("// Start coding here...\n");
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [editorWidth, setEditorWidth] = useState(58);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: conversations = [] } = useListOpenaiConversations();
  const createConversation = useCreateOpenaiConversation();
  const deleteConversation = useDeleteOpenaiConversation();
  const createSnippet = useCreateSnippet();

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const startNewConversation = useCallback(async () => {
    const conv = await createConversation.mutateAsync({ data: { title: "New Chat" } });
    setConversationId(conv.id);
    setMessages([]);
    queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
  }, [createConversation, queryClient]);

  useEffect(() => { if (!conversationId) startNewConversation(); }, []);

  const sendMessage = useCallback(async (userMessage: string) => {
    if (!conversationId || !userMessage.trim() || isStreaming) return;
    const userMsg: Message = { role: "user", content: userMessage, id: Date.now().toString() };
    setMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setIsStreaming(true);
    const aId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { role: "assistant", content: "", id: aId }]);
    try {
      const response = await fetch(`/api/openai/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `The user has the following ${language} code:\n\`\`\`${language}\n${code}\n\`\`\`\n\nUser request: ${userMessage}`,
        }),
      });
      if (!response.ok || !response.body) throw new Error("Failed");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const parsed = JSON.parse(line.slice(6));
              if (parsed.done) break;
              if (parsed.content) setMessages(prev => prev.map(m => m.id === aId ? { ...m, content: m.content + parsed.content } : m));
            } catch {}
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        toast({ title: "AI error", variant: "destructive" });
        setMessages(prev => prev.filter(m => m.id !== aId));
      }
    } finally { setIsStreaming(false); }
  }, [conversationId, code, language, isStreaming, toast]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(chatInput); }
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── EDITOR SIDE ── */}
      <div className="flex flex-col overflow-hidden" style={{ width: chatOpen ? `${editorWidth}%` : "100%", borderRight: DIVIDER }}>
        {/* Toolbar */}
        <div
          className="flex items-center gap-2 px-4 py-2 shrink-0"
          style={{ background: TOPBAR, borderBottom: DIVIDER, minHeight: "46px" }}
        >
          <Code2 className="w-4 h-4 shrink-0" style={{ color: "#7c3aed" }} />
          <span className="text-sm font-bold mr-1" style={{ color: "#d4c8ff" }}>Editor</span>

          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger
              data-testid="select-language"
              className="w-38 h-7 text-xs"
              style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.25)", color: "#c4b5fd" }}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map(l => <SelectItem key={l.value} value={l.value} className="text-xs">{l.label}</SelectItem>)}
            </SelectContent>
          </Select>

          <div className="flex-1" />

          {[
            { icon: Copy, label: "Copy code", fn: () => { navigator.clipboard.writeText(code); toast({ title: "Copied!" }); }, id: "button-copy-code" },
            { icon: Save, label: "Save as snippet", fn: async () => { await createSnippet.mutateAsync({ data: { title: `Snippet ${new Date().toLocaleString()}`, code, language } }); queryClient.invalidateQueries({ queryKey: getListSnippetsQueryKey() }); toast({ title: "Saved!" }); }, id: "button-save-snippet" },
            { icon: Eraser, label: "Clear editor", fn: () => setCode("// Start coding here...\n"), id: "button-clear-editor" },
          ].map(({ icon: Icon, label, fn, id }) => (
            <Tooltip key={id} delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={fn}
                  data-testid={id}
                  className="flex items-center justify-center w-7 h-7 rounded-lg transition-all"
                  style={{ color: "#5a4a8a" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#a78bfa"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(124,58,237,0.12)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#5a4a8a"; (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">{label}</TooltipContent>
            </Tooltip>
          ))}

          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setChatOpen(p => !p)}
                data-testid="button-toggle-chat"
                className="flex items-center justify-center w-7 h-7 rounded-lg transition-all"
                style={{ color: "#5a4a8a" }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#a78bfa"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(124,58,237,0.12)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#5a4a8a"; (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
              >
                {chatOpen ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
              </button>
            </TooltipTrigger>
            <TooltipContent className="text-xs">{chatOpen ? "Hide AI" : "Show AI"}</TooltipContent>
          </Tooltip>
        </div>

        {/* Monaco */}
        <div className="flex-1 overflow-hidden">
          <Editor
            height="100%"
            language={language}
            value={code}
            onChange={v => setCode(v ?? "")}
            options={{
              fontSize: 14,
              fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, monospace",
              fontLigatures: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              lineNumbers: "on",
              renderLineHighlight: "line",
              cursorBlinking: "smooth",
              smoothScrolling: true,
              padding: { top: 20, bottom: 20 },
              tabSize: 2,
              wordWrap: "on",
              automaticLayout: true,
            }}
            beforeMount={monaco => {
              monaco.editor.defineTheme("nexus", {
                base: "vs-dark",
                inherit: true,
                rules: [
                  { token: "keyword", foreground: "a78bfa", fontStyle: "bold" },
                  { token: "string", foreground: "34d399" },
                  { token: "comment", foreground: "4a3a6a", fontStyle: "italic" },
                  { token: "number", foreground: "f472b6" },
                  { token: "type", foreground: "60a5fa" },
                  { token: "function", foreground: "c084fc" },
                ],
                colors: {
                  "editor.background": "#04000e",
                  "editor.foreground": "#c8b8f0",
                  "editor.lineHighlightBackground": "#0d0620",
                  "editorLineNumber.foreground": "#2a1a50",
                  "editorLineNumber.activeForeground": "#7c3aed",
                  "editor.selectionBackground": "#7c3aed33",
                  "editorCursor.foreground": "#a78bfa",
                  "editor.findMatchBackground": "#7c3aed44",
                  "editorGutter.background": "#04000e",
                  "editorBracketMatch.background": "#7c3aed33",
                  "editorBracketMatch.border": "#7c3aed",
                },
              });
            }}
            onMount={(_, monaco) => { monaco.editor.setTheme("nexus"); }}
          />
        </div>
      </div>

      {/* Resize handle */}
      {chatOpen && (
        <div
          className="w-0.5 shrink-0 cursor-col-resize transition-all"
          style={{ background: "rgba(124,58,237,0.12)" }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(124,58,237,0.5)")}
          onMouseLeave={e => (e.currentTarget.style.background = "rgba(124,58,237,0.12)")}
          onMouseDown={e => {
            const startX = e.clientX, startW = editorWidth;
            const onMove = (ev: MouseEvent) => {
              const p = (e.target as HTMLElement).parentElement;
              if (!p) return;
              setEditorWidth(Math.min(80, Math.max(20, startW + (ev.clientX - startX) / p.offsetWidth * 100)));
            };
            const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
            window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
          }}
        />
      )}

      {/* ── AI CHAT PANEL ── */}
      {chatOpen && (
        <div
          className="flex flex-col overflow-hidden"
          style={{ width: `${100 - editorWidth}%`, background: "rgba(4,0,12,0.85)", backdropFilter: "blur(20px)" }}
        >
          {/* Chat header */}
          <div
            className="flex items-center gap-3 px-4 py-2 shrink-0"
            style={{ background: TOPBAR, borderBottom: DIVIDER, minHeight: "46px" }}
          >
            <div
              className="flex items-center justify-center w-7 h-7 rounded-lg shrink-0"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
                boxShadow: "0 0 14px rgba(124,58,237,0.6)",
              }}
            >
              <Bot className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold gradient-text-purple leading-none">Nexus AI</p>
              <p className="text-[10px] mt-0.5" style={{ color: "#4a3a6a" }}>
                {isStreaming ? "Generating..." : "Ready"}
              </p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  data-testid="dropdown-conversations"
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-all"
                  style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.22)", color: "#a78bfa" }}
                >
                  Chats <ChevronDown className="w-3 h-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  onClick={startNewConversation}
                  className="text-xs gap-2 cursor-pointer"
                  style={{ color: "#a78bfa" }}
                  data-testid="button-new-conversation"
                >
                  <Plus className="w-3 h-3" /> New conversation
                </DropdownMenuItem>
                {conversations.length > 0 && <DropdownMenuSeparator />}
                {conversations.map(conv => (
                  <DropdownMenuItem
                    key={conv.id}
                    onClick={() => { setConversationId(conv.id); setMessages([]); }}
                    className={cn("text-xs flex items-center justify-between group cursor-pointer", conversationId === conv.id && "bg-primary/10")}
                    data-testid={`conversation-item-${conv.id}`}
                  >
                    <span className="truncate flex-1">{conv.title}</span>
                    <button
                      onClick={async e => { e.stopPropagation(); await deleteConversation.mutateAsync({ id: conv.id }); queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() }); if (conversationId === conv.id) startNewConversation(); }}
                      className="opacity-0 group-hover:opacity-100 hover:text-destructive ml-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Action pills */}
          <div
            className="flex flex-wrap gap-1.5 px-4 py-2.5 shrink-0"
            style={{ borderBottom: DIVIDER, background: "rgba(6,0,18,0.6)" }}
          >
            {AI_ACTIONS.map(a => (
              <button
                key={a.label}
                onClick={() => { setChatInput(a.prompt); textareaRef.current?.focus(); }}
                className="action-pill"
                data-testid={`button-action-${a.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {a.label}
              </button>
            ))}
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1">
            <div className="p-5 space-y-5 min-h-full">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
                  <div
                    className="relative flex items-center justify-center w-20 h-20 rounded-3xl"
                    style={{
                      background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(6,182,212,0.12))",
                      border: "1px solid rgba(124,58,237,0.35)",
                      boxShadow: "0 0 40px rgba(124,58,237,0.2), inset 0 0 40px rgba(124,58,237,0.05)",
                    }}
                  >
                    <Zap className="w-9 h-9" style={{ color: "#a78bfa" }} />
                    <div
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)", boxShadow: "0 0 8px rgba(124,58,237,0.8)" }}
                    >
                      <Sparkles className="w-2.5 h-2.5 text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="text-base font-bold gradient-text-purple">Your AI co-pilot is ready</p>
                    <p className="text-xs mt-2 max-w-[200px] mx-auto" style={{ color: "#3a2a5a", lineHeight: "1.5" }}>
                      Write code, ask questions, or click an action button above
                    </p>
                  </div>
                </div>
              )}

              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "flex-row")}
                  data-testid={`message-${msg.role}-${msg.id}`}
                >
                  <div
                    className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
                    style={
                      msg.role === "user"
                        ? { background: "linear-gradient(135deg, #7c3aed, #3b82f6)", boxShadow: "0 0 10px rgba(124,58,237,0.5)" }
                        : { background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)" }
                    }
                  >
                    {msg.role === "user"
                      ? <span className="text-[10px] font-bold text-white">U</span>
                      : <Bot className="w-3.5 h-3.5" style={{ color: "#a78bfa" }} />}
                  </div>

                  <div
                    className="max-w-[86%] rounded-2xl px-4 py-3"
                    style={
                      msg.role === "user"
                        ? {
                            background: "linear-gradient(135deg, rgba(124,58,237,0.25), rgba(59,130,246,0.18))",
                            border: "1px solid rgba(124,58,237,0.4)",
                            boxShadow: "0 2px 12px rgba(124,58,237,0.15)",
                          }
                        : {
                            background: "rgba(8,2,22,0.7)",
                            border: "1px solid rgba(124,58,237,0.12)",
                          }
                    }
                  >
                    {msg.role === "assistant" ? (
                      msg.content
                        ? <MessageContent content={msg.content} />
                        : (
                          <div className="flex items-center gap-2.5 py-1">
                            <div className="flex gap-1">
                              {[0, 1, 2].map(i => (
                                <div
                                  key={i}
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{
                                    background: "#7c3aed",
                                    animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                                  }}
                                />
                              ))}
                            </div>
                            <span className="text-xs" style={{ color: "#4a3a6a" }}>Thinking...</span>
                          </div>
                        )
                    ) : (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#d4c8ff" }}>{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          </ScrollArea>

          {/* Input area */}
          <div className="p-4 shrink-0" style={{ borderTop: DIVIDER }}>
            <div
              className="flex items-end gap-2 rounded-2xl px-4 py-3 transition-all"
              style={{
                background: "rgba(8,2,22,0.8)",
                border: "1px solid rgba(124,58,237,0.22)",
              }}
              onFocus={() => {}}
            >
              <textarea
                ref={textareaRef}
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about your code..."
                rows={1}
                data-testid="input-chat-message"
                className="flex-1 bg-transparent text-sm outline-none resize-none min-h-[22px] max-h-36 leading-[1.5]"
                style={{ color: "#d4c8ff", fontFamily: "'Inter', sans-serif" }}
                onInput={e => { const el = e.target as HTMLTextAreaElement; el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`; }}
              />
              <button
                onClick={() => sendMessage(chatInput)}
                disabled={!chatInput.trim() || isStreaming || !conversationId}
                data-testid="button-send-message"
                className="btn-nexus flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
              >
                {isStreaming ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
              </button>
            </div>
            <p className="text-[10px] text-center mt-2" style={{ color: "#2a1a40" }}>
              Enter to send · Shift+Enter for new line · AI has full context of your code
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
