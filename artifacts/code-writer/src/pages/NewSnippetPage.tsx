import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import Editor from "@monaco-editor/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateSnippet, useUpdateSnippet, useGetSnippet,
  getListSnippetsQueryKey, getGetSnippetQueryKey, getGetSnippetStatsQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
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

  const { data: existing } = useGetSnippet(snippetId!, { query: { enabled: isEditing, queryKey: getGetSnippetQueryKey(snippetId!) } });
  useEffect(() => {
    if (existing) { setTitle(existing.title); setCode(existing.code); setLanguage(existing.language); setDescription(existing.description ?? ""); }
  }, [existing]);

  const createSnippet = useCreateSnippet();
  const updateSnippet = useUpdateSnippet();
  const isSaving = createSnippet.isPending || updateSnippet.isPending;

  const handleSave = async () => {
    if (!title.trim()) { toast({ title: "Title required", variant: "destructive" }); return; }
    if (isEditing && snippetId) {
      await updateSnippet.mutateAsync({ id: snippetId, data: { title, code, language, description: description || null } });
      queryClient.invalidateQueries({ queryKey: getGetSnippetQueryKey(snippetId) });
    } else {
      await createSnippet.mutateAsync({ data: { title, code, language, description: description || null } });
    }
    queryClient.invalidateQueries({ queryKey: getListSnippetsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetSnippetStatsQueryKey() });
    toast({ title: isEditing ? "Snippet updated!" : "Snippet saved!" });
    setLocation("/snippets");
  };

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ background: "rgba(4,0,12,0.8)", backdropFilter: "blur(20px)" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-6 py-3.5 shrink-0"
        style={{ background: "rgba(4,0,12,0.92)", borderBottom: "1px solid rgba(124,58,237,0.15)", minHeight: "58px" }}
      >
        <button
          onClick={() => setLocation("/snippets")}
          data-testid="button-back"
          className="flex items-center justify-center w-9 h-9 rounded-xl transition-all"
          style={{ color: "#4a3a6a", border: "1px solid rgba(124,58,237,0.18)" }}
          onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.color = "#a78bfa"; b.style.borderColor = "rgba(124,58,237,0.45)"; b.style.background = "rgba(124,58,237,0.1)"; }}
          onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.color = "#4a3a6a"; b.style.borderColor = "rgba(124,58,237,0.18)"; b.style.background = "transparent"; }}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-xl"
            style={{
              background: "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(59,130,246,0.2))",
              border: "1px solid rgba(124,58,237,0.45)",
              boxShadow: "0 0 18px rgba(124,58,237,0.3)",
            }}
          >
            {isEditing ? <Save className="w-4 h-4" style={{ color: "#a78bfa" }} /> : <FilePlus className="w-4 h-4" style={{ color: "#a78bfa" }} />}
          </div>
          <div>
            <h1
              className="text-base font-black gradient-text-purple"
              style={{ letterSpacing: "-0.02em" }}
            >
              {isEditing ? "Edit Snippet" : "New Snippet"}
            </h1>
            <p className="text-[10px]" style={{ color: "#3a2a5a" }}>
              {isEditing ? "Update your saved snippet" : "Create and save a code snippet"}
            </p>
          </div>
        </div>

        <div className="flex-1" />

        <button
          onClick={handleSave}
          disabled={isSaving}
          data-testid="button-save-snippet"
          className="btn-nexus flex items-center gap-2 text-sm px-5 py-2.5 rounded-xl"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : isEditing ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {isEditing ? "Update Snippet" : "Save Snippet"}
        </button>
      </div>

      {/* Metadata */}
      <div
        className="grid grid-cols-1 md:grid-cols-3 gap-4 px-6 py-4 shrink-0"
        style={{ background: "rgba(4,0,12,0.6)", borderBottom: "1px solid rgba(124,58,237,0.12)" }}
      >
        <div className="md:col-span-2 flex flex-col gap-2">
          <label className="text-xs font-semibold" style={{ color: "#4a3a6a", letterSpacing: "0.04em" }}>
            TITLE
          </label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Give your snippet a memorable name..."
            data-testid="input-snippet-title"
            className="h-10 px-4 text-sm rounded-xl glow-input"
            style={{ borderRadius: "0.75rem" }}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold" style={{ color: "#4a3a6a", letterSpacing: "0.04em" }}>
            LANGUAGE
          </label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger
              className="h-10 text-sm rounded-xl"
              style={{ background: "rgba(8,2,20,0.8)", border: "1px solid rgba(124,58,237,0.22)", color: "#c0b0e0", borderRadius: "0.75rem" }}
              data-testid="select-snippet-language"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map(l => <SelectItem key={l.value} value={l.value} className="text-sm">{l.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-3 flex flex-col gap-2">
          <label className="text-xs font-semibold" style={{ color: "#4a3a6a", letterSpacing: "0.04em" }}>
            DESCRIPTION <span style={{ color: "#2a1a40", fontWeight: 400 }}>(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe what this snippet does..."
            rows={2}
            data-testid="input-snippet-description"
            className="px-4 py-2.5 text-sm resize-none rounded-xl glow-input"
            style={{ borderRadius: "0.75rem" }}
          />
        </div>
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
                "editorGutter.background": "#04000e",
              },
            });
          }}
          onMount={(_, monaco) => { monaco.editor.setTheme("nexus"); }}
        />
      </div>
    </div>
  );
}
