"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

interface Feature {
  text: string;
  included: boolean;
}

interface Plan {
  id: string;
  name: string;
  description: string;
  price_monthly_clp: number;
  price_monthly_usd: number;
  reviews_limit: number | null;
  documents_limit: number | null;
  features: Feature[];
}

interface PlanInfo {
  current_plan: string;
  plan_label: string;
  reviews_used: number;
  reviews_limit: number | null;
  reviews_remaining: number | null;
  monthly_price_clp: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function formatPrice(clp: number): string {
  if (clp === 0) return "Gratis";
  return `$${clp.toLocaleString("es-CL")}/mes`;
}

export default function PricingPage() {
  const { user, authHeaders } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [plansRes, planRes] = await Promise.all([
          fetch(`${API_BASE}/pricing/plans`),
          user
            ? fetch(`${API_BASE}/pricing/my-plan`, {
                headers: authHeaders() as Record<string, string>,
              }).catch(() => null)
            : null,
        ]);
        if (plansRes.ok) setPlans(await plansRes.json());
        if (planRes && planRes.ok) {
          setPlanInfo(await planRes.json());
        }
      } catch {
        // silent
      }
      setLoading(false);
    })();
  }, [user, authHeaders]);

  const handleUpgrade = async (planId: string) => {
    if (!user) return;

    if (planId === "free") {
      // Downgrade to free is direct (no payment needed)
      await handleDirectUpgrade(planId);
      return;
    }

    // Pro plan: create Flow checkout and redirect
    setActionLoading(planId);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/pricing/create-checkout`, {
        method: "POST",
        headers: {
          ...(authHeaders() as Record<string, string>),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan: planId }),
      });
      if (res.ok) {
        const data = await res.json();
        // Redirect user to Flow/Webpay checkout
        window.location.href = data.payment_url;
      } else {
        const err = await res.json().catch(() => ({ detail: "Error al crear el pago" }));
        setMessage({ type: "error", text: err.detail || "Error al crear el pago" });
      }
    } catch {
      setMessage({ type: "error", text: "Error de conexión" });
    }
    setActionLoading(null);
  };

  const handleDirectUpgrade = async (planId: string) => {
    setActionLoading(planId);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/pricing/upgrade`, {
        method: "POST",
        headers: {
          ...(authHeaders() as Record<string, string>),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan: planId }),
      });
      if (res.ok) {
        const data = await res.json();
        setPlanInfo(data);
        setMessage({ type: "success", text: `Plan actualizado a ${data.plan_label}` });
        window.location.reload();
      } else {
        const err = await res.json().catch(() => ({ detail: "Error al actualizar plan" }));
        setMessage({ type: "error", text: err.detail || "Error al actualizar plan" });
      }
    } catch {
      setMessage({ type: "error", text: "Error de conexión" });
    }
    setActionLoading(null);
  };

  const currentPlanId = planInfo?.current_plan || "free";

  return (
    <div>
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg, var(--navy) 0%, #0a2640 100%)",
          borderRadius: 10,
          padding: "28px 32px",
          marginBottom: 28,
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 22,
            fontWeight: 600,
            color: "#fff",
            margin: "0 0 6px",
          }}
        >
          Planes y Precios
        </h1>
        <p style={{ fontSize: 14, color: "var(--navy-muted)", margin: 0, lineHeight: 1.5 }}>
          Elige el plan que mejor se adapte a tus necesidades. Todos los planes incluyen análisis con IA
          especializada en derecho chileno. Pago seguro vía Flow / Webpay.
        </p>
      </div>

      {/* Usage info */}
      {planInfo && planInfo.current_plan === "free" && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 6,
            marginBottom: 20,
            fontSize: 13,
            background: "rgba(37,99,235,0.08)",
            color: "var(--tertiary)",
            border: "1px solid rgba(37,99,235,0.15)",
          }}
        >
          Has usado {planInfo.reviews_used} de {planInfo.reviews_limit} revisiones este mes.
          {planInfo.reviews_remaining !== null && planInfo.reviews_remaining > 0
            ? ` Te quedan ${planInfo.reviews_remaining}.`
            : planInfo.reviews_remaining === 0
            ? " Actualiza a Pro para seguir usando el servicio."
            : ""}
        </div>
      )}

      {/* Message */}
      {message && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 6,
            marginBottom: 20,
            fontSize: 13,
            fontWeight: 500,
            background: message.type === "success" ? "rgba(21,128,61,0.1)" : "rgba(159,18,57,0.1)",
            color: message.type === "success" ? "var(--risk-low)" : "var(--risk-high)",
            border: `1px solid ${
              message.type === "success" ? "rgba(21,128,61,0.2)" : "rgba(159,18,57,0.2)"
            }`,
          }}
        >
          {message.text}
        </div>
      )}

      {/* Plan cards */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--navy-muted)", fontSize: 14 }}>
          Cargando planes...
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 24 }}>
          {plans.map((plan) => {
            const isCurrent = currentPlanId === plan.id;
            const isPro = plan.id === "pro";
            return (
              <div
                key={plan.id}
                style={{
                  background: isCurrent
                    ? "linear-gradient(135deg, var(--surface-card) 0%, rgba(37,99,235,0.03) 100%)"
                    : "var(--surface-card)",
                  border: `1px solid ${
                    isCurrent ? "var(--gold)" : "var(--outline-variant)"
                  }`,
                  borderRadius: 10,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                {/* Current plan badge */}
                {isCurrent && (
                  <span
                    style={{
                      position: "absolute",
                      top: 12,
                      right: 12,
                      padding: "3px 10px",
                      borderRadius: 100,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      background: "var(--gold)",
                      color: "#fff",
                    }}
                  >
                    Plan Actual
                  </span>
                )}

                <div style={{ padding: 28 }}>
                  {/* Plan name */}
                  <h2
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 18,
                      fontWeight: 700,
                      color: "var(--navy)",
                      margin: "0 0 4px",
                    }}
                  >
                    {plan.name}
                  </h2>
                  <p style={{ fontSize: 13, color: "var(--on-surface-variant)", margin: "0 0 16px" }}>
                    {plan.description}
                  </p>

                  {/* Price */}
                  <div style={{ marginBottom: 20 }}>
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 32,
                        fontWeight: 700,
                        color: "var(--navy)",
                      }}
                    >
                      {formatPrice(plan.price_monthly_clp)}
                    </span>
                  </div>

                  {/* Limits */}
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      marginBottom: 20,
                      fontSize: 12,
                      color: "var(--on-surface-variant)",
                    }}
                  >
                    <span>
                      {plan.reviews_limit === null
                        ? "Revisiones ilimitadas"
                        : `Hasta ${plan.reviews_limit} revisiones/mes`}
                    </span>
                  </div>

                  {/* Features */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
                    {plan.features.map((f, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                        <span
                          style={{
                            color: f.included ? "var(--risk-low)" : "var(--navy-muted)",
                            opacity: f.included ? 1 : 0.4,
                          }}
                        >
                          {f.included ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          )}
                        </span>
                        <span
                          style={{
                            color: f.included ? "var(--on-surface)" : "var(--navy-muted)",
                            opacity: f.included ? 1 : 0.5,
                          }}
                        >
                          {f.text}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Action button */}
                  {!user ? (
                    <Link
                      href="/app/login"
                      style={{
                        display: "block",
                        textAlign: "center",
                        padding: "12px 24px",
                        borderRadius: 6,
                        fontWeight: 600,
                        fontSize: 13,
                        textDecoration: "none",
                        background: isFree(plan) ? "var(--outline-variant)" : "var(--gold)",
                        color: isFree(plan) ? "var(--on-surface)" : "#fff",
                        transition: "background 0.2s",
                      }}
                    >
                      {isFree(plan) ? "Comenzar Gratis" : "Inicia Sesión"}
                    </Link>
                  ) : isCurrent ? (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "12px 24px",
                        borderRadius: 6,
                        fontWeight: 500,
                        fontSize: 13,
                        background: "rgba(37,99,235,0.08)",
                        color: "var(--tertiary)",
                      }}
                    >
                      {isPro ? "Plan actual — Pro" : "Plan actual — Gratuito"}
                    </div>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={actionLoading === plan.id}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "center",
                        padding: "12px 24px",
                        borderRadius: 6,
                        fontWeight: 600,
                        fontSize: 13,
                        border: "none",
                        cursor: actionLoading === plan.id ? "wait" : "pointer",
                        background: isFree(plan) ? "var(--outline-variant)" : "var(--gold)",
                        color: isFree(plan) ? "var(--on-surface)" : "#fff",
                        fontFamily: "inherit",
                        opacity: actionLoading === plan.id ? 0.6 : 1,
                        transition: "background 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        if (!isFree(plan) && actionLoading !== plan.id)
                          e.currentTarget.style.background = "#8a6a20";
                      }}
                      onMouseLeave={(e) => {
                        if (!isFree(plan))
                          e.currentTarget.style.background = "var(--gold)";
                      }}
                    >
                      {actionLoading === plan.id
                        ? "Procesando..."
                        : isPro
                        ? "Actualizar a Pro — $19.900/mes"
                        : "Degradar a Gratuito"}
                    </button>
                  )}

                  {/* Payment method badge for Pro */}
                  {isPro && !isCurrent && (
                    <div
                      style={{
                        marginTop: 12,
                        textAlign: "center",
                        fontSize: 11,
                        color: "var(--on-surface-variant)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="1" y="6" width="22" height="12" rx="2" />
                        <line x1="1" y1="10" x2="23" y2="10" />
                      </svg>
                      Pago seguro vía Flow / Webpay — Tarjeta, débito o transferencia
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function isFree(plan: Plan): boolean {
  return plan.id === "free";
}
