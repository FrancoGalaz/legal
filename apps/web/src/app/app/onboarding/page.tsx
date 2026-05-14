"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [firmName, setFirmName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // If already logged in, redirect to dashboard
  if (user && !loading) {
    router.replace("/app/dashboard");
    return null;
  }

  const handleSlugChange = (value: string) => {
    // Auto-generate slug from firm name if slug is empty or matches the previous auto-gen
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-"));
  };

  const handleFirmNameChange = (value: string) => {
    setFirmName(value);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/tenants/onboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firm_name: firmName,
          slug: slug,
          firm_description: description || undefined,
          admin_name: adminName,
          admin_email: adminEmail,
          admin_password: adminPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Error al crear el estudio");
      }

      const data = await res.json();
      localStorage.setItem("legal_agent_token", data.access_token);

      // Fetch user profile
      const meRes = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          Authorization: `Bearer ${data.access_token}`,
          "Content-Type": "application/json",
        },
      });
      if (meRes.ok) {
        router.push("/app/dashboard");
      } else {
        router.push("/app/login");
      }
    } catch (err: any) {
      setError(err.message || "Error inesperado");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--surface)",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          background: "var(--surface-card)",
          border: "1px solid var(--outline-variant)",
          borderRadius: 12,
          padding: 36,
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 22,
              fontWeight: 700,
              color: "var(--navy)",
            }}
          >
            Legal Agent <span style={{ color: "var(--gold)" }}>CL</span>
          </div>
          <p style={{ fontSize: 13, color: "var(--navy-muted)", margin: "4px 0 0" }}>
            Crea tu estudio jurídico para comenzar
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              padding: "10px 14px",
              background: "rgba(159,18,57,0.06)",
              border: "1px solid rgba(159,18,57,0.15)",
              borderRadius: 6,
              marginBottom: 16,
              fontSize: 13,
              color: "var(--risk-high)",
            }}
          >
            ⚠ {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Firm info */}
          <div style={{ marginBottom: 20 }}>
            <h3
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "var(--navy)",
                margin: "0 0 16px",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Información del Estudio
            </h3>

            <div style={{ marginBottom: 14 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--navy)",
                  marginBottom: 6,
                }}
              >
                Nombre del estudio jurídico
              </label>
              <input
                type="text"
                value={firmName}
                onChange={(e) => handleFirmNameChange(e.target.value)}
                required
                placeholder="Ej: Estudio Jurídico Pérez & Cía."
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--navy)",
                  marginBottom: 6,
                }}
              >
                Slug único
              </label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  border: "1px solid var(--outline-variant)",
                  borderRadius: 6,
                  padding: "0 12px",
                  background: "var(--surface-card)",
                }}
              >
                <span style={{ fontSize: 13, color: "var(--navy-muted)", whiteSpace: "nowrap" }}>
                  legalagent.cl/
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  required
                  placeholder="mi-estudio"
                  style={{
                    ...inputStyle,
                    border: "none",
                    padding: "10px 0",
                    flex: 1,
                  }}
                />
              </div>
              <p style={{ fontSize: 11, color: "var(--navy-muted)", margin: "4px 0 0" }}>
                Solo letras minúsculas, números y guiones
              </p>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--navy)",
                  marginBottom: 6,
                }}
              >
                Descripción (opcional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej: Estudio jurídico especializado en derecho corporativo y comercial"
                rows={2}
                style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
              />
            </div>
          </div>

          {/* Admin info */}
          <div
            style={{
              borderTop: "1px solid var(--outline-variant)",
              paddingTop: 20,
              marginBottom: 20,
            }}
          >
            <h3
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "var(--navy)",
                margin: "0 0 16px",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Administrador del Estudio
            </h3>

            <div style={{ marginBottom: 14 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--navy)",
                  marginBottom: 6,
                }}
              >
                Nombre completo
              </label>
              <input
                type="text"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                required
                placeholder="Ej: Juan Pérez"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--navy)",
                  marginBottom: 6,
                }}
              >
                Correo electrónico
              </label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required
                placeholder="ej: juan@estudio.cl"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--navy)",
                  marginBottom: 6,
                }}
              >
                Contraseña
              </label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Mín. 6 caracteres"
                style={inputStyle}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: "100%",
              padding: "12px 24px",
              background: submitting ? "var(--navy-muted)" : "var(--gold)",
              color: "#fff",
              fontWeight: 600,
              fontSize: 14,
              border: "none",
              borderRadius: 6,
              cursor: submitting ? "not-allowed" : "pointer",
              transition: "background 0.2s",
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) => {
              if (!submitting) e.currentTarget.style.background = "#8a6a20";
            }}
            onMouseLeave={(e) => {
              if (!submitting) e.currentTarget.style.background = "var(--gold)";
            }}
          >
            {submitting ? "Creando estudio..." : "Crear Estudio Jurídico"}
          </button>
        </form>

        {/* Link to login */}
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <span style={{ fontSize: 13, color: "var(--navy-muted)" }}>
            ¿Ya tienes un estudio?{" "}
          </span>
          <button
            onClick={() => router.push("/app/login")}
            style={{
              background: "none",
              border: "none",
              color: "var(--gold)",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Inicia sesión
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  border: "1px solid var(--outline-variant)",
  borderRadius: 6,
  fontSize: 14,
  color: "var(--on-surface)",
  background: "var(--surface-card)",
  fontFamily: "inherit",
  boxSizing: "border-box",
};
