import { Outlet, NavLink } from "react-router-dom";
import { useWebSocket } from "../hooks/useWebSocket";
import clsx from "clsx";

const NAV_ITEMS = [
  { to: "/overview", label: "Overview", shortLabel: "Home", icon: "◈" },
  { to: "/scan", label: "Scan Home", shortLabel: "Scan", icon: "📱" },
  { to: "/console", label: "Digital Twin Console", shortLabel: "Twin", icon: "⬡" },
  { to: "/simulator", label: "Impact Simulator", shortLabel: "Simulate", icon: "△" },
  { to: "/actions", label: "Action Log", shortLabel: "Actions", icon: "☰" },
];

export default function Layout() {
  const { status } = useWebSocket();

  const statusColor =
    status === "connected" ? "bg-horizon-green"
    : status === "reconnecting" ? "bg-horizon-amber"
    : "bg-gray-500";

  const statusLabel =
    status === "connected" ? "Live"
    : status === "reconnecting" ? "Reconnecting"
    : "Offline";

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden">
      {/* Desktop sidebar (hidden on mobile) */}
      <aside className="hidden md:flex w-60 flex-shrink-0 bg-horizon-surface border-r border-horizon-border flex-col">
        <div className="p-5 border-b border-horizon-border">
          <h1 className="text-xl font-bold tracking-tight">
            <span className="text-horizon-accent">◈</span> Horizon
          </h1>
          <p className="text-xs text-horizon-muted mt-1">Energy Digital Twin</p>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-horizon-accent/10 text-horizon-accent"
                    : "text-horizon-muted hover:text-horizon-text hover:bg-horizon-card"
                )
              }
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-horizon-border text-xs text-horizon-muted">
          Hackathon Prototype v0.2
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-12 md:h-14 flex-shrink-0 bg-horizon-surface border-b border-horizon-border flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile: show logo */}
            <span className="md:hidden text-horizon-accent font-bold text-lg">◈ Horizon</span>
            <span className="hidden md:inline text-sm font-medium text-horizon-muted">Villa A</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={clsx("w-2 h-2 rounded-full", statusColor)} />
            <span className="text-xs text-horizon-muted">{statusLabel}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-3 md:p-6 pb-20 md:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav (visible only on small screens) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-horizon-surface border-t border-horizon-border flex items-center justify-around py-2 z-50 safe-area-pb">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              clsx(
                "flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors min-h-[44px] justify-center",
                isActive
                  ? "text-horizon-accent"
                  : "text-horizon-muted"
              )
            }
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.shortLabel}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
