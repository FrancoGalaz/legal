import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Legal Agent CL",
  description: "Chilean legal AI — contract review, simplified.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-CL">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
