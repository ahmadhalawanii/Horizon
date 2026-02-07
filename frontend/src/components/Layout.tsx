import { Outlet, NavLink } from "react-router-dom";
import { useWebSocket } from "../hooks/useWebSocket";
import clsx from "clsx";

const NAV_ITEMS = [
  { to: "/overview", label: "Overview", icon: "◈" },
  { to: "/console", label: "Digital Twin Console", icon: "⬡" },
  { to: "/simulator", label: "Impact Simulator", icon: "△" },
  { to: "/actions", label: "Action Log", icon: "☰" },
];

export default function Layout() {
  const { status } = useWebSocket();

  const statusColor =
    status === "connected"
      ? "bg-horizon-green"
      : status === "reconnecting"
      ? "bg-horizon-amber"
      : "bg-gray-500";

  const statusLabel =
    status === "connected"
      ? "Live"
      : status === "reconnecting"
      ? "Reconnecting"
      : "Offline";

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-horizon-surface border-r border-horizon-border flex flex-col">
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
          Hackathon Prototype v0.1
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 flex-shrink-0 bg-horizon-surface border-b border-horizon-border flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-horizon-muted">
              Villa A
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={clsx("w-2 h-2 rounded-full", statusColor)} />
            <span className="text-xs text-horizon-muted">{statusLabel}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
