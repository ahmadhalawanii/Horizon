import { Outlet, NavLink } from "react-router-dom";
import { useWebSocket } from "../hooks/useWebSocket";
import AutopilotToggle from "./AutopilotToggle";
import clsx from "clsx";

const NAV_ITEMS = [
  { to: "/overview", label: "Overview", icon: "O" },
  { to: "/twin", label: "Twin", icon: "T" },
  { to: "/simulator", label: "Simulator", icon: "S" },
  { to: "/actions", label: "Actions", icon: "A" },
];

export default function Layout() {
  const { status } = useWebSocket();

  const statusColor =
    status === "connected"
      ? "bg-horizon-green"
      : status === "reconnecting"
      ? "bg-horizon-amber"
      : "bg-gray-400";

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-horizon-bg">
      {/* Top bar */}
      <header className="h-14 flex-shrink-0 bg-horizon-surface border-b border-horizon-border flex items-center justify-between px-4 md:px-6">
        {/* Left: Logo */}
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold tracking-tight text-horizon-text">
            Horizon
          </h1>
          <span className={clsx("w-1.5 h-1.5 rounded-full", statusColor)} />
        </div>

        {/* Center: Nav tabs (desktop) */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-horizon-accent/10 text-horizon-accent"
                    : "text-horizon-muted hover:text-horizon-text hover:bg-gray-100"
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Right: Autopilot toggle */}
        <AutopilotToggle />
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-6">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-horizon-surface border-t border-horizon-border flex items-center justify-around py-2 z-50 safe-area-pb">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              clsx(
                "flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[44px] justify-center",
                isActive ? "text-horizon-accent" : "text-horizon-muted"
              )
            }
          >
            <span className="text-sm font-bold">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
