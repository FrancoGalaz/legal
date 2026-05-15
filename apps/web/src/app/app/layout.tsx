"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const NAV_SECTIONS = [
  {
    label: "Principal",
    items: [
      { href: "/app/dashboard", label: "Workspace", icon: "LayoutDashboard" },
    ],
  },
  {
    label: "Documentos",
    items: [
      { href: "/app/contracts", label: "Mis Contratos", icon: "FileText" },
      { href: "/app/review/new", label: "Nuevo Análisis", icon: "PlusCircle" },
    ],
  },
  {
    label: "Actividad",
    items: [
      { href: "/app/history", label: "Historial", icon: "Clock" },
    ],
  },
  {
    label: "Cuenta",
    items: [
      { href: "/app/pricing", label: "Planes", icon: "CreditCard" },
      { href: "/app/team", label: "Mi Estudio", icon: "Users" },
    ],
  },
];

// SVG icons inline
function Icon({ name }: { name: string }) {
  const icons: Record<string, JSX.Element> = {
    LayoutDashboard: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
    FileText: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    PlusCircle: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    ),
    Clock: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    CreditCard: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
    Users: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  };
  return icons[name] || null;
}

/** Inner content — must be inside AuthProvider */
function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // If on login page, don't show the sidebar
  if (pathname === "/app/login") {
    return <>{children}</>;
  }

  // Auth guard — redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      try {
        router.replace("/app/login");
      } catch {
        // Fallback for static export (router.replace not available)
        window.location.href = "/legal/app/login";
      }
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "var(--surface)",
          color: "var(--navy-muted)",
          fontSize: 14,
        }}
      >
        Cargando...
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in the effect
  }

  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--surface)" }}>
      {/* ─── Sidebar Overlay (mobile) ─── */}
      <div
        className={`app-sidebar-overlay ${mobileOpen ? "open" : ""}`}
        onClick={() => setMobileOpen(false)}
        style={{ display: "none" }}
      />

      {/* ─── Sidebar ─── */}
      <aside
        className={`app-sidebar ${mobileOpen ? "open" : ""}`}
        style={{
          width: collapsed ? 64 : 240,
          background: "var(--navy)",
          borderRight: "1px solid rgba(129,146,167,0.1)",
          display: "flex",
          flexDirection: "column",
          transition: "width 0.2s ease",
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        {/* Logo */}
        <div
          style={{
            padding: collapsed ? "20px 0" : "20px 20px",
            borderBottom: "1px solid rgba(129,146,167,0.1)",
            textAlign: collapsed ? "center" : "left",
          }}
        >
          <Link href="/app/dashboard" style={{ textDecoration: "none" }}>
            {collapsed ? (
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 16,
                  fontWeight: 700,
                  color: "var(--gold)",
                }}
              >
                LC
              </span>
            ) : (
              <div>
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#fff",
                    display: "block",
                  }}
                >
                  Legal Agent
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 18,
                    fontWeight: 700,
                    color: "var(--gold)",
                  }}
                >
                  CL
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: "16px 8px", overflow: "auto" }}>
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} style={{ marginBottom: 20 }}>
              {!collapsed && (
                <span
                  style={{
                    display: "block",
                    padding: "0 8px 8px",
                    fontSize: 10,
                    fontWeight: 700,
                    color: "rgba(129,146,167,0.5)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  {section.label}
                </span>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {section.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: collapsed ? "10px 0" : "9px 12px",
                        justifyContent: collapsed ? "center" : "flex-start",
                        borderRadius: 6,
                        background: active ? "rgba(119,90,25,0.15)" : "transparent",
                        color: active ? "var(--gold-container)" : "var(--navy-muted)",
                        textDecoration: "none",
                        fontSize: 13,
                        fontWeight: active ? 600 : 400,
                        transition: "all 0.15s",
                        whiteSpace: "nowrap",
                      }}
                      onMouseEnter={(e) => {
                        if (!active)
                          e.currentTarget.style.background = "rgba(129,146,167,0.06)";
                      }}
                      onMouseLeave={(e) => {
                        if (!active) e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <Icon name={item.icon} />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Collapse toggle */}
        <div
          style={{
            padding: "12px 8px",
            borderTop: "1px solid rgba(129,146,167,0.1)",
          }}
        >
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              width: "100%",
              padding: "8px",
              background: "transparent",
              border: "1px solid rgba(129,146,167,0.15)",
              color: "var(--navy-muted)",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              transition: "border-color 0.15s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.borderColor = "rgba(129,146,167,0.3)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.borderColor = "rgba(129,146,167,0.15)")
            }
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ transform: collapsed ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            {!collapsed && <span>Colapsar</span>}
          </button>
        </div>
      </aside>

      {/* ─── Main Content ─── */}
      <div className="app-main-content" style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Top bar */}
        <header
          className="app-topbar"
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
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Mobile menu toggle */}
            <button
              style={{
                display: "none",
                background: "none",
                border: "none",
                color: "var(--navy)",
                cursor: "pointer",
                padding: 4,
              }}
              className="mobile-menu-btn"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <span style={{ fontSize: 13, color: "var(--on-surface-variant)" }}>
              {new Date().toLocaleDateString("es-CL", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* User avatar + name */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: "var(--font-display)",
                }}
              >
                {initials}
              </span>
              <div>
                <span
                  style={{
                    fontSize: 13,
                    color: "var(--on-surface)",
                    fontWeight: 500,
                    display: "block",
                    lineHeight: 1.2,
                  }}
                >
                  {user.name}
                </span>
                <span style={{ fontSize: 11, color: "var(--navy-muted)" }}>
                  {user.plan_label === "Pro" ? (
                    <span style={{ color: "var(--gold)", fontWeight: 600 }}>
                      ⭐ Pro
                    </span>
                  ) : (
                    <>
                      Plan Gratuito ·{" "}
                      <Link
                        href="/app/pricing"
                        style={{ color: "var(--gold)", textDecoration: "none", fontWeight: 500 }}
                      >
                        Actualizar
                      </Link>
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={logout}
              style={{
                background: "none",
                border: "1px solid var(--outline-variant)",
                borderRadius: 6,
                padding: "6px 12px",
                color: "var(--navy-muted)",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--gold)";
                e.currentTarget.style.color = "var(--gold)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--outline-variant)";
                e.currentTarget.style.color = "var(--navy-muted)";
              }}
            >
              Cerrar Sesión
            </button>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: 32, overflow: "auto" }}>
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

/** Auth-aware app layout */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppLayoutInner>{children}</AppLayoutInner>
    </AuthProvider>
  );
}
