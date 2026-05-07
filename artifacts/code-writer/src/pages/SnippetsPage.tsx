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
import { Input } from "@/components/ui/input";
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
  Layers,
} from "lucide-react";

const LANG_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  javascript: { bg: "rgba(250,204,21,0.1)", text: "#fbbf24", border: "rgba(250,204,21,0.25)" },
  typescript: { bg: "rgba(59,130,246,0.1)", text: "#60a5fa", border: "rgba(59,130,246,0.25)" },
  python:     { bg: "rgba(34,197,94,0.1)",  text: "#4ade80", border: "rgba(34,197,94,0.25)" },
  rust:       { bg: "rgba(249,115,22,0.1)", text: "#fb923c", border: "rgba(249,115,22,0.25)" },
  go:         { bg: "rgba(6,182,212,0.1)",  text: "#22d3ee", border: "rgba(6,182,212,0.25)" },
  java:       { bg: "rgba(239,68,68,0.1)",  text: "#f87171", border: "rgba(239,68,68,0.25)" },
  cpp:        { bg: "rgba(139,92,246,0.1)", text: "#a78bfa", border: "rgba(139,92,246,0.25)" },
  html:       { bg: "rgba(249,115,22,0.1)", text: "#fb923c", border: "rgba(249,115,22,0.25)" },
  css:        { bg: "rgba(236,72,153,0.1)", text: "#f472b6", border: "rgba(236,72,153,0.25)" },
  sql:        { bg: "rgba(99,102,241,0.1)", text: "#818cf8", border: "rgba(99,102,241,0.25)" },
};

function LangBadge({ language }: { language: string }) {
  const c = LANG_COLORS[language] ?? { bg: "rgba(6,182,212,0.08)", text: "#06b6d4", border: "rgba(6,182,212,0.2)" };
  return (
    <span
      className="text-[10px] px-2 py-0.5 rounded-full font-mono"
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
    >
      {language}
    </span>
  );
}

const PANEL_BORDER = "1px solid rgba(6,182,212,0.1)";

export default function SnippetsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [langFilter, setLangFilter] = useState("all");
  const [favsOnly, setFavsOnly] = useState(false);

  const { data: snippets = [], isLoading } = useListSnippets();
  const { data: stats } = useGetSnippetStats();
  const deleteSnippet = useDeleteSnippet();
  const updateSnippet = useUpdateSnippet();

  const languages = Array.from(new Set(snippets.map(s => s.language)));

  const filtered = snippets.filter(s => {
    const q = search.toLowerCase();
    return (
      (s.title.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || (s.description ?? "").toLowerCase().includes(q)) &&
      (langFilter === "all" || s.language === langFilter) &&
      (!favsOnly || s.isFavorited)
    );
  });

  const handleDelete = async (id: number) => {
    await deleteSnippet.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListSnippetsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetSnippetStatsQueryKey() });
    toast({ title: "Snippet deleted" });
  };

  const handleFav = async (id: number, cur: boolean) => {
    await updateSnippet.mutateAsync({ id, data: { isFavorited: !cur } });
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
      <div
        className="px-6 py-4 shrink-0"
        style={{ background: "rgba(4,9,20,0.9)", borderBottom: PANEL_BORDER }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div
              className="flex items-center justify-center w-8 h-8 rounded-xl"
              style={{
                background: "linear-gradient(135deg, rgba(6,182,212,0.2), rgba(59,130,246,0.15))",
                border: "1px solid rgba(6,182,212,0.35)",
                boxShadow: "0 0 16px rgba(6,182,212,0.2)",
              }}
            >
              <BookMarked className="w-4 h-4" style={{ color: "#06b6d4" }} />
            </div>
            <div>
              <h1 className="text-base font-bold" style={{ color: "#e0eaf5", fontFamily: "var(--app-font-sans)" }}>
                Snippet Library
              </h1>
              {stats && (
                <p className="text-[11px]" style={{ color: "#3a5070" }}>
                  {stats.total} snippets · {stats.favorites} favorited
                </p>
              )}
            </div>
          </div>

          <Link href="/new-snippet">
            <button
              className="nexus-btn flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl text-white"
              data-testid="button-new-snippet"
            >
              <Plus className="w-3.5 h-3.5" />
              New Snippet
            </button>
          </Link>
        </div>

        {/* Stats row */}
        {stats && stats.byLanguage.length > 0 && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {stats.byLanguage.slice(0, 5).map(l => (
              <div
                key={l.language}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px]"
                style={{
                  background: "rgba(6,182,212,0.06)",
                  border: "1px solid rgba(6,182,212,0.12)",
                }}
              >
                <Layers className="w-3 h-3" style={{ color: "#06b6d4" }} />
                <span style={{ color: "#a8b8d0" }}>{l.language}</span>
                <span
                  className="px-1.5 py-0 rounded-full text-[9px] font-bold"
                  style={{ background: "rgba(6,182,212,0.15)", color: "#06b6d4" }}
                >
                  {l.count}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#2a4060" }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search snippets..."
              data-testid="input-search-snippets"
              className="w-full h-8 pl-8 pr-3 rounded-lg text-xs outline-none transition-all"
              style={{
                background: "rgba(6,12,26,0.8)",
                border: "1px solid rgba(6,182,212,0.15)",
                color: "#c8d8e8",
                fontFamily: "var(--app-font-sans)",
              }}
              onFocus={e => (e.currentTarget.style.borderColor = "rgba(6,182,212,0.45)")}
              onBlur={e => (e.currentTarget.style.borderColor = "rgba(6,182,212,0.15)")}
            />
          </div>

          <Select value={langFilter} onValueChange={setLangFilter}>
            <SelectTrigger
              className="w-36 h-8 text-xs border-[rgba(6,182,212,0.15)] bg-[rgba(6,12,26,0.8)] text-[#a8b8d0]"
              data-testid="select-language-filter"
            >
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All languages</SelectItem>
              {languages.map(l => <SelectItem key={l} value={l} className="text-xs">{l}</SelectItem>)}
            </SelectContent>
          </Select>

          <button
            onClick={() => setFavsOnly(p => !p)}
            data-testid="button-filter-favorites"
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs transition-all"
            style={
              favsOnly
                ? { background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.4)", color: "#fbbf24" }
                : { background: "rgba(6,12,26,0.8)", border: "1px solid rgba(6,182,212,0.15)", color: "#a8b8d0" }
            }
          >
            <Star className="w-3.5 h-3.5" fill={favsOnly ? "currentColor" : "none"} />
            Favorites
          </button>
        </div>
      </div>

      {/* Grid */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-44 rounded-2xl animate-pulse"
                  style={{ background: "rgba(6,182,212,0.04)", border: "1px solid rgba(6,182,212,0.08)" }}
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center gap-3">
              <div
                className="flex items-center justify-center w-16 h-16 rounded-2xl"
                style={{
                  background: "rgba(6,182,212,0.06)",
                  border: "1px solid rgba(6,182,212,0.15)",
                }}
              >
                <Code2 className="w-7 h-7" style={{ color: "rgba(6,182,212,0.4)" }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "#e0eaf5" }}>No snippets found</p>
                <p className="text-xs mt-1" style={{ color: "#3a5070" }}>
                  {search || langFilter !== "all" || favsOnly
                    ? "Try adjusting your filters"
                    : "Save code from the editor or create a new snippet"}
                </p>
              </div>
              <Link href="/new-snippet">
                <button
                  className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl transition-all mt-1"
                  style={{
                    background: "rgba(6,182,212,0.08)",
                    border: "1px solid rgba(6,182,212,0.25)",
                    color: "#06b6d4",
                  }}
                >
                  <Plus className="w-3.5 h-3.5" /> Create snippet
                </button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(snippet => (
                <div
                  key={snippet.id}
                  data-testid={`card-snippet-${snippet.id}`}
                  className="group flex flex-col rounded-2xl overflow-hidden transition-all duration-200"
                  style={{
                    background: "rgba(4,10,22,0.8)",
                    border: "1px solid rgba(6,182,212,0.1)",
                    backdropFilter: "blur(8px)",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(6,182,212,0.35)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 20px rgba(6,182,212,0.1), 0 4px 24px rgba(0,0,0,0.3)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(6,182,212,0.1)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                  }}
                >
                  {/* Thin top accent line */}
                  <div
                    className="h-px w-full"
                    style={{ background: "linear-gradient(90deg, transparent, rgba(6,182,212,0.5), transparent)" }}
                  />

                  {/* Card head */}
                  <div className="flex items-start justify-between gap-2 px-4 pt-3 pb-2">
                    <div className="flex-1 min-w-0">
                      <h3
                        className="text-sm font-semibold truncate"
                        style={{ color: "#e0eaf5" }}
                        data-testid={`text-snippet-title-${snippet.id}`}
                      >
                        {snippet.title}
                      </h3>
                      {snippet.description && (
                        <p className="text-xs mt-0.5 line-clamp-1" style={{ color: "#3a5070" }}>
                          {snippet.description}
                        </p>
                      )}
                    </div>
                    <LangBadge language={snippet.language} />
                  </div>

                  {/* Code preview */}
                  <div
                    className="mx-4 mb-3 rounded-xl overflow-hidden"
                    style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(6,182,212,0.08)" }}
                  >
                    <pre
                      className="p-3 text-[11px] leading-relaxed overflow-hidden max-h-20 font-mono"
                      style={{ color: "#4a7090" }}
                    >
                      {snippet.code.slice(0, 180)}{snippet.code.length > 180 ? "…" : ""}
                    </pre>
                  </div>

                  {/* Footer */}
                  <div
                    className="flex items-center gap-1 px-4 pb-3 mt-auto"
                    style={{ borderTop: "1px solid rgba(6,182,212,0.06)", paddingTop: "8px" }}
                  >
                    <span className="text-[10px] flex-1" style={{ color: "#2a4060" }}>
                      {new Date(snippet.updatedAt).toLocaleDateString()}
                    </span>

                    {[
                      {
                        icon: Star,
                        onClick: () => handleFav(snippet.id, snippet.isFavorited),
                        testId: `button-favorite-${snippet.id}`,
                        active: snippet.isFavorited,
                        activeColor: "#fbbf24",
                      },
                      {
                        icon: Copy,
                        onClick: () => handleCopy(snippet.code),
                        testId: `button-copy-${snippet.id}`,
                        active: false,
                        activeColor: "#06b6d4",
                      },
                    ].map(({ icon: Icon, onClick, testId, active, activeColor }) => (
                      <button
                        key={testId}
                        onClick={onClick}
                        data-testid={testId}
                        className="p-1.5 rounded-lg transition-all"
                        style={{ color: active ? activeColor : "#2a4060" }}
                        onMouseEnter={e => (e.currentTarget.style.color = activeColor)}
                        onMouseLeave={e => (e.currentTarget.style.color = active ? activeColor : "#2a4060")}
                      >
                        <Icon className="w-3.5 h-3.5" fill={active && Icon === Star ? "currentColor" : "none"} />
                      </button>
                    ))}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          data-testid={`button-more-${snippet.id}`}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: "#2a4060" }}
                          onMouseEnter={e => (e.currentTarget.style.color = "#06b6d4")}
                          onMouseLeave={e => (e.currentTarget.style.color = "#2a4060")}
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <Link href={`/edit-snippet/${snippet.id}`}>
                          <DropdownMenuItem className="text-xs gap-2 cursor-pointer">
                            <Edit className="w-3 h-3" /> Edit
                          </DropdownMenuItem>
                        </Link>
                        <DropdownMenuItem
                          className="text-xs gap-2 text-destructive focus:text-destructive cursor-pointer"
                          onClick={() => handleDelete(snippet.id)}
                        >
                          <Trash2 className="w-3 h-3" /> Delete
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
