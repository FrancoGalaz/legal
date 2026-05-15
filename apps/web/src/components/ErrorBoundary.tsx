"use client";

import { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary — catches React rendering errors and shows a fallback UI
 * instead of crashing the entire app. Wraps each app page independently
 * so one broken page doesn't take down the whole sidebar/main layout.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    // Log to console for debugging (could add Sentry or similar here)
    console.error("[ErrorBoundary]", error.message, info.componentStack || "");
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            padding: 40,
            textAlign: "center",
            maxWidth: 480,
            margin: "40px auto",
          }}
        >
          <span
            style={{
              fontSize: 40,
              display: "block",
              marginBottom: 16,
            }}
          >
            ⚠️
          </span>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 20,
              fontWeight: 600,
              color: "var(--navy)",
              margin: "0 0 8px",
            }}
          >
            Algo salió mal
          </h2>
          <p
            style={{
              fontSize: 14,
              color: "var(--on-surface-variant)",
              lineHeight: 1.5,
              margin: "0 0 6px",
            }}
          >
            Ocurrió un error inesperado al cargar esta página.
          </p>
          {this.state.error && (
            <p
              style={{
                fontSize: 12,
                color: "var(--risk-high)",
                background: "rgba(159,18,57,0.06)",
                padding: "8px 12px",
                borderRadius: 6,
                margin: "12px 0",
                fontFamily: "var(--font-mono)",
                wordBreak: "break-word",
              }}
            >
              {this.state.error.message}
            </p>
          )}
          <button
            onClick={this.handleReset}
            style={{
              marginTop: 16,
              padding: "10px 24px",
              background: "var(--gold)",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "background 0.2s",
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
          <div style={{ marginTop: 12 }}>
            <a
              href="/app/dashboard"
              style={{
                color: "var(--gold)",
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Volver al dashboard →
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
