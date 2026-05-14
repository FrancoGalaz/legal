"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Member {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
  plan: string;
  created_at: string;
  is_owner: boolean;
}

interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  owner_id: string;
  member_count: number;
  is_active: boolean;
  created_at: string;
}

export default function TeamPage() {
  const router = useRouter();
  const { user, authHeaders } = useAuth();
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Add member form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const headers = authHeaders();
      const [tenantRes, membersRes] = await Promise.all([
        fetch(`${API_BASE}/tenants/me`, { headers }),
        fetch(`${API_BASE}/tenants/members`, { headers }),
      ]);
      if (tenantRes.ok) setTenant(await tenantRes.json());
      else setError("Error al cargar información del estudio");
      if (membersRes.ok) setMembers(await membersRes.json());
    } catch (err: any) {
      setError(err.message || "Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");
    setAdding(true);
    try {
      const headers = authHeaders();
      const res = await fetch(`${API_BASE}/tenants/members`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail, name: newName }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Error al agregar miembro");
      }
      setNewName("");
      setNewEmail("");
      setShowAddForm(false);
      await loadData(); // Reload members list
    } catch (err: any) {
      setAddError(err.message || "Error inesperado");
    } finally {
      setAdding(false);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 60, color: "var(--navy-muted)", fontSize: 14 }}>
        Cargando...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: "20px",
          background: "rgba(159,18,57,0.06)",
          border: "1px solid rgba(159,18,57,0.15)",
          borderRadius: 8,
          color: "var(--risk-high)",
          fontSize: 14,
        }}
      >
        ⚠ {error}
      </div>
    );
  }

  const isOwner = tenant?.owner_id === user.id;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--navy)", margin: 0 }}>
          Mi Estudio
        </h1>
        <p style={{ fontSize: 13, color: "var(--navy-muted)", margin: "4px 0 0" }}>
          {tenant?.name || "Cargando..."}
          {tenant?.slug && (
            <span style={{ color: "var(--outline-variant)" }}>
              {" "}· {tenant.slug}
            </span>
          )}
        </p>
      </div>

      {/* Tenant info card */}
      {tenant && (
        <div
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--outline-variant)",
            borderRadius: 10,
            padding: 24,
            marginBottom: 24,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--navy)", margin: 0 }}>
                {tenant.name}
              </h2>
              {tenant.description && (
                <p style={{ fontSize: 13, color: "var(--on-surface-variant)", margin: "4px 0 0" }}>
                  {tenant.description}
                </p>
              )}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                background: "rgba(37,99,235,0.06)",
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                color: "var(--primary)",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span>{tenant.member_count} {tenant.member_count === 1 ? "miembro" : "miembros"}</span>
            </div>
          </div>
        </div>
      )}

      {/* Members section */}
      <div
        style={{
          background: "var(--surface-card)",
          border: "1px solid var(--outline-variant)",
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        {/* Section header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 24px",
            borderBottom: "1px solid var(--outline-variant)",
          }}
        >
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--navy)", margin: 0 }}>
            Miembros del Estudio
          </h3>
          {isOwner && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              style={{
                background: "var(--gold)",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "8px 16px",
                fontWeight: 600,
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {showAddForm ? "Cancelar" : "+ Agregar Miembro"}
            </button>
          )}
        </div>

        {/* Add member form */}
        {showAddForm && (
          <div
            style={{
              padding: "16px 24px",
              background: "rgba(37,99,235,0.03)",
              borderBottom: "1px solid var(--outline-variant)",
            }}
          >
            <form onSubmit={handleAddMember}>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  placeholder="Nombre completo"
                  style={{
                    flex: 1,
                    minWidth: 180,
                    padding: "8px 12px",
                    border: "1px solid var(--outline-variant)",
                    borderRadius: 6,
                    fontSize: 13,
                    fontFamily: "inherit",
                    background: "var(--surface-card)",
                    color: "var(--on-surface)",
                  }}
                />
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                  placeholder="correo@estudio.cl"
                  style={{
                    flex: 1,
                    minWidth: 200,
                    padding: "8px 12px",
                    border: "1px solid var(--outline-variant)",
                    borderRadius: 6,
                    fontSize: 13,
                    fontFamily: "inherit",
                    background: "var(--surface-card)",
                    color: "var(--on-surface)",
                  }}
                />
                <button
                  type="submit"
                  disabled={adding}
                  style={{
                    background: adding ? "var(--navy-muted)" : "var(--primary)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    padding: "8px 16px",
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: adding ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                    whiteSpace: "nowrap",
                  }}
                >
                  {adding ? "Agregando..." : "Agregar"}
                </button>
              </div>
              {addError && (
                <p style={{ fontSize: 12, color: "var(--risk-high)", margin: "8px 0 0" }}>
                  ⚠ {addError}
                </p>
              )}
              <p style={{ fontSize: 11, color: "var(--navy-muted)", margin: "8px 0 0" }}>
                El nuevo miembro recibirá un enlace para establecer su contraseña.
              </p>
            </form>
          </div>
        )}

        {/* Members list */}
        {members.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--navy-muted)", fontSize: 14 }}>
            No hay miembros en este estudio.
          </div>
        ) : (
          members.map((member, idx) => (
            <div
              key={member.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 24px",
                borderBottom: idx < members.length - 1 ? "1px solid var(--outline-variant)" : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: member.is_owner ? "var(--gold)" : "var(--primary)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 700,
                    fontFamily: "var(--font-display)",
                    flexShrink: 0,
                  }}
                >
                  {member.name
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
                <div>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: "var(--on-surface)",
                      display: "block",
                    }}
                  >
                    {member.name}
                    {member.is_owner && (
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 10,
                          fontWeight: 700,
                          color: "var(--gold)",
                          textTransform: "uppercase",
                        }}
                      >
                        Admin
                      </span>
                    )}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--navy-muted)" }}>
                    {member.email}
                  </span>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: member.is_active ? "var(--success)" : "var(--risk-high)",
                    display: "block",
                  }}
                >
                  {member.is_active ? "Activo" : "Inactivo"}
                </span>
                <span style={{ fontSize: 11, color: "var(--navy-muted)" }}>
                  Plan {member.plan === "pro" ? "Pro" : "Gratuito"}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
