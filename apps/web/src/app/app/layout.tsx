"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/app/dashboard", label: "Dashboard", icon: "◈" },
  { href: "/app/review/new", label: "Nuevo Análisis", icon: "⊕" },
  { href: "/app/history", label: "Historial", icon: "☰" },
];

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  return (
    <aside
      className={`app-sidebar ${collapsed ? "collapsed" : ""}`}
      style={{
        width: collapsed ? 64 : 240,
        background: "var(--navy)",
        borderRight: "1px solid rgba(129,146,167,0.1)",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.25s",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "20px 16px", borderBottom: "1px solid rgba(129,146,167,0.1)" }}>
        <Link href="/app/dashboard" style={{ textDecoration: "none" }}>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: collapsed ? 14 : 18,
              fontWeight: 700,
              color: "#fff",
              whiteSpace: "nowrap",
            }}
          >
            {collapsed ? "LC" : "Legal Agent CL"}
          </span>
        </Link>
      </div>

      <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 4 }}>
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                borderRadius: 6,
                background: active ? "rgba(119,90,25,0.15)" : "transparent",
                color: active ? "var(--gold-container)" : "var(--navy-muted)",
                textDecoration: "none",
                fontSize: 14,
                fontWeight: active ? 600 : 400,
                transition: "all 0.15s",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = "rgba(129,146,167,0.06)";
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = "transparent";
              }}
            >
              <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: "16px", borderTop: "1px solid rgba(129,146,167,0.1)" }}>
        <button
          onClick={onToggle}
          style={{
            background: "transparent",
            border: "1px solid rgba(129,146,167,0.2)",
            color: "var(--navy-muted)",
            padding: "6px 12px",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 12,
            width: "100%",
          }}
        >
          {collapsed ? "→" : "Colapsar"}
        </button>
      </div>
    </aside>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--surface)" }}>
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((c) => !c)} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Top bar */}
        <header
          style={{
            height: 56,
            background: "var(--surface-card)",
            borderBottom: "1px solid var(--outline-variant)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 14, color: "var(--on-surface-variant)" }}>
            {new Date().toLocaleDateString("es-CL", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "var(--gold)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              D
            </span>
            <span style={{ fontSize: 13, color: "var(--on-surface)", fontWeight: 500 }}>
              Demo
            </span>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: 24, overflow: "auto" }}>{children}</main>
      </div>
    </div>
  );
}
