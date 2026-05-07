import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListSnippets, useDeleteSnippet, useUpdateSnippet, useGetSnippetStats,
  getListSnippetsQueryKey, getGetSnippetStatsQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus, Search, Star, Trash2, MoreHorizontal, Edit, Copy, Code2, Layers, BookMarked,
} from "lucide-react";

const LANG_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  javascript: { bg: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "rgba(251,191,36,0.3)" },
  typescript: { bg: "rgba(96,165,250,0.12)", color: "#60a5fa", border: "rgba(96,165,250,0.3)" },
  python:     { bg: "rgba(52,211,153,0.12)", color: "#34d399", border: "rgba(52,211,153,0.3)" },
  rust:       { bg: "rgba(251,146,60,0.12)", color: "#fb923c", border: "rgba(251,146,60,0.3)" },
  go:         { bg: "rgba(34,211,238,0.12)", color: "#22d3ee", border: "rgba(34,211,238,0.3)" },
  java:       { bg: "rgba(248,113,113,0.12)", color: "#f87171", border: "rgba(248,113,113,0.3)" },
  cpp:        { bg: "rgba(167,139,250,0.12)", color: "#a78bfa", border: "rgba(167,139,250,0.3)" },
  html:       { bg: "rgba(251,146,60,0.12)", color: "#fb923c", border: "rgba(251,146,60,0.3)" },
  css:        { bg: "rgba(244,114,182,0.12)", color: "#f472b6", border: "rgba(244,114,182,0.3)" },
  sql:        { bg: "rgba(129,140,248,0.12)", color: "#818cf8", border: "rgba(129,140,248,0.3)" },
};

function LangBadge({ language }: { language: string }) {
  const c = LANG_COLORS[language] ?? { bg: "rgba(124,58,237,0.12)", color: "#a78bfa", border: "rgba(124,58,237,0.3)" };
  return (
    <span
      className="text-[10px] px-2 py-0.5 rounded-full font-mono"
      style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}
    >
      {language}
    </span>
  );
}

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
  const handleCopy = (code: string) => { navigator.clipboard.writeText(code); toast({ title: "Copied!" }); };

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "rgba(4,0,12,0.75)", backdropFilter: "blur(20px)" }}>
      {/* Header */}
      <div
        className="px-6 py-5 shrink-0"
        style={{ background: "rgba(4,0,12,0.9)", borderBottom: "1px solid rgba(124,58,237,0.15)" }}
      >
        {/* Title row */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-10 h-10 rounded-2xl shrink-0"
              style={{
                background: "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(6,182,212,0.15))",
                border: "1px solid rgba(124,58,237,0.4)",
                boxShadow: "0 0 20px rgba(124,58,237,0.25)",
              }}
            >
              <BookMarked className="w-5 h-5" style={{ color: "#a78bfa" }} />
            </div>
            <div>
              <h1
                className="text-xl font-black gradient-text-purple"
                style={{ letterSpacing: "-0.02em" }}
              >
                Snippet Library
              </h1>
              <p className="text-xs mt-0.5" style={{ color: "#4a3a6a" }}>
                Your saved code collection
              </p>
            </div>
          </div>

          <Link href="/new-snippet">
            <button
              className="btn-nexus flex items-center gap-2 text-sm px-5 py-2.5 rounded-xl"
              data-testid="button-new-snippet"
            >
              <Plus className="w-4 h-4" />
              New Snippet
            </button>
          </Link>
        </div>

        {/* Stats row */}
        {stats && (
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            {[
              { icon: Code2, label: "Total", value: stats.total },
              { icon: Star, label: "Favorited", value: stats.favorites },
            ].map(s => (
              <div
                key={s.label}
                className="flex items-center gap-2 px-4 py-2 rounded-xl"
                style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)" }}
              >
                <s.icon className="w-3.5 h-3.5" style={{ color: "#7c3aed" }} />
                <span className="text-xs" style={{ color: "#6a5a9a" }}>{s.label}</span>
                <span
                  className="text-sm font-bold"
                  style={{ color: "#a78bfa" }}
                  data-testid={`text-${s.label.toLowerCase()}-snippets`}
                >
                  {s.value}
                </span>
              </div>
            ))}
            {stats.byLanguage.slice(0, 4).map(l => (
              <div
                key={l.language}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
                style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.1)" }}
              >
                <Layers className="w-3 h-3" style={{ color: "#5a3a8a" }} />
                <span className="text-xs" style={{ color: "#6a5a9a" }}>{l.language}</span>
                <span
                  className="text-[10px] font-bold px-1.5 rounded-full"
                  style={{ background: "rgba(124,58,237,0.2)", color: "#a78bfa" }}
                >
                  {l.count}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Filter row */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#3a2a5a" }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search snippets..."
              data-testid="input-search-snippets"
              className="h-9 pl-9 pr-4 rounded-xl text-xs w-56 glow-input"
              style={{ borderRadius: "0.75rem" }}
            />
          </div>

          <Select value={langFilter} onValueChange={setLangFilter}>
            <SelectTrigger
              className="w-40 h-9 text-xs"
              style={{ background: "rgba(8,2,20,0.8)", border: "1px solid rgba(124,58,237,0.22)", color: "#9080c0", borderRadius: "0.75rem" }}
              data-testid="select-language-filter"
            >
              <SelectValue placeholder="All languages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All languages</SelectItem>
              {languages.map(l => <SelectItem key={l} value={l} className="text-xs">{l}</SelectItem>)}
            </SelectContent>
          </Select>

          <button
            onClick={() => setFavsOnly(p => !p)}
            data-testid="button-filter-favorites"
            className="flex items-center gap-2 h-9 px-4 rounded-xl text-xs font-medium transition-all"
            style={
              favsOnly
                ? { background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.4)", color: "#fbbf24" }
                : { background: "rgba(8,2,20,0.8)", border: "1px solid rgba(124,58,237,0.22)", color: "#6a5a9a" }
            }
          >
            <Star className="w-3.5 h-3.5" fill={favsOnly ? "currentColor" : "none"} />
            Favorites only
          </button>
        </div>
      </div>

      {/* Grid */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-48 rounded-2xl animate-pulse"
                  style={{ background: "rgba(124,58,237,0.05)", border: "1px solid rgba(124,58,237,0.08)" }}
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-72 text-center gap-4">
              <div
                className="flex items-center justify-center w-20 h-20 rounded-3xl"
                style={{
                  background: "rgba(124,58,237,0.08)",
                  border: "1px solid rgba(124,58,237,0.18)",
                  boxShadow: "0 0 30px rgba(124,58,237,0.1)",
                }}
              >
                <Code2 className="w-9 h-9" style={{ color: "rgba(124,58,237,0.4)" }} />
              </div>
              <div>
                <p className="text-base font-bold" style={{ color: "#d4c8ff" }}>No snippets found</p>
                <p className="text-xs mt-2" style={{ color: "#3a2a5a" }}>
                  {search || langFilter !== "all" || favsOnly
                    ? "Try adjusting your filters"
                    : "Save code from the editor to build your library"}
                </p>
              </div>
              <Link href="/new-snippet">
                <button
                  className="flex items-center gap-2 text-xs px-4 py-2 rounded-xl transition-all mt-1"
                  style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.3)", color: "#a78bfa" }}
                >
                  <Plus className="w-3.5 h-3.5" /> Create your first snippet
                </button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
              {filtered.map(snippet => (
                <div
                  key={snippet.id}
                  data-testid={`card-snippet-${snippet.id}`}
                  className="snippet-card flex flex-col"
                >
                  {/* Top shimmer line */}
                  <div className="shimmer-line" style={{ opacity: 0.6 }} />

                  {/* Card head */}
                  <div className="flex items-start justify-between gap-2 px-4 pt-4 pb-2">
                    <div className="flex-1 min-w-0">
                      <h3
                        className="text-sm font-bold truncate"
                        style={{ color: "#d4c8ff" }}
                        data-testid={`text-snippet-title-${snippet.id}`}
                      >
                        {snippet.title}
                      </h3>
                      {snippet.description && (
                        <p className="text-[11px] mt-0.5 line-clamp-1" style={{ color: "#3a2a5a" }}>
                          {snippet.description}
                        </p>
                      )}
                    </div>
                    <LangBadge language={snippet.language} />
                  </div>

                  {/* Code preview */}
                  <div
                    className="mx-4 mb-3 rounded-xl overflow-hidden"
                    style={{ background: "rgba(0,0,0,0.45)", border: "1px solid rgba(124,58,237,0.1)" }}
                  >
                    <pre
                      className="p-3 text-[11px] leading-relaxed overflow-hidden max-h-[80px] font-mono"
                      style={{ color: "#3a2a5a", margin: 0 }}
                    >
                      {snippet.code.slice(0, 200)}{snippet.code.length > 200 ? "…" : ""}
                    </pre>
                  </div>

                  {/* Footer */}
                  <div
                    className="flex items-center gap-1 px-4 pb-3 pt-2 mt-auto"
                    style={{ borderTop: "1px solid rgba(124,58,237,0.08)" }}
                  >
                    <span className="text-[10px] flex-1" style={{ color: "#2a1a40" }}>
                      {new Date(snippet.updatedAt).toLocaleDateString()}
                    </span>

                    <button
                      onClick={() => handleFav(snippet.id, snippet.isFavorited)}
                      data-testid={`button-favorite-${snippet.id}`}
                      className="p-1.5 rounded-lg transition-all"
                      style={{ color: snippet.isFavorited ? "#fbbf24" : "#2a1a40" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#fbbf24")}
                      onMouseLeave={e => (e.currentTarget.style.color = snippet.isFavorited ? "#fbbf24" : "#2a1a40")}
                    >
                      <Star className="w-3.5 h-3.5" fill={snippet.isFavorited ? "currentColor" : "none"} />
                    </button>

                    <button
                      onClick={() => handleCopy(snippet.code)}
                      data-testid={`button-copy-${snippet.id}`}
                      className="p-1.5 rounded-lg transition-all"
                      style={{ color: "#2a1a40" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#a78bfa")}
                      onMouseLeave={e => (e.currentTarget.style.color = "#2a1a40")}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          data-testid={`button-more-${snippet.id}`}
                          className="p-1.5 rounded-lg transition-all"
                          style={{ color: "#2a1a40" }}
                          onMouseEnter={e => (e.currentTarget.style.color = "#a78bfa")}
                          onMouseLeave={e => (e.currentTarget.style.color = "#2a1a40")}
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
