const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const steps = [
  {
    title: "1. Subir contrato",
    description:
      "Carga un contrato comercial chileno en texto, PDF o DOCX para iniciar la revisión.",
  },
  {
    title: "2. Ejecutar revisión",
    description:
      "El backend prepara un review pendiente para clasificar riesgos, cláusulas y observaciones.",
  },
  {
    title: "3. Recibir hallazgos",
    description:
      "El equipo legal recibe un resultado estructurado con severidad, fundamento y acciones sugeridas.",
  },
];

export default function HomePage() {
  return (
    <main style={{ padding: "2rem", maxWidth: 880, margin: "0 auto", fontFamily: "Arial, sans-serif" }}>
      <section style={{ marginBottom: "2rem" }}>
        <p style={{ fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase", color: "#666" }}>
          Legal Agent CL · MVP
        </p>
        <h1 style={{ marginBottom: "0.75rem" }}>Revisión legal de contratos comerciales chilenos</h1>
        <p style={{ fontSize: "1.05rem", lineHeight: 1.6, color: "#333" }}>
          SaaS legal multi-tenant orientado a intake documental, revisión asistida y generación de
          hallazgos para estudios jurídicos y equipos in-house en Chile.
        </p>
      </section>

      <section style={{ marginBottom: "2rem", padding: "1rem", border: "1px solid #ddd", borderRadius: 10, background: "#fafafa" }}>
        <strong>API base URL:</strong> <code>{apiBaseUrl}</code>
      </section>

      <section>
        <h2 style={{ marginBottom: "1rem" }}>Flujo esperado del MVP</h2>
        <div style={{ display: "grid", gap: "1rem" }}>
          {steps.map((step) => (
            <article key={step.title} style={{ border: "1px solid #e5e5e5", borderRadius: 12, padding: "1rem" }}>
              <h3 style={{ marginTop: 0 }}>{step.title}</h3>
              <p style={{ marginBottom: 0, lineHeight: 1.5 }}>{step.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
