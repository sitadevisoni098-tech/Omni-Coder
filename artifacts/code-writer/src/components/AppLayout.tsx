import { Link, useLocation } from "wouter";
import { Code2, BookMarked, Plus, Cpu, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const navItems = [
  { href: "/", icon: Code2, label: "Editor" },
  { href: "/snippets", icon: BookMarked, label: "Snippets" },
  { href: "/new-snippet", icon: Plus, label: "New Snippet" },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="relative flex flex-col w-screen h-screen overflow-hidden">
      {/* ── Animated background ── */}
      <div className="nexus-bg">
        <div className="orb-3" />
      </div>
      <div className="nexus-grid" />

      {/* ── Top Navbar ── */}
      <header
        className="relative z-20 flex items-center gap-4 px-5 shrink-0"
        style={{
          height: "54px",
          background: "rgba(6,0,16,0.85)",
          backdropFilter: "blur(24px)",
          borderBottom: "1px solid rgba(124,58,237,0.2)",
          boxShadow: "0 1px 0 rgba(124,58,237,0.1), 0 8px 32px rgba(0,0,0,0.4)",
        }}
      >
        {/* Logo */}
        <Link href="/">
          <div className="flex items-center gap-2.5 cursor-pointer select-none">
            <div
              className="flex items-center justify-center w-8 h-8 rounded-lg"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #3b82f6)",
                boxShadow: "0 0 16px rgba(124,58,237,0.6), 0 0 32px rgba(124,58,237,0.2)",
              }}
            >
              <Cpu className="w-4 h-4 text-white" />
            </div>
            <div className="flex items-baseline gap-1">
              <span
                className="text-base font-black tracking-tight gradient-text-purple"
                style={{ fontFamily: "'Inter', sans-serif", letterSpacing: "-0.02em" }}
              >
                PowerCode
              </span>
              <span
                className="text-base font-black tracking-tight"
                style={{
                  background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  letterSpacing: "-0.02em",
                }}
              >
                AI
              </span>
            </div>
          </div>
        </Link>

        {/* Divider */}
        <div className="w-px h-6" style={{ background: "rgba(124,58,237,0.25)" }} />

        {/* Nav items */}
        <nav className="flex items-center gap-1">
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive = href === "/" ? location === "/" : location.startsWith(href);
            return (
              <Link key={href} href={href}>
                <button
                  data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive ? "nav-item-active" : "text-[#6a5a9a] hover:text-[#a78bfa]"
                  )}
                  style={!isActive ? { border: "1px solid transparent" } : undefined}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              </Link>
            );
          })}
        </nav>

        <div className="flex-1" />

        {/* Right badge */}
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
          style={{
            background: "rgba(124,58,237,0.1)",
            border: "1px solid rgba(124,58,237,0.25)",
          }}
        >
          <Sparkles className="w-3 h-3" style={{ color: "#a78bfa" }} />
          <span className="text-xs font-semibold" style={{ color: "#a78bfa" }}>
            AI Powered
          </span>
        </div>
      </header>

      {/* ── Page content ── */}
      <main className="relative z-10 flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
