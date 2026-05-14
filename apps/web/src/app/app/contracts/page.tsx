"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Document {
  id: string;
  filename: string;
  content_type: string;
  status: string;
  created_at: string;
}

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

function FileTypeIcon({ type }: { type: string }) {
  const color =
    type.includes("pdf")
      ? "#dc2626"
      : type.includes("word") || type.includes("docx")
        ? "#2563eb"
        : "var(--navy-muted)";
  return (
    <span
      style={{
        width: 36,
        height: 36,
        borderRadius: 6,
        background: `${color}15`,
        color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        fontWeight: 700,
        fontFamily: "var(--font-mono)",
        flexShrink: 0,
      }}
    >
      {type.includes("pdf") ? "PDF" : type.includes("word") || type.includes("docx") ? "DOC" : "TXT"}
    </span>
  );
}

export default function ContractsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [reviewsMap, setReviewsMap] = useState<Record<string, Review>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const [docsRes, revsRes] = await Promise.all([
        fetch(`${BASE}/documents?tenant_id=tenant-demo`),
        fetch(`${BASE}/reviews?tenant_id=tenant-demo`),
      ]);

      if (docsRes.ok) {
        const docs: Document[] = await docsRes.json();
        // Show newest first (reverse chronological)
        docs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setDocuments(docs);
      }

      if (revsRes.ok) {
        const revs: Review[] = await revsRes.json();
        const map: Record<string, Review> = {};
        for (const r of revs) {
          const existing = map[r.document_id];
          if (!existing || new Date(r.created_at) > new Date(existing.created_at)) {
            map[r.document_id] = r;
          }
        }
        setReviewsMap(map);
      }
    } catch (e) {
      setError("No se pudo conectar con el servidor.");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
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
            Mis Contratos
          </h1>
          <p style={{ fontSize: 14, color: "var(--on-surface-variant)", margin: "4px 0 0" }}>
            {documents.length} documento{documents.length !== 1 ? "s" : ""} en tu biblioteca
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
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nuevo Contrato
        </Link>
      </div>

      {/* Content */}
      {loading && (
        <div style={{ textAlign: "center", padding: 48, color: "var(--navy-muted)", fontSize: 14 }}>
          Cargando documentos...
        </div>
      )}

      {error && (
        <div style={{ textAlign: "center", padding: 48 }}>
          <p style={{ color: "var(--risk-high)", fontSize: 14, margin: "0 0 12px" }}>{error}</p>
          <button
            onClick={loadData}
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

      {!loading && !error && documents.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: 64,
            background: "var(--surface-card)",
            border: "1px dashed var(--outline-variant)",
            borderRadius: 8,
          }}
        >
          <span style={{ fontSize: 40, display: "block", marginBottom: 16 }}>📄</span>
          <p
            style={{
              color: "var(--on-surface)",
              fontSize: 15,
              fontWeight: 500,
              margin: "0 0 4px",
            }}
          >
            No tienes contratos todavía
          </p>
          <p style={{ color: "var(--navy-muted)", fontSize: 13, margin: "0 0 20px" }}>
            Sube tu primer contrato para comenzar a revisarlo con IA.
          </p>
          <Link
            href="/app/review/new"
            style={{
              color: "var(--gold)",
              fontWeight: 600,
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            Subir un contrato →
          </Link>
        </div>
      )}

      {!loading && !error && documents.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {documents.map((doc) => {
            const review = reviewsMap[doc.id];
            const risk = review?.result?.overall_risk || review?.status || "pending";
            return (
              <Link
                key={doc.id}
                href={review ? `/app/review/${review.id}` : `/app/review/new?doc=${doc.id}`}
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
                  <FileTypeIcon type={doc.content_type} />
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
                      {doc.filename}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>
                      {new Date(doc.created_at).toLocaleDateString("es-CL", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {review && ` · Revisión ${review.id.slice(0, 8)}...`}
                    </span>
                  </div>
                  {review && (
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: 100,
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        background: RISK_BG[risk] || RISK_BG.pending,
                        color: RISK_COLORS[risk] || RISK_COLORS.pending,
                        textTransform: "uppercase",
                        flexShrink: 0,
                      }}
                    >
                      {risk}
                    </span>
                  )}
                  <span style={{ fontSize: 18, color: "var(--navy-muted)", flexShrink: 0 }}>→</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
