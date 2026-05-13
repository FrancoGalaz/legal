"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type ReviewResponse } from "@/lib/api";

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div
      style={{
        background: "var(--surface-card)",
        border: "1px solid var(--outline-variant)",
        borderRadius: 8,
        padding: "20px 24px",
        flex: "1 1 160px",
      }}
    >
      <span
        style={{
          fontSize: 13,
          color: "var(--on-surface-variant)",
          fontWeight: 500,
          display: "block",
          marginBottom: 8,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 32,
          fontWeight: 700,
          color: color || "var(--navy)",
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function ReviewRow({ review }: { review: ReviewResponse }) {
  const riskColors: Record<string, string> = {
    alto: "var(--risk-high)",
    medio: "var(--risk-med)",
    bajo: "var(--risk-low)",
    pending: "var(--navy-muted)",
    failed: "var(--risk-high)",
  };
  const riskBg: Record<string, string> = {
    alto: "rgba(159,18,57,0.1)",
    medio: "rgba(217,119,6,0.1)",
    bajo: "rgba(21,128,61,0.1)",
    pending: "rgba(116,119,125,0.1)",
    failed: "rgba(159,18,57,0.1)",
  };
  const risk = review.result?.overall_risk || review.status;

  return (
    <Link
      href={`/app/review/${review.id}`}
      style={{ textDecoration: "none" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "14px 16px",
          background: "var(--surface-card)",
          border: "1px solid var(--outline-variant)",
          borderRadius: 6,
          cursor: "pointer",
          transition: "border-color 0.15s, box-shadow 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "var(--gold)";
          e.currentTarget.style.boxShadow = "0 2px 8px rgba(119,90,25,0.06)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--outline-variant)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        <span
          style={{
            padding: "4px 10px",
            borderRadius: 100,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.04em",
            background: riskBg[risk] || riskBg.pending,
            color: riskColors[risk] || riskColors.pending,
            textTransform: "uppercase",
            flexShrink: 0,
          }}
        >
          {risk}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--navy)",
              display: "block",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {review.document_id.slice(0, 12)}...
          </span>
          <span style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>
            {new Date(review.created_at).toLocaleDateString("es-CL", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <span style={{ fontSize: 18, color: "var(--navy-muted)" }}>→</span>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const [reviews, setReviews] = useState<ReviewResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:8000/reviews?tenant_id=tenant-demo");
      if (res.ok) {
        const data = await res.json();
        setReviews(Array.isArray(data) ? data : []);
      } else {
        setReviews([]);
      }
    } catch (e) {
      setError("No se pudo conectar con el servidor.");
      setReviews([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const total = reviews.length;
  const completed = reviews.filter((r) => r.status === "completed");
  const highRisk = completed.filter(
    (r) => r.result?.overall_risk === "alto"
  ).length;

  return (
    <div>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 24,
              fontWeight: 600,
              color: "var(--navy)",
              margin: 0,
            }}
          >
            Dashboard
          </h1>
          <p style={{ fontSize: 14, color: "var(--on-surface-variant)", margin: "4px 0 0" }}>
            Resumen de actividad de revisiones
          </p>
        </div>
        <Link
          href="/app/review/new"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 20px",
            background: "var(--gold)",
            color: "#fff",
            borderRadius: 6,
            fontWeight: 600,
            fontSize: 14,
            textDecoration: "none",
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#8a6a20")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--gold)")}
        >
          ⊕ Nuevo Análisis
        </Link>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <StatCard label="Revisiones Totales" value={total} />
        <StatCard label="Completadas" value={completed.length} color="var(--risk-low)" />
        <StatCard label="Riesgo Alto" value={highRisk} color="var(--risk-high)" />
      </div>

      {/* Recent reviews */}
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
          }}
        >
          Revisiones Recientes
        </div>

        {loading && (
          <div style={{ padding: 32, textAlign: "center", color: "var(--navy-muted)", fontSize: 14 }}>
            Cargando...
          </div>
        )}

        {error && (
          <div style={{ padding: 32, textAlign: "center" }}>
            <p style={{ color: "var(--risk-high)", fontSize: 14, margin: "0 0 8px" }}>{error}</p>
            <button
              onClick={loadHistory}
              style={{
                background: "var(--navy)",
                color: "#fff",
                border: "none",
                padding: "8px 20px",
                borderRadius: 4,
                cursor: "pointer",
                fontWeight: 500,
                fontSize: 13,
              }}
            >
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && reviews.length === 0 && (
          <div style={{ padding: 32, textAlign: "center" }}>
            <p style={{ color: "var(--navy-muted)", fontSize: 14, margin: "0 0 16px" }}>
              No hay revisiones aún. Sube tu primer contrato.
            </p>
            <Link
              href="/app/review/new"
              style={{
                color: "var(--gold)",
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              Analizar un contrato →
            </Link>
          </div>
        )}

        {!loading && !error && reviews.length > 0 && (
          <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {reviews.map((r) => (
              <ReviewRow key={r.id} review={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
