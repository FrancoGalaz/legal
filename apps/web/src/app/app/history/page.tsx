"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

interface Review {
  id: string;
  document_id: string;
  document_filename?: string;
  review_type: string;
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
  in_progress: "var(--gold)",
};

const RISK_BG: Record<string, string> = {
  alto: "rgba(159,18,57,0.1)",
  medio: "rgba(217,119,6,0.1)",
  bajo: "rgba(21,128,61,0.1)",
  pending: "rgba(116,119,125,0.1)",
  failed: "rgba(159,18,57,0.1)",
  in_progress: "rgba(217,119,6,0.1)",
};

const TYPE_LABELS: Record<string, string> = {
  commercial: "Comercial",
  laboral: "Laboral",
  corporate: "Corporativo",
};

const STATUS_LABELS: Record<string, string> = {
  completed: "Completado",
  pending: "Pendiente",
  in_progress: "En Progreso",
  failed: "Fallido",
};

export default function HistoryPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const { user, authHeaders } = useAuth();

  const load = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    setNeedsAuth(false);
    try {
      const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const tid = user?.tenant_id;
      if (!tid) {
        setNeedsAuth(true);
        setLoading(false);
        return;
      }
      const params = new URLSearchParams({ tenant_id: tid });
      if (statusFilter) params.set("status", statusFilter);
      if (typeFilter) params.set("review_type", typeFilter);
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(`${BASE}/reviews?${params.toString()}`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setReviews(Array.isArray(data) ? data : []);
      } else if (res.status === 401) {
        setNeedsAuth(true);
      }
    } catch {
      setFetchError("Error de conexión con el servidor.");
    }
    setLoading(false);
  }, [statusFilter, typeFilter, searchQuery, user?.tenant_id, authHeaders]);

  useEffect(() => {
    load();
  }, [load]);

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

      {/* ─── Filters ─── */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 20,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <input
          type="text"
          placeholder="Buscar por nombre de archivo..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: "8px 14px",
            borderRadius: 6,
            border: "1px solid var(--outline-variant)",
            background: "var(--surface-card)",
            color: "var(--on-surface)",
            fontSize: 13,
            flex: 1,
            minWidth: 200,
            outline: "none",
          }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: "8px 14px",
            borderRadius: 6,
            border: "1px solid var(--outline-variant)",
            background: "var(--surface-card)",
            color: "var(--on-surface)",
            fontSize: 13,
            cursor: "pointer",
            outline: "none",
          }}
        >
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{
            padding: "8px 14px",
            borderRadius: 6,
            border: "1px solid var(--outline-variant)",
            background: "var(--surface-card)",
            color: "var(--on-surface)",
            fontSize: 13,
            cursor: "pointer",
            outline: "none",
          }}
        >
          <option value="">Todos los tipos</option>
          {Object.entries(TYPE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* ─── Error States ─── */}
      {needsAuth && (
        <div
          style={{
            background: "rgba(217,119,6,0.1)",
            border: "1px solid var(--gold)",
            borderRadius: 8,
            padding: "16px 20px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 13, color: "var(--on-surface)" }}>
            ⚠️ Sesión no encontrada.
          </span>
          <Link
            href="/app/login"
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
            }}
          >
            Iniciar Sesión
          </Link>
        </div>
      )}

      {fetchError && (
        <div
          style={{
            background: "rgba(159,18,57,0.08)",
            border: "1px solid var(--risk-high)",
            borderRadius: 8,
            padding: "16px 20px",
            marginBottom: 20,
          }}
        >
          <span style={{ fontSize: 13, color: "var(--risk-high)", display: "flex", alignItems: "center", gap: 8 }}>
            ⚠️ {fetchError}
          </span>
        </div>
      )}

      {/* ─── List ─── */}
      {loading && (
        <div style={{ textAlign: "center", padding: 32, color: "var(--navy-muted)", fontSize: 14 }}>
          Cargando...
        </div>
      )}

      {!loading && reviews.length === 0 && (
        <div style={{ textAlign: "center", padding: 32 }}>
          <p style={{ color: "var(--navy-muted)", fontSize: 14, margin: "0 0 16px" }}>
            {searchQuery || statusFilter || typeFilter
              ? "No se encontraron revisiones con esos filtros."
              : "No hay revisiones aún."}
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
                    {risk === "pending"
                      ? "Pendiente"
                      : risk === "in_progress"
                        ? "Analizando"
                        : risk === "failed"
                          ? "Fallido"
                          : risk}
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
                      {review.document_filename || `Documento ${review.document_id.slice(0, 12)}...`}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>
                      {TYPE_LABELS[review.review_type] || review.review_type}
                      {" · "}
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
