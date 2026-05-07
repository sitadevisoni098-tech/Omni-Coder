import { Link, useLocation } from "wouter";
import { Code2, BookMarked, Plus, Moon, Sun, Zap } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="flex flex-col w-14 bg-sidebar border-r border-sidebar-border shrink-0">
        {/* Logo */}
        <div className="flex items-center justify-center h-14 border-b border-sidebar-border">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/20">
            <Zap className="w-4 h-4 text-primary" />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 p-2 flex-1">
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive = href === "/" ? location === "/" : location.startsWith(href);
            return (
              <Tooltip key={href} delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link href={href}>
                    <button
                      data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
                      className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-lg transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{label}</TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        {/* Theme toggle */}
        <div className="p-2 border-t border-sidebar-border">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                data-testid="button-toggle-theme"
                className="w-10 h-10 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{theme === "dark" ? "Light mode" : "Dark mode"}</TooltipContent>
          </Tooltip>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
