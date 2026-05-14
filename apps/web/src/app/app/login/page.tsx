"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { login, register, user, loading } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // If already logged in, redirect to dashboard
  if (user && !loading) {
    try {
      router.replace("/app/dashboard");
    } catch {
      window.location.href = "/legal/app/dashboard";
    }
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
      router.push("/app/dashboard");
    } catch (err: any) {
      setError(err.message || "Error inesperado");
    } finally {
      setSubmitting(false);
    }
  };

  const navigateTo = (path: string) => {
    try {
      router.push(path);
    } catch {
      window.location.href = "/legal" + path;
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
          maxWidth: 400,
          background: "var(--surface-card)",
          border: "1px solid var(--outline-variant)",
          borderRadius: 12,
          padding: 36,
        }}
      >
        {/* Logo */}
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
            {mode === "login"
              ? "Inicia sesión para continuar"
              : "Crea tu cuenta para comenzar"}
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
          {mode === "register" && (
            <div style={{ marginBottom: 16 }}>
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
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Ej: Juan Pérez"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1px solid var(--outline-variant)",
                  borderRadius: 6,
                  fontSize: 14,
                  color: "var(--on-surface)",
                  background: "var(--surface-card)",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                }}
              />
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="ej: contacto@estudio.cl"
              style={{
                width: "100%",
                padding: "10px 14px",
                border: "1px solid var(--outline-variant)",
                borderRadius: 6,
                fontSize: 14,
                color: "var(--on-surface)",
                background: "var(--surface-card)",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Mín. 6 caracteres"
              style={{
                width: "100%",
                padding: "10px 14px",
                border: "1px solid var(--outline-variant)",
                borderRadius: 6,
                fontSize: 14,
                color: "var(--on-surface)",
                background: "var(--surface-card)",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
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
            {submitting
              ? "Procesando..."
              : mode === "login"
                ? "Iniciar Sesión"
                : "Crear Cuenta"}
          </button>
        </form>

        {/* Toggle mode */}
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
            }}
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
            {mode === "login"
              ? "¿No tienes cuenta? Regístrate"
              : "¿Ya tienes cuenta? Inicia sesión"}
          </button>
        </div>

        {/* Multi-tenant onboarding link */}
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <div
            style={{
              borderTop: "1px solid var(--outline-variant)",
              paddingTop: 16,
            }}
          >
            <p style={{ fontSize: 12, color: "var(--navy-muted)", margin: "0 0 8px" }}>
              ¿Eres un estudio jurídico?
            </p>
            <button
              onClick={() => navigateTo("/app/onboarding")}
              style={{
                background: "none",
                border: "1px solid var(--gold)",
                color: "var(--gold)",
                borderRadius: 6,
                padding: "8px 16px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(189,146,38,0.06)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              🏛 Crear Estudio Jurídico
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
