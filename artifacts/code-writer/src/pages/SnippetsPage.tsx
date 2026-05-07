import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListSnippets,
  useDeleteSnippet,
  useUpdateSnippet,
  useGetSnippetStats,
  getListSnippetsQueryKey,
  getGetSnippetStatsQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  Star,
  Trash2,
  MoreHorizontal,
  Edit,
  Copy,
  Code2,
  BookMarked,
} from "lucide-react";
import { cn } from "@/lib/utils";

function LanguageTag({ language }: { language: string }) {
  const colors: Record<string, string> = {
    javascript: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    typescript: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    python: "bg-green-500/15 text-green-400 border-green-500/30",
    rust: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    go: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
    java: "bg-red-500/15 text-red-400 border-red-500/30",
    cpp: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    html: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    css: "bg-pink-500/15 text-pink-400 border-pink-500/30",
    sql: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
    bash: "bg-gray-500/15 text-gray-400 border-gray-500/30",
  };

  return (
    <span
      className={cn(
        "text-[10px] px-2 py-0.5 rounded-full border font-mono",
        colors[language] ?? "bg-muted text-muted-foreground border-border"
      )}
    >
      {language}
    </span>
  );
}

export default function SnippetsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const { data: snippets = [], isLoading } = useListSnippets();
  const { data: stats } = useGetSnippetStats();
  const deleteSnippet = useDeleteSnippet();
  const updateSnippet = useUpdateSnippet();

  const filtered = snippets.filter((s) => {
    const matchesSearch =
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      (s.description ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesLang = languageFilter === "all" || s.language === languageFilter;
    const matchesFav = !favoritesOnly || s.isFavorited;
    return matchesSearch && matchesLang && matchesFav;
  });

  const languages = Array.from(new Set(snippets.map((s) => s.language)));

  const handleDelete = async (id: number) => {
    await deleteSnippet.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListSnippetsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetSnippetStatsQueryKey() });
    toast({ title: "Snippet deleted" });
  };

  const handleToggleFavorite = async (id: number, isFavorited: boolean) => {
    await updateSnippet.mutateAsync({ id, data: { isFavorited: !isFavorited } });
    queryClient.invalidateQueries({ queryKey: getListSnippetsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetSnippetStatsQueryKey() });
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied to clipboard" });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-card shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold">Snippet Library</h1>
          </div>
          <Link href="/new-snippet">
            <Button size="sm" className="gap-1.5" data-testid="button-new-snippet">
              <Plus className="w-4 h-4" />
              New Snippet
            </Button>
          </Link>
        </div>

        {/* Stats */}
        {stats && (
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Code2 className="w-4 h-4" />
              <span data-testid="text-total-snippets">{stats.total} snippets</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Star className="w-4 h-4" />
              <span data-testid="text-favorites-count">{stats.favorites} favorited</span>
            </div>
            {stats.byLanguage.slice(0, 3).map((l) => (
              <LanguageTag key={l.language} language={l.language} />
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search snippets..."
              className="pl-8 h-8 text-sm"
              data-testid="input-search-snippets"
            />
          </div>

          <Select value={languageFilter} onValueChange={setLanguageFilter}>
            <SelectTrigger className="w-36 h-8 text-xs" data-testid="select-language-filter">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All languages</SelectItem>
              {languages.map((lang) => (
                <SelectItem key={lang} value={lang} className="text-xs">{lang}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant={favoritesOnly ? "default" : "outline"}
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => setFavoritesOnly((p) => !p)}
            data-testid="button-filter-favorites"
          >
            <Star className="w-3.5 h-3.5" />
            Favorites
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-40 rounded-xl bg-card border border-border animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <BookMarked className="w-10 h-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No snippets found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {search || languageFilter !== "all" || favoritesOnly
                  ? "Try adjusting your filters"
                  : "Save code from the editor or create a new snippet"}
              </p>
              <Link href="/new-snippet">
                <Button size="sm" className="mt-4 gap-1.5" variant="outline">
                  <Plus className="w-3.5 h-3.5" />
                  Create snippet
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((snippet) => (
                <div
                  key={snippet.id}
                  data-testid={`card-snippet-${snippet.id}`}
                  className="group relative flex flex-col bg-card border border-border rounded-xl hover:border-primary/40 transition-all hover:shadow-md overflow-hidden"
                >
                  {/* Card header */}
                  <div className="flex items-start justify-between gap-2 p-4 pb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-foreground truncate" data-testid={`text-snippet-title-${snippet.id}`}>
                        {snippet.title}
                      </h3>
                      {snippet.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {snippet.description}
                        </p>
                      )}
                    </div>
                    <LanguageTag language={snippet.language} />
                  </div>

                  {/* Code preview */}
                  <div className="mx-4 mb-3 rounded-lg bg-background border border-border overflow-hidden">
                    <pre className="p-3 text-xs font-mono text-foreground/80 leading-relaxed overflow-hidden max-h-24 whitespace-pre-wrap break-all">
                      {snippet.code.slice(0, 200)}{snippet.code.length > 200 ? "..." : ""}
                    </pre>
                  </div>

                  {/* Card footer */}
                  <div className="flex items-center gap-1.5 px-4 pb-3 mt-auto">
                    <span className="text-[10px] text-muted-foreground flex-1">
                      {new Date(snippet.updatedAt).toLocaleDateString()}
                    </span>

                    <button
                      onClick={() => handleToggleFavorite(snippet.id, snippet.isFavorited)}
                      data-testid={`button-favorite-${snippet.id}`}
                      className={cn(
                        "p-1 rounded transition-colors",
                        snippet.isFavorited
                          ? "text-yellow-400"
                          : "text-muted-foreground hover:text-yellow-400"
                      )}
                    >
                      <Star className="w-3.5 h-3.5" fill={snippet.isFavorited ? "currentColor" : "none"} />
                    </button>

                    <button
                      onClick={() => handleCopy(snippet.code)}
                      data-testid={`button-copy-${snippet.id}`}
                      className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          data-testid={`button-more-${snippet.id}`}
                          className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <Link href={`/edit-snippet/${snippet.id}`}>
                          <DropdownMenuItem className="text-xs gap-2 cursor-pointer">
                            <Edit className="w-3 h-3" />
                            Edit
                          </DropdownMenuItem>
                        </Link>
                        <DropdownMenuItem
                          className="text-xs gap-2 text-destructive focus:text-destructive cursor-pointer"
                          onClick={() => handleDelete(snippet.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
