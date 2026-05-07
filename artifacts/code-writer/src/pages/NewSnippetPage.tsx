import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import Editor from "@monaco-editor/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateSnippet,
  useUpdateSnippet,
  useGetSnippet,
  getListSnippetsQueryKey,
  getGetSnippetQueryKey,
  getGetSnippetStatsQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, Loader2, Plus, FilePlus } from "lucide-react";

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

const PANEL_BORDER = "1px solid rgba(6,182,212,0.12)";

export default function NewSnippetPage() {
  const params = useParams<{ id?: string }>();
  const snippetId = params.id ? parseInt(params.id, 10) : undefined;
  const isEditing = !!snippetId;

  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [code, setCode] = useState("// Write your code here...\n");
  const [language, setLanguage] = useState("javascript");
  const [description, setDescription] = useState("");

  const { data: existing } = useGetSnippet(
    snippetId!,
    { query: { enabled: isEditing, queryKey: getGetSnippetQueryKey(snippetId!) } }
  );

  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      setCode(existing.code);
      setLanguage(existing.language);
      setDescription(existing.description ?? "");
    }
  }, [existing]);

  const createSnippet = useCreateSnippet();
  const updateSnippet = useUpdateSnippet();
  const isSaving = createSnippet.isPending || updateSnippet.isPending;

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    if (isEditing && snippetId) {
      await updateSnippet.mutateAsync({ id: snippetId, data: { title, code, language, description: description || null } });
      queryClient.invalidateQueries({ queryKey: getGetSnippetQueryKey(snippetId) });
    } else {
      await createSnippet.mutateAsync({ data: { title, code, language, description: description || null } });
    }
    queryClient.invalidateQueries({ queryKey: getListSnippetsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetSnippetStatsQueryKey() });
    toast({ title: isEditing ? "Snippet updated" : "Snippet saved" });
    setLocation("/snippets");
  };

  const fieldStyle = {
    background: "rgba(6,12,26,0.8)",
    border: "1px solid rgba(6,182,212,0.15)",
    color: "#c8d8e8",
    fontFamily: "var(--app-font-sans)",
    borderRadius: "0.6rem",
    outline: "none",
    transition: "border-color 0.15s ease",
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-6 py-3.5 shrink-0"
        style={{ background: "rgba(4,9,20,0.9)", borderBottom: PANEL_BORDER }}
      >
        <button
          onClick={() => setLocation("/snippets")}
          data-testid="button-back"
          className="flex items-center justify-center w-8 h-8 rounded-xl transition-all"
          style={{ color: "#3a5070", border: "1px solid rgba(6,182,212,0.12)" }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.color = "#06b6d4";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(6,182,212,0.35)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.color = "#3a5070";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(6,182,212,0.12)";
          }}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-xl"
            style={{
              background: "linear-gradient(135deg, rgba(6,182,212,0.2), rgba(59,130,246,0.15))",
              border: "1px solid rgba(6,182,212,0.35)",
              boxShadow: "0 0 12px rgba(6,182,212,0.2)",
            }}
          >
            {isEditing ? (
              <Save className="w-4 h-4" style={{ color: "#06b6d4" }} />
            ) : (
              <FilePlus className="w-4 h-4" style={{ color: "#06b6d4" }} />
            )}
          </div>
          <h1
            className="text-base font-bold"
            style={{ color: "#e0eaf5", fontFamily: "var(--app-font-sans)" }}
          >
            {isEditing ? "Edit Snippet" : "New Snippet"}
          </h1>
        </div>

        <div className="flex-1" />

        <button
          onClick={handleSave}
          disabled={isSaving}
          data-testid="button-save-snippet"
          className="nexus-btn flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl text-white disabled:opacity-40"
        >
          {isSaving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : isEditing ? (
            <Save className="w-3.5 h-3.5" />
          ) : (
            <Plus className="w-3.5 h-3.5" />
          )}
          {isEditing ? "Update" : "Save Snippet"}
        </button>
      </div>

      {/* Metadata fields */}
      <div
        className="grid grid-cols-1 md:grid-cols-3 gap-4 px-6 py-4 shrink-0"
        style={{ background: "rgba(4,9,20,0.6)", borderBottom: PANEL_BORDER }}
      >
        {/* Title */}
        <div className="md:col-span-2 flex flex-col gap-1.5">
          <label className="text-[11px] font-medium" style={{ color: "#3a5070" }}>
            Title
          </label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Give your snippet a name..."
            data-testid="input-snippet-title"
            className="h-9 px-3 text-sm"
            style={fieldStyle}
            onFocus={e => (e.currentTarget.style.borderColor = "rgba(6,182,212,0.5)")}
            onBlur={e => (e.currentTarget.style.borderColor = "rgba(6,182,212,0.15)")}
          />
        </div>

        {/* Language */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium" style={{ color: "#3a5070" }}>
            Language
          </label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger
              className="h-9 text-sm border-[rgba(6,182,212,0.15)] bg-[rgba(6,12,26,0.8)] text-[#c8d8e8]"
              data-testid="select-snippet-language"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map(lang => (
                <SelectItem key={lang.value} value={lang.value} className="text-sm">
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Description */}
        <div className="md:col-span-3 flex flex-col gap-1.5">
          <label className="text-[11px] font-medium" style={{ color: "#3a5070" }}>
            Description <span style={{ color: "#2a3a50" }}>(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What does this snippet do?"
            rows={2}
            data-testid="input-snippet-description"
            className="px-3 py-2 text-sm resize-none"
            style={fieldStyle}
            onFocus={e => (e.currentTarget.style.borderColor = "rgba(6,182,212,0.5)")}
            onBlur={e => (e.currentTarget.style.borderColor = "rgba(6,182,212,0.15)")}
          />
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 overflow-hidden" style={{ background: "#050a14" }}>
        <Editor
          height="100%"
          language={language}
          value={code}
          onChange={v => setCode(v ?? "")}
          theme="nexus-dark"
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
        />
      </div>
    </div>
  );
}
