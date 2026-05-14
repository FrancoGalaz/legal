"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

interface Review {
  id: string;
  document_id: string;
  document_filename?: string;
  status: string;
  result: { overall_risk: string; summary: string; clauses: any[] } | null;
  created_at: string;
}

interface Stats {
  total_reviews: number;
  completed: number;
  pending: number;
  failed: number;
  total_documents: number;
  risk_distribution: Record<string, number>;
  type_distribution: Record<string, number>;
  weekly_trend: { week: string; count: number }[];
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

const TYPE_LABELS: Record<string, string> = {
  commercial: "Comercial",
  laboral: "Laboral",
  corporate: "Corporativo",
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const tid = "tenant-demo";

      const [rRes, sRes] = await Promise.all([
        fetch(`${BASE}/reviews?tenant_id=${tid}&limit=10`),
        fetch(`${BASE}/reviews/stats?tenant_id=${tid}`),
      ]);

      if (rRes.ok) {
        const data: Review[] = await rRes.json();
        data.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setReviews(data);
      }
      if (sRes.ok) {
        setStats(await sRes.json());
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
  const latestReview = completed[0];
  const recentReviews = reviews.slice(0, 5);

  const maxRiskCount = stats
    ? Math.max(...Object.values(stats.risk_distribution), 1)
    : 1;

  const maxWeeklyCount = stats
    ? Math.max(...stats.weekly_trend.map((w) => w.count), 1)
    : 1;

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
          flexWrap: "wrap",
          gap: 12,
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
            {stats && stats.total_documents > 0
              ? `Tienes ${stats.total_documents} contrato${stats.total_documents !== 1 ? "s" : ""} y ${stats.completed} revisión${stats.completed !== 1 ? "es" : ""} completada${stats.completed !== 1 ? "s" : ""}.${(stats.risk_distribution.alto || 0) > 0 ? ` ${stats.risk_distribution.alto} con riesgo alto.` : ""}`
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
            href="/app/history"
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
            Ver Historial
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
          { label: "Contratos", value: stats?.total_documents ?? 0, color: "var(--navy)" },
          { label: "Revisiones", value: stats?.completed ?? 0, color: "var(--risk-low)" },
          { label: "Riesgo Alto", value: stats?.risk_distribution.alto ?? 0, color: "var(--risk-high)" },
          {
            label: "Pendientes",
            value: stats ? stats.pending + stats.failed : 0,
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

      {/* ─── Plan Usage Card (free users) ─── */}
      {user && user.plan === "free" && (
        <div
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--outline-variant)",
            borderRadius: 8,
            padding: "16px 20px",
            marginBottom: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 13, color: "var(--on-surface)" }}>
              Plan Gratuito ·{" "}
              {user.reviews_remaining !== undefined && (
                <strong style={{ color: "var(--gold)" }}>
                  {user.reviews_remaining} de {user.plan_limit} revisiones disponibles
                </strong>
              )}
            </span>
          </div>
          <Link
            href="/app/pricing"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              background: "var(--gold)",
              color: "#fff",
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 12,
              textDecoration: "none",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#8a6a20")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "var(--gold)")}
          >
            Actualizar a Pro
          </Link>
        </div>
      )}

      {/* ─── Charts Row ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 28 }}>
        {/* Risk Distribution */}
        <div
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--outline-variant)",
            borderRadius: 8,
            padding: 20,
          }}
        >
          <span style={{ fontWeight: 600, fontSize: 14, color: "var(--navy)", display: "block", marginBottom: 16 }}>
            Riesgo
          </span>
          {loading || !stats ? (
            <div style={{ color: "var(--navy-muted)", fontSize: 13 }}>Cargando...</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { key: "alto", label: "Alto", color: "var(--risk-high)", bg: "rgba(159,18,57,0.08)" },
                { key: "medio", label: "Medio", color: "var(--risk-med)", bg: "rgba(217,119,6,0.08)" },
                { key: "bajo", label: "Bajo", color: "var(--risk-low)", bg: "rgba(21,128,61,0.08)" },
              ].map((r) => {
                const count = stats.risk_distribution[r.key] || 0;
                const pct = Math.max(3, (count / maxRiskCount) * 100);
                return (
                  <div key={r.key}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: "var(--on-surface)" }}>{r.label}</span>
                      <span style={{ color: r.color, fontWeight: 700 }}>{count}</span>
                    </div>
                    <div style={{ background: r.bg, borderRadius: 4, height: 8, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, background: r.color, height: 8, borderRadius: 4, transition: "width 0.4s" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Review Type Distribution */}
        <div
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--outline-variant)",
            borderRadius: 8,
            padding: 20,
          }}
        >
          <span style={{ fontWeight: 600, fontSize: 14, color: "var(--navy)", display: "block", marginBottom: 16 }}>
            Tipo de Revisión
          </span>
          {loading || !stats ? (
            <div style={{ color: "var(--navy-muted)", fontSize: 13 }}>Cargando...</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {Object.entries(stats.type_distribution).map(([key, count]) => {
                const total = Object.values(stats.type_distribution).reduce((a, b) => a + b, 0) || 1;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={key}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: "var(--on-surface)" }}>{TYPE_LABELS[key] || key}</span>
                      <span style={{ color: "var(--gold)", fontWeight: 700 }}>{pct}%</span>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 4, height: 8, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, background: "var(--gold)", height: 8, borderRadius: 4, transition: "width 0.4s" }} />
                    </div>
                  </div>
                );
              })}
              {Object.keys(stats.type_distribution).length === 0 && (
                <span style={{ color: "var(--navy-muted)", fontSize: 13 }}>Sin datos</span>
              )}
            </div>
          )}
        </div>

        {/* Weekly Trend */}
        <div
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--outline-variant)",
            borderRadius: 8,
            padding: 20,
          }}
        >
          <span style={{ fontWeight: 600, fontSize: 14, color: "var(--navy)", display: "block", marginBottom: 16 }}>
            Tendencia Semanal
          </span>
          {loading || !stats ? (
            <div style={{ color: "var(--navy-muted)", fontSize: 13 }}>Cargando...</div>
          ) : (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 80, paddingTop: 8 }}>
              {stats.weekly_trend.map((w, i) => {
                const height = Math.max(4, (w.count / maxWeeklyCount) * 64);
                return (
                  <div
                    key={w.week}
                    style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}
                    title={`${new Date(w.week).toLocaleDateString("es-CL", { month: "short", day: "numeric" })}: ${w.count}`}
                  >
                    <div
                      style={{
                        width: "100%",
                        height,
                        background: i === stats.weekly_trend.length - 1 ? "var(--gold)" : "var(--outline-variant)",
                        borderRadius: "3px 3px 0 0",
                        minHeight: 4,
                        transition: "height 0.4s",
                      }}
                    />
                    <span style={{ fontSize: 8, color: "var(--navy-muted)", whiteSpace: "nowrap" }}>
                      {new Date(w.week).toLocaleDateString("es-CL", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
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
                        {r.document_filename || `Documento ${r.document_id.slice(0, 10)}...`}
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
              {latestReview.document_filename && (
                <p style={{ fontSize: 12, color: "var(--navy-muted)", margin: "0 0 10px" }}>
                  {latestReview.document_filename}
                </p>
              )}
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
