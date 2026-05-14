"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function PaymentReturnPage() {
  const searchParams = useSearchParams();
  const { user, authHeaders } = useAuth();
  const [status, setStatus] = useState<"checking" | "approved" | "pending" | "rejected" | "error">("checking");
  const [message, setMessage] = useState("Verificando tu pago...");

  useEffect(() => {
    if (!user) return;

    const commerceOrder = searchParams.get("commerceOrder");
    const flowStatus = searchParams.get("status"); // Flow redirect param
    const token = searchParams.get("token");

    (async () => {
      try {
        // Wait a moment for the webhook to process
        await new Promise((r) => setTimeout(r, 2000));

        // Check payment status via API
        const res = await fetch(
          `${API_BASE}/pricing/payment-status?commerce_order=${commerceOrder || "unknown"}`,
          { headers: authHeaders() as Record<string, string> }
        );

        if (res.ok) {
          const data = await res.json();
          if (data.status === "approved") {
            setStatus("approved");
            setMessage("¡Pago confirmado! Tu plan Pro ya está activo.");
          } else if (data.status === "pending") {
            setStatus("pending");
            setMessage(
              "El pago está siendo procesado. Si ya realizaste el pago, los cambios se reflejarán en minutos."
            );
          } else {
            setStatus("rejected");
            setMessage(data.message || "El pago no pudo ser procesado.");
          }
        } else {
          setStatus("error");
          setMessage("No pudimos verificar el estado de tu pago. Contacta a soporte.");
        }
      } catch {
        setStatus("error");
        setMessage("Error de conexión al verificar el pago.");
      }
    })();
  }, [user, authHeaders, searchParams]);

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "40px 0" }}>
      <div
        style={{
          background: "var(--surface-card)",
          border: "1px solid var(--outline-variant)",
          borderRadius: 10,
          padding: 40,
          textAlign: "center",
        }}
      >
        {/* Icon */}
        <div style={{ marginBottom: 24 }}>
          {status === "checking" && (
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "rgba(37,99,235,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto",
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--tertiary)" strokeWidth="2">
                <circle cx="12" cy="12" r="10" strokeDasharray="31.4" strokeDashoffset="10" />
              </svg>
            </div>
          )}
          {status === "approved" && (
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "rgba(21,128,61,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto",
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--risk-low)" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          )}
          {status === "pending" && (
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "rgba(212,167,56,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto",
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
          )}
          {(status === "rejected" || status === "error") && (
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "rgba(159,18,57,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto",
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--risk-high)" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
          )}
        </div>

        {/* Title */}
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 20,
            fontWeight: 700,
            color: "var(--navy)",
            margin: "0 0 8px",
          }}
        >
          {status === "approved" && "¡Pago Exitoso!"}
          {status === "pending" && "Pago en Proceso"}
          {status === "rejected" && "Pago Rechazado"}
          {status === "error" && "Error de Verificación"}
          {status === "checking" && "Verificando Pago"}
        </h1>

        {/* Message */}
        <p
          style={{
            fontSize: 14,
            color: "var(--on-surface-variant)",
            margin: "0 0 32px",
            lineHeight: 1.6,
          }}
        >
          {message}
        </p>

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {status === "approved" && (
            <Link
              href="/app/dashboard"
              style={{
                display: "block",
                padding: "12px 24px",
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 13,
                textDecoration: "none",
                background: "var(--gold)",
                color: "#fff",
              }}
            >
              Ir al Dashboard
            </Link>
          )}
          {(status === "pending" || status === "checking") && (
            <button
              onClick={() => window.location.reload()}
              style={{
                display: "block",
                padding: "12px 24px",
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 13,
                border: "none",
                cursor: "pointer",
                background: "var(--tertiary)",
                color: "#fff",
                fontFamily: "inherit",
              }}
            >
              Verificar de nuevo
            </button>
          )}
          {(status === "rejected" || status === "error") && (
            <>
              <Link
                href="/app/pricing"
                style={{
                  display: "block",
                  padding: "12px 24px",
                  borderRadius: 6,
                  fontWeight: 600,
                  fontSize: 13,
                  textDecoration: "none",
                  background: "var(--gold)",
                  color: "#fff",
                }}
              >
                Intentar de nuevo
              </Link>
              <Link
                href="/app/dashboard"
                style={{
                  display: "block",
                  padding: "12px 24px",
                  borderRadius: 6,
                  fontWeight: 500,
                  fontSize: 13,
                  textDecoration: "none",
                  background: "var(--outline-variant)",
                  color: "var(--on-surface)",
                }}
              >
                Volver al Dashboard
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
