"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Review {
  id: string;
  document_id: string;
  status: string;
  result: { overall_risk: string } | null;
  created_at: string;
}

const RISK_COLORS: Record<string, string> = {
  alto: "var(--risk-high)",
  medio: "var(--risk-med)",
  bajo: "var(--risk-low)",
  pending: "var(--navy-muted)",
  failed: "var(--risk-high)",
};

const RISK_BG: Record<string, string> = {
  alto: "rgba(159,18,57,0.1)",
  medio: "rgba(217,119,6,0.1)",
  bajo: "rgba(21,128,61,0.1)",
  pending: "rgba(116,119,125,0.1)",
  failed: "rgba(159,18,57,0.1)",
};

export default function HistoryPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("http://localhost:8000/reviews?tenant_id=tenant-demo");
        if (res.ok) {
          const data = await res.json();
          setReviews(Array.isArray(data) ? data : []);
        }
      } catch {
        // silently fail
      }
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div>
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 24,
          fontWeight: 600,
          color: "var(--navy)",
          margin: "0 0 4px",
        }}
      >
        Historial
      </h1>
      <p style={{ fontSize: 14, color: "var(--on-surface-variant)", margin: "0 0 24px" }}>
        Todas las revisiones realizadas.
      </p>

      {loading && (
        <div style={{ textAlign: "center", padding: 32, color: "var(--navy-muted)", fontSize: 14 }}>
          Cargando...
        </div>
      )}

      {!loading && reviews.length === 0 && (
        <div style={{ textAlign: "center", padding: 32 }}>
          <p style={{ color: "var(--navy-muted)", fontSize: 14, margin: "0 0 16px" }}>
            No hay revisiones aún.
          </p>
          <Link
            href="/app/review/new"
            style={{ color: "var(--gold)", fontWeight: 600, fontSize: 14 }}
          >
            Analizar un contrato →
          </Link>
        </div>
      )}

      {!loading && reviews.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {reviews.map((review) => {
            const risk = review.result?.overall_risk || review.status;
            return (
              <Link
                key={review.id}
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
                    transition: "border-color 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--gold)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--outline-variant)")}
                >
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: 100,
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      background: RISK_BG[risk],
                      color: RISK_COLORS[risk],
                      textTransform: "uppercase",
                      flexShrink: 0,
                      minWidth: 80,
                      textAlign: "center",
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
                      }}
                    >
                      Documento {review.document_id.slice(0, 12)}...
                    </span>
                    <span style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>
                      {new Date(review.created_at).toLocaleDateString("es-CL", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <span style={{ fontSize: 18, color: "var(--navy-muted)" }}>→</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
