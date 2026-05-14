"use client";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isRouterError =
    error.message?.includes("router") ||
    error.message?.includes("replace") ||
    error.message?.includes("push");

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--surface)",
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 480,
          textAlign: "center",
          background: "var(--surface-card)",
          border: "1px solid var(--outline-variant)",
          borderRadius: 12,
          padding: 40,
        }}
      >
        <span style={{ fontSize: 48, display: "block", marginBottom: 16 }}>
          {isRouterError ? "🔌" : "⚠️"}
        </span>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 20,
            fontWeight: 600,
            color: "var(--navy)",
            margin: "0 0 8px",
          }}
        >
          {isRouterError
            ? "App sin conexión al servidor"
            : "Error inesperado"}
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "var(--on-surface-variant)",
            lineHeight: 1.5,
            margin: "0 0 24px",
          }}
        >
          {isRouterError
            ? "Esta página necesita conexión con el backend de Legal Agent CL. Inicia el servidor local para usar la aplicación completa."
            : "Ocurrió un error al cargar esta página. Puedes intentar recargar."}
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button
            onClick={reset}
            style={{
              padding: "10px 24px",
              background: "var(--gold)",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "#8a6a20")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "var(--gold)")
            }
          >
            Reintentar
          </button>
          <a
            href="/app/login"
            style={{
              padding: "10px 24px",
              background: "transparent",
              color: "var(--navy)",
              border: "1px solid var(--outline-variant)",
              borderRadius: 6,
              fontWeight: 500,
              fontSize: 14,
              textDecoration: "none",
              fontFamily: "inherit",
            }}
          >
            Ir al Login
          </a>
        </div>
      </div>
    </div>
  );
}
