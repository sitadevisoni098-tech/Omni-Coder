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
import { useTheme } from "@/components/ThemeProvider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, Loader2, Plus } from "lucide-react";

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
  const { theme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [code, setCode] = useState("// Write your code here...\n");
  const [language, setLanguage] = useState("javascript");
  const [description, setDescription] = useState("");

  const { data: existingSnippet } = useGetSnippet(
    snippetId!,
    { query: { enabled: isEditing, queryKey: getGetSnippetQueryKey(snippetId!) } }
  );

  useEffect(() => {
    if (existingSnippet) {
      setTitle(existingSnippet.title);
      setCode(existingSnippet.code);
      setLanguage(existingSnippet.language);
      setDescription(existingSnippet.description ?? "");
    }
  }, [existingSnippet]);

  const createSnippet = useCreateSnippet();
  const updateSnippet = useUpdateSnippet();

  const isSaving = createSnippet.isPending || updateSnippet.isPending;

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: "Title required", description: "Please enter a title for your snippet.", variant: "destructive" });
      return;
    }

    if (isEditing && snippetId) {
      await updateSnippet.mutateAsync({
        id: snippetId,
        data: { title, code, language, description: description || null },
      });
      queryClient.invalidateQueries({ queryKey: getGetSnippetQueryKey(snippetId) });
    } else {
      await createSnippet.mutateAsync({
        data: { title, code, language, description: description || null },
      });
    }

    queryClient.invalidateQueries({ queryKey: getListSnippetsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetSnippetStatsQueryKey() });
    toast({ title: isEditing ? "Snippet updated" : "Snippet saved" });
    setLocation("/snippets");
  };

  const monacoTheme = theme === "dark" ? "vs-dark" : "vs";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-card shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setLocation("/snippets")}
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <Save className="w-5 h-5 text-primary" />
          ) : (
            <Plus className="w-5 h-5 text-primary" />
          )}
          <h1 className="text-lg font-semibold">{isEditing ? "Edit Snippet" : "New Snippet"}</h1>
        </div>

        <div className="flex-1" />

        <Button
          onClick={handleSave}
          disabled={isSaving}
          size="sm"
          className="gap-1.5"
          data-testid="button-save-snippet"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isEditing ? "Update" : "Save Snippet"}
        </Button>
      </div>

      <div className="flex flex-col gap-0 flex-1 overflow-hidden">
        {/* Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-6 py-4 border-b border-border bg-card/50 shrink-0">
          <div className="md:col-span-2 space-y-1.5">
            <Label htmlFor="snippet-title" className="text-xs text-muted-foreground">Title</Label>
            <Input
              id="snippet-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Snippet title..."
              className="h-8 text-sm"
              data-testid="input-snippet-title"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="h-8 text-sm" data-testid="select-snippet-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value} className="text-sm">
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-3 space-y-1.5">
            <Label htmlFor="snippet-description" className="text-xs text-muted-foreground">Description (optional)</Label>
            <Textarea
              id="snippet-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what this snippet does..."
              rows={2}
              className="text-sm resize-none"
              data-testid="input-snippet-description"
            />
          </div>
        </div>

        {/* Editor */}
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
    </div>
  );
}
