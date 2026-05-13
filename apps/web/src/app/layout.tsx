import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Legal Agent CL — Revisión de Contratos con IA",
  description:
    "SaaS legal chileno. Analiza contratos comerciales con inteligencia artificial. Detecta riesgos, identifica cláusulas problemáticas y genera reportes accionables.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-CL">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Domine:wght@400;500;600;700&family=Hanken+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
