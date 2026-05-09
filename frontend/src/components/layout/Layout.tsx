import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Activity, DollarSign, Award, GitCompare, FlaskConical,
  Sparkles, GitBranch, ShieldCheck, AlertTriangle, FileSearch, Eye,
  Network, Coins, Layers, Gauge, Bell, Search, Database, ScanSearch, BookCheck,
} from "lucide-react";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: any; badge?: string; badgeTone?: "primary" | "danger" | "warning" };
type Group = { label: string; items: Item[] };

const groups: Group[] = [
  {
    label: "HOME",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/live", label: "Live Monitor", icon: Activity },
    ],
  },
  {
    label: "MY AI AGENTS",
    items: [
      { href: "/agents", label: "Agent Roster", icon: Network },
    ],
  },
  {
    label: "INSIGHTS",
    items: [
      { href: "/financial", label: "Financial Impact", icon: DollarSign },
      { href: "/equations", label: "Five Equations", icon: Gauge },
      { href: "/benchmarks", label: "Benchmarks", icon: Award },
      { href: "/correlations", label: "Correlations", icon: GitCompare },
      { href: "/scenarios", label: "What-If Scenarios", icon: FlaskConical },
      { href: "/models", label: "Model Comparison", icon: Layers },
      { href: "/maturity", label: "AI Maturity", icon: Sparkles },
      { href: "/buildbuy", label: "Build vs Buy", icon: GitBranch },
    ],
  },
  {
    label: "ECONOMIC COGNITION",
    items: [
      { href: "/cognition", label: "Cognition Plane", icon: Coins, badge: "NEW", badgeTone: "primary" },
      { href: "/observation", label: "Observation Plane", icon: Eye },
      { href: "/ledger", label: "Predictive Ledger", icon: BookCheck },
      { href: "/coverage", label: "Coverage Manifest", icon: Database },
      { href: "/recommendations", label: "Recommendations", icon: ScanSearch },
    ],
  },
  {
    label: "GOVERNANCE",
    items: [
      { href: "/audit", label: "Audit Trail", icon: ShieldCheck, badge: "27%", badgeTone: "danger" },
      { href: "/risk", label: "Risk Analysis", icon: AlertTriangle },
      { href: "/unreviewed", label: "Unreviewed Decisions", icon: FileSearch },
      { href: "/compliance", label: "Rules & Compliance", icon: ShieldCheck },
    ],
  },
  {
    label: "PLANNING",
    items: [
      { href: "/board", label: "Board Report", icon: BookCheck },
    ],
  },
];

export function Layout({ children, title, kicker, headerRight }: { children: ReactNode; title: string; kicker?: string; headerRight?: ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="grid h-[100dvh] overflow-hidden" style={{ gridTemplateColumns: "260px 1fr", gridTemplateRows: "auto 1fr" }}>
      {/* Sidebar — full height */}
      <aside
        className="row-span-2 overflow-y-auto text-sm"
        style={{ background: "hsl(var(--sidebar))", color: "hsl(var(--sidebar-foreground))", borderRight: "1px solid hsl(var(--sidebar-border))", overscrollBehavior: "contain" }}
      >
        <div className="px-5 py-5 flex items-center gap-3">
          <Logo size={36} />
          <div className="leading-tight">
            <div className="font-semibold text-white">r-Potential</div>
            <div className="text-[11px] opacity-70">Powered by FuzeBox AEOS</div>
          </div>
        </div>

        <nav className="px-3 pb-8 space-y-5">
          {groups.map(g => (
            <div key={g.label}>
              <div className="px-3 mb-2 text-[10px] font-semibold tracking-[.18em] opacity-50">{g.label}</div>
              <ul className="space-y-0.5">
                {g.items.map(item => {
                  const active = location === item.href || (item.href !== "/" && location.startsWith(item.href));
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "group flex items-center gap-3 px-3 py-2 rounded-md transition-colors relative",
                          active ? "text-white" : "hover:text-white",
                        )}
                        style={active ? { background: "rgba(59,130,246,.16)", color: "white" } : undefined}
                        data-testid={`nav-${item.href.slice(1) || "dashboard"}`}
                      >
                        <Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge && (
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                            style={{
                              background: item.badgeTone === "danger" ? "hsl(var(--danger))"
                                        : item.badgeTone === "warning" ? "hsl(var(--warning))"
                                        : "hsl(var(--primary))",
                              color: "white",
                            }}
                          >
                            {item.badge}
                          </span>
                        )}
                        {active && (
                          <span aria-hidden className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r" style={{ background: "hsl(var(--primary))" }} />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* Header */}
      <header
        className="px-8 flex items-center gap-4 border-b bg-background"
        style={{ height: 64, position: "sticky", top: 0, zIndex: 10 }}
      >
        <div className="flex-1 min-w-0">
          {kicker && <div className="text-[11px] uppercase tracking-[.18em] text-muted-foreground">{kicker}</div>}
          <h1 className="text-lg font-semibold text-foreground truncate">{title}</h1>
        </div>
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md border bg-card text-sm text-muted-foreground w-72">
          <Search className="h-4 w-4" />
          <span className="text-xs">Search…</span>
          <kbd className="ml-auto text-[10px] border rounded px-1.5 py-0.5">Ctrl+K</kbd>
        </div>
        <div className="flex items-center gap-1 rounded-md border bg-card p-0.5">
          <button className="px-3 py-1 text-xs font-medium rounded-sm bg-foreground text-background">Operations</button>
          <button className="px-3 py-1 text-xs font-medium rounded-sm text-muted-foreground hover-elevate">Quality</button>
        </div>
        <button className="relative h-9 w-9 grid place-items-center rounded-md border bg-card hover-elevate" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full" style={{ background: "hsl(var(--danger))" }} />
        </button>
        {headerRight}
      </header>

      {/* Main scroll area — single primary scroll */}
      <main className="overflow-y-auto bg-background" style={{ overscrollBehavior: "contain" }}>
        <div className="px-8 py-6 max-w-[1480px] mx-auto">{children}</div>
      </main>
    </div>
  );
}
