"use client";

import { useState, useRef, type DragEvent } from "react";
import { useRouter } from "next/navigation";

export default function NewReviewPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState<"idle" | "uploading" | "analyzing" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [progressMsg, setProgressMsg] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setFileName(file.name);
    setStatus("uploading");
    setProgressMsg("Leyendo archivo...");

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      setText(content);
      setStatus("idle");
    };
    reader.onerror = () => {
      setErrorMsg("Error al leer el archivo");
      setStatus("error");
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    setStatus("analyzing");
    setErrorMsg("");
    setProgressMsg("Enviando documento...");

    try {
      // 1. Create document
      const docRes = await fetch("http://localhost:8000/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: "tenant-demo",
          filename: fileName || "contrato.txt",
          content_type: "text/plain",
          text_content: text,
        }),
      });
      if (!docRes.ok) throw new Error("Error al crear documento");
      const doc = await docRes.json();
      setProgressMsg("Iniciando análisis con IA...");

      // 2. Create review
      const revRes = await fetch("http://localhost:8000/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: "tenant-demo",
          document_id: doc.id,
          review_type: "commercial",
          language: "es",
        }),
      });
      if (!revRes.ok) throw new Error("Error al crear revisión");
      const review = await revRes.json();

      setProgressMsg("Analizando contrato...");

      // 3. Poll for completion
      let current = review;
      while (current.status === "pending" || current.status === "in_progress") {
        await new Promise((r) => setTimeout(r, 1500));
        const pollRes = await fetch(
          `http://localhost:8000/reviews/${review.id}?tenant_id=tenant-demo`
        );
        if (pollRes.ok) {
          current = await pollRes.json();
        }
      }

      // 4. Redirect to results
      setStatus("done");
      router.push(`/app/review/${review.id}`);
    } catch (e: any) {
      setErrorMsg(e.message || "Error inesperado");
      setStatus("error");
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 24,
          fontWeight: 600,
          color: "var(--navy)",
          margin: "0 0 4px",
        }}
      >
        Nuevo Análisis
      </h1>
      <p style={{ fontSize: 14, color: "var(--on-surface-variant)", margin: "0 0 24px" }}>
        Sube un archivo o pega el texto del contrato para analizarlo con IA.
      </p>

      {/* Upload zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragOver(false)}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? "var(--gold)" : "var(--outline-variant)"}`,
          borderRadius: 8,
          padding: "40px 24px",
          textAlign: "center",
          cursor: "pointer",
          background: dragOver ? "rgba(119,90,25,0.04)" : "var(--surface-card)",
          transition: "all 0.2s",
          marginBottom: 16,
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.pdf,.docx,.doc"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <span
          style={{
            fontSize: 36,
            display: "block",
            marginBottom: 12,
            color: dragOver ? "var(--gold)" : "var(--navy-muted)",
          }}
        >
          {dragOver ? "📄" : "📁"}
        </span>
        <p style={{ color: "var(--on-surface)", fontSize: 14, fontWeight: 500, margin: "0 0 4px" }}>
          {dragOver ? "Suelta aquí" : "Arrastra un archivo o haz clic"}
        </p>
        <p style={{ color: "var(--navy-muted)", fontSize: 12, margin: 0 }}>
          PDF, DOCX o TXT
        </p>
        {fileName && (
          <p style={{ color: "var(--gold)", fontSize: 13, margin: "12px 0 0", fontWeight: 500 }}>
            ✓ {fileName}
          </p>
        )}
      </div>

      {/* Text area */}
      <div style={{ marginBottom: 16 }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="O pega el texto del contrato aquí..."
          rows={8}
          style={{
            width: "100%",
            padding: 14,
            border: "1px solid var(--outline-variant)",
            borderRadius: 6,
            fontFamily: "var(--font-body)",
            fontSize: 14,
            lineHeight: 1.6,
            color: "var(--on-surface)",
            background: "var(--surface-card)",
            resize: "vertical",
          }}
        />
      </div>

      {/* Status / Error */}
      {status === "analyzing" && (
        <div
          style={{
            padding: 12,
            background: "rgba(119,90,25,0.06)",
            border: "1px solid rgba(119,90,25,0.15)",
            borderRadius: 6,
            marginBottom: 12,
            fontSize: 14,
            color: "var(--gold-container)",
          }}
        >
          <span style={{ fontWeight: 600 }}>⏳ {progressMsg}</span>
        </div>
      )}

      {status === "error" && (
        <div
          style={{
            padding: 12,
            background: "rgba(159,18,57,0.06)",
            border: "1px solid rgba(159,18,57,0.15)",
            borderRadius: 6,
            marginBottom: 12,
            fontSize: 14,
            color: "var(--risk-high)",
          }}
        >
          ⚠ {errorMsg}
        </div>
      )}

      {/* Analyze button */}
      <button
        onClick={handleAnalyze}
        disabled={!text.trim() || status === "analyzing"}
        style={{
          width: "100%",
          padding: "14px 24px",
          background:
            !text.trim() || status === "analyzing"
              ? "var(--navy-muted)"
              : "var(--gold)",
          color: "#fff",
          fontWeight: 600,
          fontSize: 15,
          border: "none",
          borderRadius: 6,
          cursor:
            !text.trim() || status === "analyzing" ? "not-allowed" : "pointer",
          transition: "background 0.2s",
        }}
        onMouseEnter={(e) => {
          if (text.trim() && status !== "analyzing")
            e.currentTarget.style.background = "#8a6a20";
        }}
        onMouseLeave={(e) => {
          if (text.trim() && status !== "analyzing")
            e.currentTarget.style.background = "var(--gold)";
        }}
      >
        {status === "analyzing" ? "Analizando..." : "Analizar Contrato"}
      </button>
    </div>
  );
}
