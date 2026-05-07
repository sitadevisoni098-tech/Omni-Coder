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
import { useTheme } from "@/components/ThemeProvider";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Code2,
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
  { label: "Generate", prompt: "Generate code for the following task: " },
  { label: "Explain", prompt: "Explain what this code does in detail: " },
  { label: "Debug", prompt: "Find and fix any bugs in this code: " },
  { label: "Refactor", prompt: "Refactor this code to be cleaner and more efficient: " },
  { label: "Add Comments", prompt: "Add comprehensive comments to this code: " },
  { label: "Write Tests", prompt: "Write comprehensive unit tests for this code: " },
  { label: "Translate", prompt: "Translate this code to another language (specify which): " },
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
    <div className="relative group my-2">
      <div className="flex items-center justify-between bg-[#1a1a2e] border border-border rounded-t-md px-3 py-1.5">
        <span className="text-xs text-muted-foreground font-mono">{language ?? "code"}</span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(code);
            toast({ title: "Copied to clipboard" });
          }}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          <Copy className="w-3 h-3" />
          Copy
        </button>
      </div>
      <pre className="bg-[#12121f] border border-t-0 border-border rounded-b-md overflow-x-auto p-4 text-sm text-foreground font-mono leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  const parts: Array<{ type: "text" | "code"; content: string; language?: string }> = [];
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", content: content.slice(lastIndex, match.index) });
    }
    parts.push({ type: "code", content: match[2].trim(), language: match[1] || undefined });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({ type: "text", content: content.slice(lastIndex) });
  }

  return (
    <div>
      {parts.map((part, i) =>
        part.type === "code" ? (
          <CodeBlock key={i} code={part.content} language={part.language} />
        ) : (
          <p key={i} className="text-sm leading-relaxed whitespace-pre-wrap">
            {part.content}
          </p>
        )
      )}
    </div>
  );
}

export default function EditorPage() {
  const { theme } = useTheme();
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
  const abortControllerRef = useRef<AbortController | null>(null);

  const { data: conversations = [] } = useListOpenaiConversations();
  const createConversation = useCreateOpenaiConversation();
  const deleteConversation = useDeleteOpenaiConversation();
  const createSnippet = useCreateSnippet();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startNewConversation = useCallback(async () => {
    const conv = await createConversation.mutateAsync({
      data: { title: "New Chat" },
    });
    setConversationId(conv.id);
    setMessages([]);
    queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
  }, [createConversation, queryClient]);

  useEffect(() => {
    if (!conversationId) {
      startNewConversation();
    }
  }, []);

  const sendMessage = useCallback(async (userMessage: string) => {
    if (!conversationId || !userMessage.trim() || isStreaming) return;

    const userMsg: Message = {
      role: "user",
      content: userMessage,
      id: Date.now().toString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsStreaming(true);

    const assistantMsgId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { role: "assistant", content: "", id: assistantMsgId }]);

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(`/api/openai/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `The user has the following ${language} code:\n\`\`\`${language}\n${code}\n\`\`\`\n\nUser request: ${userMessage}`,
        }),
        signal: abortControllerRef.current.signal,
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
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? { ...m, content: m.content + parsed.content }
                      : m
                  )
                );
              }
            } catch {}
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        toast({ title: "AI error", description: "Failed to get a response.", variant: "destructive" });
        setMessages((prev) => prev.filter((m) => m.id !== assistantMsgId));
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

  const handleActionButton = (prompt: string) => {
    setChatInput(prompt);
    textareaRef.current?.focus();
  };

  const handleSaveSnippet = async () => {
    const title = `Snippet ${new Date().toLocaleString()}`;
    await createSnippet.mutateAsync({
      data: { title, code, language },
    });
    queryClient.invalidateQueries({ queryKey: getListSnippetsQueryKey() });
    toast({ title: "Saved to snippets" });
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied to clipboard" });
  };

  const handleSelectConversation = (id: number) => {
    setConversationId(id);
    setMessages([]);
  };

  const handleDeleteConversation = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteConversation.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
    if (conversationId === id) {
      startNewConversation();
    }
  };

  const monacoTheme = theme === "dark" ? "vs-dark" : "vs";

  return (
    <div className="flex h-full overflow-hidden">
      {/* Editor Panel */}
      <div
        className="flex flex-col overflow-hidden border-r border-border"
        style={{ width: chatOpen ? `${editorWidth}%` : "100%" }}
      >
        {/* Editor Toolbar */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-1.5 mr-2">
            <Code2 className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Editor</span>
          </div>

          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger
              data-testid="select-language"
              className="w-36 h-7 text-xs bg-background border-border"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value} className="text-xs">
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex-1" />

          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleCopyCode}
                data-testid="button-copy-code"
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy code</TooltipContent>
          </Tooltip>

          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleSaveSnippet}
                data-testid="button-save-snippet"
              >
                <Save className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Save as snippet</TooltipContent>
          </Tooltip>

          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setCode("// Start coding here...\n")}
                data-testid="button-clear-editor"
              >
                <Eraser className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Clear editor</TooltipContent>
          </Tooltip>

          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setChatOpen((p) => !p)}
                data-testid="button-toggle-chat"
              >
                {chatOpen ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{chatOpen ? "Hide AI chat" : "Show AI chat"}</TooltipContent>
          </Tooltip>
        </div>

        {/* Monaco Editor */}
        <div className="flex-1 overflow-hidden">
          <Editor
            height="100%"
            language={language}
            value={code}
            onChange={(v) => setCode(v ?? "")}
            theme={monacoTheme}
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
              padding: { top: 16, bottom: 16 },
              tabSize: 2,
              wordWrap: "on",
              automaticLayout: true,
            }}
          />
        </div>
      </div>

      {/* Resize handle */}
      {chatOpen && (
        <div
          className="w-1 cursor-col-resize bg-border hover:bg-primary/50 transition-colors shrink-0"
          onMouseDown={(e) => {
            const startX = e.clientX;
            const startWidth = editorWidth;
            const onMove = (ev: MouseEvent) => {
              const parent = (e.target as HTMLElement).parentElement;
              if (!parent) return;
              const totalWidth = parent.offsetWidth;
              const delta = ev.clientX - startX;
              const newWidth = Math.min(80, Math.max(20, startWidth + (delta / totalWidth) * 100));
              setEditorWidth(newWidth);
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

      {/* AI Chat Panel */}
      {chatOpen && (
        <div className="flex flex-col overflow-hidden bg-card" style={{ width: `${100 - editorWidth}%` }}>
          {/* Chat Header */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0">
            <MessageSquare className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground flex-1">AI Assistant</span>

            {/* Conversation selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" data-testid="dropdown-conversations">
                  Chats <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  onClick={startNewConversation}
                  className="text-xs text-primary"
                  data-testid="button-new-conversation"
                >
                  <Plus className="w-3 h-3 mr-1.5" />
                  New conversation
                </DropdownMenuItem>
                {conversations.length > 0 && <DropdownMenuSeparator />}
                {conversations.map((conv) => (
                  <DropdownMenuItem
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    className={cn(
                      "text-xs flex items-center justify-between group",
                      conversationId === conv.id && "bg-accent text-accent-foreground"
                    )}
                    data-testid={`conversation-item-${conv.id}`}
                  >
                    <span className="truncate flex-1">{conv.title}</span>
                    <button
                      onClick={(e) => handleDeleteConversation(conv.id, e)}
                      className="opacity-0 group-hover:opacity-100 hover:text-destructive ml-1 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* AI Action buttons */}
          <div className="flex flex-wrap gap-1.5 px-3 py-2 border-b border-border shrink-0">
            {AI_ACTIONS.map((action) => (
              <button
                key={action.label}
                onClick={() => handleActionButton(action.prompt)}
                data-testid={`button-action-${action.label.toLowerCase().replace(/\s+/g, "-")}`}
                className="text-xs px-2.5 py-1 rounded-full border border-border bg-background hover:bg-accent hover:text-accent-foreground hover:border-primary/50 transition-all text-foreground"
              >
                {action.label}
              </button>
            ))}
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-40 text-center">
                  <MessageSquare className="w-8 h-8 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground font-medium">Ask the AI anything</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Use the action buttons above or type a question
                  </p>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.role === "user" ? "flex-row-reverse" : "flex-row"
                  )}
                  data-testid={`message-${message.role}-${message.id}`}
                >
                  <div
                    className={cn(
                      "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground border border-border"
                    )}
                  >
                    {message.role === "user" ? "U" : "AI"}
                  </div>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-xl px-3 py-2.5 text-sm",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-background border border-border text-foreground"
                    )}
                  >
                    {message.role === "assistant" ? (
                      message.content ? (
                        <MessageContent content={message.content} />
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Thinking...</span>
                        </div>
                      )
                    ) : (
                      <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          </ScrollArea>

          {/* Chat Input */}
          <div className="p-3 border-t border-border shrink-0">
            <div className="flex items-end gap-2 bg-background border border-border rounded-xl px-3 py-2 focus-within:border-primary/60 transition-colors">
              <textarea
                ref={textareaRef}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your code... (Enter to send, Shift+Enter for new line)"
                rows={1}
                data-testid="input-chat-message"
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none min-h-[20px] max-h-32 leading-5"
                style={{ height: "auto" }}
                onInput={(e) => {
                  const el = e.target as HTMLTextAreaElement;
                  el.style.height = "auto";
                  el.style.height = `${el.scrollHeight}px`;
                }}
              />
              <Button
                size="icon"
                className="h-7 w-7 shrink-0 rounded-lg"
                onClick={() => sendMessage(chatInput)}
                disabled={!chatInput.trim() || isStreaming || !conversationId}
                data-testid="button-send-message"
              >
                {isStreaming ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
