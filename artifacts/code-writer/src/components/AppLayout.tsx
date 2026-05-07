import { Link, useLocation } from "wouter";
import { Code2, BookMarked, Plus, Moon, Sun, Zap, Cpu } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const navItems = [
  { href: "/", icon: Code2, label: "Editor" },
  { href: "/snippets", icon: BookMarked, label: "Snippets" },
  { href: "/new-snippet", icon: Plus, label: "New Snippet" },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: "hsl(218 40% 4%)" }}>
      {/* Sidebar */}
      <aside
        className="flex flex-col w-14 shrink-0 relative"
        style={{
          background: "hsl(218 45% 3%)",
          borderRight: "1px solid rgba(6,182,212,0.1)",
        }}
      >
        {/* Subtle gradient line on right edge */}
        <div
          className="absolute right-0 top-0 bottom-0 w-px"
          style={{ background: "linear-gradient(to bottom, transparent, rgba(6,182,212,0.3), transparent)" }}
        />

        {/* Logo */}
        <div
          className="flex items-center justify-center h-14 shrink-0"
          style={{ borderBottom: "1px solid rgba(6,182,212,0.08)" }}
        >
          <div
            className="flex items-center justify-center w-9 h-9 rounded-xl pulse-ring"
            style={{
              background: "linear-gradient(135deg, rgba(6,182,212,0.2), rgba(59,130,246,0.15))",
              border: "1px solid rgba(6,182,212,0.5)",
              boxShadow: "0 0 16px rgba(6,182,212,0.3)",
            }}
          >
            <Cpu className="w-4 h-4" style={{ color: "#06b6d4" }} />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-2 p-2 flex-1">
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive = href === "/" ? location === "/" : location.startsWith(href);
            return (
              <Tooltip key={href} delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link href={href}>
                    <button
                      data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
                      className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200",
                        isActive
                          ? "nav-active"
                          : "text-[#4a6080] hover:text-[#06b6d4]"
                      )}
                      style={!isActive ? {
                        border: "1px solid transparent",
                      } : undefined}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          (e.currentTarget as HTMLButtonElement).style.background = "rgba(6,182,212,0.08)";
                          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(6,182,212,0.2)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          (e.currentTarget as HTMLButtonElement).style.background = "";
                          (e.currentTarget as HTMLButtonElement).style.borderColor = "transparent";
                        }
                      }}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  {label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        {/* Theme toggle */}
        <div className="p-2 shrink-0" style={{ borderTop: "1px solid rgba(6,182,212,0.08)" }}>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={toggleTheme}
                data-testid="button-toggle-theme"
                className="flex items-center justify-center w-10 h-10 rounded-xl text-[#4a6080] hover:text-[#06b6d4] transition-colors"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </TooltipContent>
          </Tooltip>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden grid-bg">
        {children}
      </main>
    </div>
  );
}
