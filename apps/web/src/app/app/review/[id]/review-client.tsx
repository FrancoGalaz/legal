"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

interface Clause {
  ref: string;
  title: string;
  text_excerpt: string;
  risk: string;
  finding: string;
  recommendation: string;
}

interface AnalysisResult {
  overall_risk: string;
  clauses: Clause[];
  summary: string;
}

interface Review {
  id: string;
  document_id: string;
  status: string;
  result: AnalysisResult | null;
  created_at: string;
}

const RISK_COLORS: Record<string, string> = {
  alto: "var(--risk-high)",
  medio: "var(--risk-med)",
  bajo: "var(--risk-low)",
};

const RISK_BG: Record<string, string> = {
  alto: "rgba(159,18,57,0.08)",
  medio: "rgba(217,119,6,0.08)",
  bajo: "rgba(21,128,61,0.08)",
};

const RISK_LABELS: Record<string, string> = {
  alto: "RIESGO ALTO",
  medio: "RIESGO MEDIO",
  bajo: "RIESGO BAJO",
};

function ClauseCard({ clause, defaultOpen }: { clause: Clause; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const color = RISK_COLORS[clause.risk] || RISK_COLORS.medio;

  return (
    <div
      style={{
        border: "1px solid var(--outline-variant)",
        borderRadius: 6,
        overflow: "hidden",
        background: "var(--surface-card)",
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 16px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          fontFamily: "inherit",
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: color,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--gold)",
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {clause.ref}
        </span>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "var(--navy)" }}>
          {clause.title}
        </span>
        <span
          style={{
            padding: "2px 8px",
            borderRadius: 100,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.06em",
            background: RISK_BG[clause.risk] || RISK_BG.medio,
            color: color,
          }}
        >
          {RISK_LABELS[clause.risk]}
        </span>
        <span style={{ color: "var(--navy-muted)", fontSize: 14, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
          ▾
        </span>
      </button>

      {open && (
        <div
          style={{
            padding: "0 16px 16px",
            borderTop: "1px solid var(--outline-variant)",
          }}
        >
          {clause.text_excerpt && (
            <div style={{ marginTop: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--navy-muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>
                Extracto
              </span>
              <p style={{ fontSize: 13, color: "var(--on-surface)", lineHeight: 1.5, margin: 0, fontStyle: "italic" }}>
                &ldquo;{clause.text_excerpt}&rdquo;
              </p>
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--risk-high)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>
              Hallazgo
            </span>
            <p style={{ fontSize: 13, color: "var(--on-surface)", lineHeight: 1.5, margin: 0 }}>
              {clause.finding}
            </p>
          </div>

          <div style={{ marginTop: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--risk-low)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>
              Recomendación
            </span>
            <p style={{ fontSize: 13, color: "var(--gold-container)", lineHeight: 1.5, margin: 0, fontWeight: 500 }}>
              {clause.recommendation}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReviewPage() {
  const params = useParams();
  const reviewId = params.id as string;

  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const { user, authHeaders } = useAuth();

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const tid = user?.tenant_id;
        if (!tid) {
          if (!cancelled) {
            setNeedsAuth(true);
            setLoading(false);
          }
          return;
        }

        while (!cancelled) {
          const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
          const res = await fetch(
            `${BASE}/reviews/${reviewId}?tenant_id=${tid}`,
            { headers: authHeaders() }
          );
          if (!res.ok) throw new Error("Review not found");
          const data: Review = await res.json();
          if (!cancelled) {
            setReview(data);
            if (data.status === "completed" || data.status === "failed") break;
          }
          await new Promise((r) => setTimeout(r, 1500));
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message);
          setLoading(false);
        }
        return;
      }
      if (!cancelled) setLoading(false);
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [reviewId]);

  if (needsAuth) {
    return (
      <div style={{ textAlign: "center", padding: 48 }}>
        <p style={{ color: "var(--gold)", fontSize: 14, marginBottom: 16 }}>⚠️ Debes iniciar sesión para ver los resultados.</p>
        <Link href="/app/login" style={{ color: "var(--gold)", fontWeight: 600, fontSize: 14 }}>
          Iniciar Sesión
        </Link>
      </div>
    );
  }

  if (loading && !review) {
    return (
      <div style={{ textAlign: "center", padding: 48 }}>
        <div
          style={{
            width: 32,
            height: 32,
            border: "3px solid var(--outline-variant)",
            borderTopColor: "var(--gold)",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            margin: "0 auto 16px",
          }}
        />
        <p style={{ color: "var(--navy-muted)", fontSize: 14 }}>Cargando resultados...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: "center", padding: 48 }}>
        <p style={{ color: "var(--risk-high)", fontSize: 14 }}>⚠ {error}</p>
        <Link href="/app/dashboard" style={{ color: "var(--gold)", fontSize: 14, fontWeight: 600 }}>
          Volver al Dashboard
        </Link>
      </div>
    );
  }

  if (!review) return null;

  const result = review.result;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Link
          href="/app/dashboard"
          style={{ color: "var(--navy-muted)", fontSize: 13, textDecoration: "none" }}
        >
          ← Volver al Dashboard
        </Link>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 22,
            fontWeight: 600,
            color: "var(--navy)",
            margin: "8px 0 4px",
          }}
        >
          Resultado del Análisis
        </h1>
        <p style={{ fontSize: 13, color: "var(--on-surface-variant)", margin: 0 }}>
          Documento: {review.document_id.slice(0, 16)}...
          · {new Date(review.created_at).toLocaleDateString("es-CL")}
        </p>
      </div>

      {review.status === "pending" && (
        <div
          style={{
            padding: 16,
            background: "rgba(119,90,25,0.06)",
            border: "1px solid rgba(119,90,25,0.15)",
            borderRadius: 6,
            marginBottom: 24,
            fontSize: 14,
            color: "var(--gold-container)",
            textAlign: "center",
          }}
        >
          ⏳ El análisis está en curso. Los resultados aparecerán automáticamente.
        </div>
      )}

      {review.status === "failed" && (
        <div
          style={{
            padding: 16,
            background: "rgba(159,18,57,0.06)",
            border: "1px solid rgba(159,18,57,0.15)",
            borderRadius: 6,
            marginBottom: 24,
            fontSize: 14,
            color: "var(--risk-high)",
            textAlign: "center",
          }}
        >
          ⚠ El análisis falló. Por favor, intenta nuevamente.
        </div>
      )}

      {result && (
        <>
          {/* Overall Risk + Summary */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 2fr",
              gap: 16,
              marginBottom: 24,
            }}
          >
            {/* Risk badge */}
            <div
              style={{
                background: "var(--surface-card)",
                border: "1px solid var(--outline-variant)",
                borderRadius: 8,
                padding: 24,
                textAlign: "center",
              }}
            >
              <span style={{ fontSize: 13, color: "var(--on-surface-variant)", fontWeight: 500, display: "block", marginBottom: 12 }}>
                Riesgo General
              </span>
              <span
                style={{
                  display: "inline-block",
                  padding: "8px 20px",
                  borderRadius: 100,
                  background: RISK_BG[result.overall_risk] || RISK_BG.medio,
                  color: RISK_COLORS[result.overall_risk] || RISK_COLORS.medio,
                  fontWeight: 700,
                  fontSize: 14,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                {RISK_LABELS[result.overall_risk]}
              </span>

              {/* Severity bar */}
              <div
                style={{
                  marginTop: 16,
                  height: 6,
                  background: "var(--outline-variant)",
                  borderRadius: 3,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width:
                      result.overall_risk === "alto"
                        ? "85%"
                        : result.overall_risk === "medio"
                          ? "50%"
                          : "20%",
                    background: RISK_COLORS[result.overall_risk] || RISK_COLORS.medio,
                    borderRadius: 3,
                    transition: "width 0.6s",
                  }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 6,
                  fontSize: 10,
                  color: "var(--navy-muted)",
                }}
              >
                <span>Bajo</span>
                <span>Alto</span>
              </div>
            </div>

            {/* Summary */}
            <div
              style={{
                background: "var(--surface-card)",
                border: "1px solid var(--outline-variant)",
                borderRadius: 8,
                padding: 24,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--navy-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  display: "block",
                  marginBottom: 8,
                }}
              >
                Resumen Ejecutivo
              </span>
              <p style={{ fontSize: 14, color: "var(--on-surface)", lineHeight: 1.6, margin: 0 }}>
                {result.summary}
              </p>
            </div>
          </div>

          {/* Cláusulas */}
          <div
            style={{
              background: "var(--surface-card)",
              border: "1px solid var(--outline-variant)",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--outline-variant)",
                fontWeight: 600,
                fontSize: 15,
                color: "var(--navy)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>Cláusulas Analizadas</span>
              <span style={{ fontSize: 13, fontWeight: 400, color: "var(--navy-muted)" }}>
                {result.clauses.length} cláusulas
              </span>
            </div>
            <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              {result.clauses.map((clause, i) => (
                <ClauseCard key={clause.ref} clause={clause} defaultOpen={i === 0} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
