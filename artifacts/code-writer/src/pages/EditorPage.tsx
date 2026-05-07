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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Copy,
  Trash2,
  Save,
  ChevronDown,
  Plus,
  Loader2,
  Send,
  Eraser,
  ChevronRight,
  ChevronLeft,
  MessageSquare,
  Code2,
  Sparkles,
  Zap,
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
  { label: "Explain", prompt: "Explain what this code does: " },
  { label: "Debug", prompt: "Find and fix bugs in this code: " },
  { label: "Refactor", prompt: "Refactor this code to be cleaner: " },
  { label: "Add Comments", prompt: "Add comprehensive comments to this code: " },
  { label: "Write Tests", prompt: "Write unit tests for this code: " },
  { label: "Translate", prompt: "Translate this code to another language: " },
  { label: "Optimize", prompt: "Optimize this code for performance: " },
];

interface Message {
  role: "user" | "assistant";
  content: string;
  id: string;
}

function CodeBlock({ code, language }: { code: string; language?: string }) {
  const { toast } = useToast();
  return (
    <div className="my-3 rounded-lg overflow-hidden chat-code-block">
      <div
        className="flex items-center justify-between px-3 py-1.5"
        style={{
          background: "rgba(6,182,212,0.08)",
          borderBottom: "1px solid rgba(6,182,212,0.15)",
        }}
      >
        <span className="text-[10px] font-mono" style={{ color: "rgba(6,182,212,0.7)" }}>
          {language ?? "code"}
        </span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(code);
            toast({ title: "Copied to clipboard" });
          }}
          className="text-[10px] flex items-center gap-1 transition-colors"
          style={{ color: "rgba(6,182,212,0.6)" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#06b6d4")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(6,182,212,0.6)")}
        >
          <Copy className="w-3 h-3" /> Copy
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-sm font-mono leading-relaxed text-[#a8b8d0] bg-transparent">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  const parts: Array<{ type: "text" | "code"; content: string; language?: string }> = [];
  const regex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) parts.push({ type: "text", content: content.slice(lastIndex, match.index) });
    parts.push({ type: "code", content: match[2].trim(), language: match[1] || undefined });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) parts.push({ type: "text", content: content.slice(lastIndex) });

  return (
    <div>
      {parts.map((part, i) =>
        part.type === "code" ? (
          <CodeBlock key={i} code={part.content} language={part.language} />
        ) : (
          <p key={i} className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#a8b8d0" }}>
            {part.content}
          </p>
        )
      )}
    </div>
  );
}

const PANEL_BORDER = "1px solid rgba(6,182,212,0.12)";
const TOOLBAR_BG = "rgba(4,9,20,0.9)";

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
  const [editorWidth, setEditorWidth] = useState(60);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: conversations = [] } = useListOpenaiConversations();
  const createConversation = useCreateOpenaiConversation();
  const deleteConversation = useDeleteOpenaiConversation();
  const createSnippet = useCreateSnippet();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startNewConversation = useCallback(async () => {
    const conv = await createConversation.mutateAsync({ data: { title: "New Chat" } });
    setConversationId(conv.id);
    setMessages([]);
    queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
  }, [createConversation, queryClient]);

  useEffect(() => {
    if (!conversationId) startNewConversation();
  }, []);

  const sendMessage = useCallback(async (userMessage: string) => {
    if (!conversationId || !userMessage.trim() || isStreaming) return;

    const userMsg: Message = { role: "user", content: userMessage, id: Date.now().toString() };
    setMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setIsStreaming(true);

    const assistantMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { role: "assistant", content: "", id: assistantMsgId }]);

    try {
      const response = await fetch(`/api/openai/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `The user has the following ${language} code:\n\`\`\`${language}\n${code}\n\`\`\`\n\nUser request: ${userMessage}`,
        }),
      });

      if (!response.ok || !response.body) throw new Error("Failed to connect");

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
              if (parsed.content) {
                setMessages(prev =>
                  prev.map(m => m.id === assistantMsgId ? { ...m, content: m.content + parsed.content } : m)
                );
              }
            } catch {}
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        toast({ title: "AI error", description: "Failed to get a response.", variant: "destructive" });
        setMessages(prev => prev.filter(m => m.id !== assistantMsgId));
      }
    } finally {
      setIsStreaming(false);
    }
  }, [conversationId, code, language, isStreaming, toast]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(chatInput);
    }
  };

  const handleSaveSnippet = async () => {
    await createSnippet.mutateAsync({ data: { title: `Snippet ${new Date().toLocaleString()}`, code, language } });
    queryClient.invalidateQueries({ queryKey: getListSnippetsQueryKey() });
    toast({ title: "Saved to snippets" });
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied to clipboard" });
  };

  const handleDeleteConversation = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteConversation.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
    if (conversationId === id) startNewConversation();
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── EDITOR PANEL ── */}
      <div
        className="flex flex-col overflow-hidden"
        style={{ width: chatOpen ? `${editorWidth}%` : "100%", borderRight: PANEL_BORDER }}
      >
        {/* Toolbar */}
        <div
          className="flex items-center gap-2 px-3 py-2 shrink-0"
          style={{ background: TOOLBAR_BG, borderBottom: PANEL_BORDER }}
        >
          <div className="flex items-center gap-1.5">
            <Code2 className="w-4 h-4" style={{ color: "#06b6d4" }} />
            <span className="text-sm font-semibold" style={{ color: "#e0eaf5", fontFamily: "var(--app-font-sans)" }}>
              Editor
            </span>
          </div>

          {/* Language selector */}
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger
              data-testid="select-language"
              className="w-36 h-7 text-xs border-[rgba(6,182,212,0.2)] bg-[rgba(6,182,212,0.05)] text-[#a8b8d0] hover:border-[rgba(6,182,212,0.4)] focus:ring-0"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map(lang => (
                <SelectItem key={lang.value} value={lang.value} className="text-xs">{lang.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex-1" />

          {/* Icon buttons */}
          {[
            { icon: Copy, label: "Copy code", onClick: handleCopyCode, testId: "button-copy-code" },
            { icon: Save, label: "Save as snippet", onClick: handleSaveSnippet, testId: "button-save-snippet" },
            { icon: Eraser, label: "Clear editor", onClick: () => setCode("// Start coding here...\n"), testId: "button-clear-editor" },
          ].map(({ icon: Icon, label, onClick, testId }) => (
            <Tooltip key={testId} delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  className="flex items-center justify-center w-7 h-7 rounded-lg text-[#4a6080] hover:text-[#06b6d4] transition-colors"
                  onClick={onClick}
                  data-testid={testId}
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
                className="flex items-center justify-center w-7 h-7 rounded-lg text-[#4a6080] hover:text-[#06b6d4] transition-colors"
                onClick={() => setChatOpen(p => !p)}
                data-testid="button-toggle-chat"
              >
                {chatOpen ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
              </button>
            </TooltipTrigger>
            <TooltipContent className="text-xs">{chatOpen ? "Hide AI" : "Show AI"}</TooltipContent>
          </Tooltip>
        </div>

        {/* Monaco */}
        <div className="flex-1 overflow-hidden" style={{ background: "#050a14" }}>
          <Editor
            height="100%"
            language={language}
            value={code}
            onChange={v => setCode(v ?? "")}
            theme="vs-dark"
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
              monaco.editor.defineTheme("nexus-dark", {
                base: "vs-dark",
                inherit: true,
                rules: [],
                colors: {
                  "editor.background": "#050a14",
                  "editor.lineHighlightBackground": "#0a1525",
                  "editorLineNumber.foreground": "#2a4060",
                  "editorLineNumber.activeForeground": "#06b6d4",
                  "editor.selectionBackground": "#06b6d420",
                  "editorCursor.foreground": "#06b6d4",
                  "editor.findMatchBackground": "#06b6d430",
                },
              });
            }}
            onMount={(_, monaco) => {
              monaco.editor.setTheme("nexus-dark");
            }}
          />
        </div>
      </div>

      {/* Resize handle */}
      {chatOpen && (
        <div
          className="w-0.5 cursor-col-resize shrink-0 transition-colors"
          style={{ background: "rgba(6,182,212,0.1)" }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(6,182,212,0.4)")}
          onMouseLeave={e => (e.currentTarget.style.background = "rgba(6,182,212,0.1)")}
          onMouseDown={e => {
            const startX = e.clientX;
            const startWidth = editorWidth;
            const onMove = (ev: MouseEvent) => {
              const parent = (e.target as HTMLElement).parentElement;
              if (!parent) return;
              const delta = ev.clientX - startX;
              const newW = Math.min(80, Math.max(20, startWidth + (delta / parent.offsetWidth) * 100));
              setEditorWidth(newW);
            };
            const onUp = () => {
              window.removeEventListener("mousemove", onMove);
              window.removeEventListener("mouseup", onUp);
            };
            window.addEventListener("mousemove", onMove);
            window.addEventListener("mouseup", onUp);
          }}
        />
      )}

      {/* ── AI CHAT PANEL ── */}
      {chatOpen && (
        <div
          className="flex flex-col overflow-hidden"
          style={{ width: `${100 - editorWidth}%`, background: "rgba(4,9,20,0.95)" }}
        >
          {/* Chat header */}
          <div
            className="flex items-center gap-2 px-4 py-2.5 shrink-0"
            style={{ background: TOOLBAR_BG, borderBottom: PANEL_BORDER }}
          >
            <div className="flex items-center gap-2 flex-1">
              <div
                className="flex items-center justify-center w-6 h-6 rounded-md"
                style={{ background: "rgba(6,182,212,0.15)", border: "1px solid rgba(6,182,212,0.3)" }}
              >
                <Sparkles className="w-3 h-3" style={{ color: "#06b6d4" }} />
              </div>
              <span
                className="text-sm font-semibold gradient-text"
                style={{ fontFamily: "var(--app-font-sans)" }}
              >
                Nexus AI
              </span>
            </div>

            {/* Conversations dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition-all"
                  style={{
                    color: "rgba(6,182,212,0.8)",
                    background: "rgba(6,182,212,0.06)",
                    border: "1px solid rgba(6,182,212,0.15)",
                  }}
                  data-testid="dropdown-conversations"
                >
                  Chats <ChevronDown className="w-3 h-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  onClick={startNewConversation}
                  className="text-xs gap-2 cursor-pointer"
                  style={{ color: "#06b6d4" }}
                  data-testid="button-new-conversation"
                >
                  <Plus className="w-3 h-3" /> New conversation
                </DropdownMenuItem>
                {conversations.length > 0 && <DropdownMenuSeparator />}
                {conversations.map(conv => (
                  <DropdownMenuItem
                    key={conv.id}
                    onClick={() => { setConversationId(conv.id); setMessages([]); }}
                    className={cn(
                      "text-xs flex items-center justify-between group cursor-pointer",
                      conversationId === conv.id && "bg-accent/10"
                    )}
                    data-testid={`conversation-item-${conv.id}`}
                  >
                    <span className="truncate flex-1">{conv.title}</span>
                    <button
                      onClick={e => handleDeleteConversation(conv.id, e)}
                      className="opacity-0 group-hover:opacity-100 hover:text-destructive ml-1 transition-opacity"
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
            style={{ borderBottom: PANEL_BORDER, background: "rgba(4,9,20,0.6)" }}
          >
            {AI_ACTIONS.map(action => (
              <button
                key={action.label}
                onClick={() => { setChatInput(action.prompt); textareaRef.current?.focus(); }}
                className="action-pill"
                data-testid={`button-action-${action.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {action.label}
              </button>
            ))}
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-5">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-48 text-center gap-3 mt-4">
                  <div
                    className="flex items-center justify-center w-14 h-14 rounded-2xl"
                    style={{
                      background: "linear-gradient(135deg, rgba(6,182,212,0.15), rgba(59,130,246,0.1))",
                      border: "1px solid rgba(6,182,212,0.25)",
                      boxShadow: "0 0 24px rgba(6,182,212,0.1)",
                    }}
                  >
                    <Zap className="w-6 h-6" style={{ color: "#06b6d4" }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "#e0eaf5" }}>
                      Your AI co-pilot is ready
                    </p>
                    <p className="text-xs mt-1" style={{ color: "#3a5070" }}>
                      Use action buttons above or type a question
                    </p>
                  </div>
                </div>
              )}

              {messages.map(message => (
                <div
                  key={message.id}
                  className={cn("flex gap-3", message.role === "user" ? "flex-row-reverse" : "flex-row")}
                  data-testid={`message-${message.role}-${message.id}`}
                >
                  {/* Avatar */}
                  <div
                    className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold"
                    style={
                      message.role === "user"
                        ? { background: "linear-gradient(135deg, #06b6d4, #3b82f6)", color: "#fff" }
                        : {
                            background: "rgba(6,182,212,0.12)",
                            border: "1px solid rgba(6,182,212,0.3)",
                            color: "#06b6d4",
                          }
                    }
                  >
                    {message.role === "user" ? "U" : <Sparkles className="w-3 h-3" />}
                  </div>

                  {/* Bubble */}
                  <div
                    className="max-w-[85%] rounded-xl px-3.5 py-2.5"
                    style={
                      message.role === "user"
                        ? {
                            background: "linear-gradient(135deg, rgba(6,182,212,0.2), rgba(59,130,246,0.15))",
                            border: "1px solid rgba(6,182,212,0.3)",
                            color: "#e0eaf5",
                          }
                        : {
                            background: "rgba(6,12,26,0.7)",
                            border: "1px solid rgba(6,182,212,0.1)",
                            color: "#a8b8d0",
                          }
                    }
                  >
                    {message.role === "assistant" ? (
                      message.content ? (
                        <MessageContent content={message.content} />
                      ) : (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-3 h-3 animate-spin" style={{ color: "#06b6d4" }} />
                          <span className="text-xs" style={{ color: "#3a5070" }}>Thinking...</span>
                        </div>
                      )
                    ) : (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-3 shrink-0" style={{ borderTop: PANEL_BORDER }}>
            <div
              className="flex items-end gap-2 rounded-xl px-3 py-2.5 glow-focus transition-all"
              style={{
                background: "rgba(6,12,26,0.8)",
                border: "1px solid rgba(6,182,212,0.18)",
              }}
            >
              <textarea
                ref={textareaRef}
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your code... (Enter to send)"
                rows={1}
                data-testid="input-chat-message"
                className="flex-1 bg-transparent text-sm outline-none resize-none min-h-[20px] max-h-32 leading-5"
                style={{ color: "#c8d8e8", fontFamily: "var(--app-font-sans)" }}
                onInput={e => {
                  const el = e.target as HTMLTextAreaElement;
                  el.style.height = "auto";
                  el.style.height = `${el.scrollHeight}px`;
                }}
              />
              <button
                onClick={() => sendMessage(chatInput)}
                disabled={!chatInput.trim() || isStreaming || !conversationId}
                data-testid="button-send-message"
                className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-all disabled:opacity-30"
                style={{
                  background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
                  boxShadow: "0 0 12px rgba(6,182,212,0.4)",
                }}
              >
                {isStreaming ? (
                  <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5 text-white" />
                )}
              </button>
            </div>
            <p className="text-[10px] mt-1.5 text-center" style={{ color: "#2a3a50" }}>
              Shift+Enter for new line · Context includes your current code
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
