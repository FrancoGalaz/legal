"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Review {
  id: string;
  document_id: string;
  status: string;
  result: { overall_risk: string; summary: string; clauses: any[] } | null;
  created_at: string;
}

interface Document {
  id: string;
  filename: string;
}

const RISK_COLORS: Record<string, string> = {
  alto: "var(--risk-high)",
  medio: "var(--risk-med)",
  bajo: "var(--risk-low)",
};

const RISK_BG: Record<string, string> = {
  alto: "rgba(159,18,57,0.1)",
  medio: "rgba(217,119,6,0.1)",
  bajo: "rgba(21,128,61,0.1)",
};

export default function DashboardPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [rRes, dRes] = await Promise.all([
        fetch("http://localhost:8000/reviews?tenant_id=tenant-demo"),
        fetch("http://localhost:8000/documents?tenant_id=tenant-demo"),
      ]);
      if (rRes.ok) {
        const data: Review[] = await rRes.json();
        // Sort newest first
        data.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setReviews(data);
      }
      if (dRes.ok) {
        const data: Document[] = await dRes.json();
        setDocs(data);
      }
    } catch {
      // silent
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const completed = reviews.filter((r) => r.status === "completed");
  const totalDocs = docs.length;
  const highRisk = completed.filter((r) => r.result?.overall_risk === "alto").length;
  const latestReview = completed[0];
  const recentReviews = reviews.slice(0, 5);

  return (
    <div>
      {/* ─── Welcome + Quick Actions ─── */}
      <div
        style={{
          background: "linear-gradient(135deg, var(--navy) 0%, #0a2640 100%)",
          borderRadius: 10,
          padding: "28px 32px",
          marginBottom: 28,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 22,
              fontWeight: 600,
              color: "#fff",
              margin: "0 0 6px",
            }}
          >
            Buenas tardes, Demo
          </h1>
          <p style={{ fontSize: 14, color: "var(--navy-muted)", margin: 0, lineHeight: 1.5 }}>
            {totalDocs > 0
              ? `Tienes ${totalDocs} contrato${totalDocs !== 1 ? "s" : ""} y ${completed.length} revisión${completed.length !== 1 ? "es" : ""} completada${completed.length !== 1 ? "s" : ""}.${highRisk > 0 ? ` ${highRisk} con riesgo alto.` : ""}`
              : "Sube tu primer contrato para comenzar a revisarlo con inteligencia artificial."}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link
            href="/app/review/new"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 20px",
              background: "var(--gold)",
              color: "#fff",
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 13,
              textDecoration: "none",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#8a6a20")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "var(--gold)")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nuevo Análisis
          </Link>
          <Link
            href="/app/contracts"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 20px",
              background: "rgba(255,255,255,0.08)",
              color: "#fff",
              borderRadius: 6,
              fontWeight: 500,
              fontSize: 13,
              textDecoration: "none",
              border: "1px solid rgba(255,255,255,0.12)",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.14)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
          >
            Ver Contratos
          </Link>
        </div>
      </div>

      {/* ─── Stats Grid ─── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 28,
        }}
      >
        {[
          { label: "Contratos", value: totalDocs, color: "var(--navy)" },
          { label: "Revisiones", value: completed.length, color: "var(--risk-low)" },
          { label: "Riesgo Alto", value: highRisk, color: "var(--risk-high)" },
          {
            label: "Cláusulas Revisadas",
            value: completed.reduce((s, r) => s + (r.result?.clauses?.length || 0), 0),
            color: "var(--gold)",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: "var(--surface-card)",
              border: "1px solid var(--outline-variant)",
              borderRadius: 8,
              padding: "18px 20px",
            }}
          >
            <span
              style={{
                fontSize: 12,
                color: "var(--on-surface-variant)",
                fontWeight: 500,
                display: "block",
                marginBottom: 8,
              }}
            >
              {stat.label}
            </span>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 28,
                fontWeight: 700,
                color: stat.color,
                letterSpacing: "-0.02em",
              }}
            >
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      {/* ─── Two-column layout ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Recent Activity */}
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
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 14, color: "var(--navy)" }}>
              Actividad Reciente
            </span>
            <Link href="/app/history" style={{ fontSize: 12, color: "var(--gold)", fontWeight: 600, textDecoration: "none" }}>
              Ver todo
            </Link>
          </div>

          {loading && (
            <div style={{ padding: 32, textAlign: "center", color: "var(--navy-muted)", fontSize: 13 }}>
              Cargando...
            </div>
          )}

          {!loading && recentReviews.length === 0 && (
            <div style={{ padding: 32, textAlign: "center" }}>
              <p style={{ color: "var(--navy-muted)", fontSize: 13, margin: "0 0 12px" }}>
                Aún no hay actividad
              </p>
              <Link
                href="/app/review/new"
                style={{ color: "var(--gold)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}
              >
                Analizar un contrato →
              </Link>
            </div>
          )}

          {!loading && recentReviews.length > 0 && (
            <div style={{ padding: 8 }}>
              {recentReviews.map((r) => {
                const risk = r.result?.overall_risk || r.status;
                const color = RISK_COLORS[risk] || "var(--navy-muted)";
                const bg = RISK_BG[risk] || "rgba(116,119,125,0.1)";
                return (
                  <Link
                    key={r.id}
                    href={`/app/review/${r.id}`}
                    style={{ textDecoration: "none" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 12px",
                        borderRadius: 6,
                        cursor: "pointer",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(4,22,39,0.02)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
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
                          flex: 1,
                          fontSize: 13,
                          color: "var(--on-surface)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Documento {r.document_id.slice(0, 10)}...
                      </span>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 100,
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          background: bg,
                          color: color,
                          textTransform: "uppercase",
                        }}
                      >
                        {risk}
                      </span>
                      <span style={{ fontSize: 12, color: "var(--navy-muted)" }}>
                        {new Date(r.created_at).toLocaleDateString("es-CL", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Latest Review Summary */}
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
              fontSize: 14,
              color: "var(--navy)",
            }}
          >
            Último Análisis
          </div>

          {loading && (
            <div style={{ padding: 32, textAlign: "center", color: "var(--navy-muted)", fontSize: 13 }}>
              Cargando...
            </div>
          )}

          {!loading && !latestReview && (
            <div style={{ padding: 32, textAlign: "center" }}>
              <p style={{ color: "var(--navy-muted)", fontSize: 13, margin: 0 }}>
                No hay análisis aún.
              </p>
            </div>
          )}

          {!loading && latestReview && (
            <div style={{ padding: 20 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 14,
                }}
              >
                <span
                  style={{
                    padding: "4px 12px",
                    borderRadius: 100,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    background: RISK_BG[latestReview.result?.overall_risk || ""] || "rgba(116,119,125,0.1)",
                    color: RISK_COLORS[latestReview.result?.overall_risk || ""] || "var(--navy-muted)",
                    textTransform: "uppercase",
                  }}
                >
                  {latestReview.result?.overall_risk || "Pendiente"}
                </span>
                <span style={{ fontSize: 12, color: "var(--navy-muted)" }}>
                  {latestReview.result?.clauses?.length || 0} cláusulas
                </span>
              </div>
              {latestReview.result?.summary && (
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--on-surface)",
                    lineHeight: 1.6,
                    margin: "0 0 16px",
                    display: "-webkit-box",
                    WebkitLineClamp: 4,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {latestReview.result.summary}
                </p>
              )}
              <Link
                href={`/app/review/${latestReview.id}`}
                style={{
                  color: "var(--gold)",
                  fontWeight: 600,
                  fontSize: 13,
                  textDecoration: "none",
                }}
              >
                Ver detalle completo →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
