"use client";

import { useState, useRef, type DragEvent } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function NewReviewPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileObj, setFileObj] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "analyzing" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [progressMsg, setProgressMsg] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [contractType, setContractType] = useState("commercial");
  const inputRef = useRef<HTMLInputElement>(null);

  const isPdf = fileName.toLowerCase().endsWith(".pdf") || fileName.toLowerCase().endsWith(".docx");

  const handleFileDrop = (file: File) => {
    setFileName(file.name);
    setFileObj(file);

    // For .txt files, read content into textarea for editing
    if (file.name.toLowerCase().endsWith(".txt")) {
      const reader = new FileReader();
      reader.onload = (e) => setText((e.target?.result as string) || "");
      reader.readAsText(file);
    } else {
      // PDF/DOCX: just show filename, backend extracts text
      setText(`[Archivo: ${file.name} — pendiente de extracción en el servidor]`);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileDrop(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleAnalyze = async () => {
    if (!text.trim() && !fileObj) return;
    setStatus("analyzing");
    setErrorMsg("");
    setProgressMsg("Preparando documento...");

    try {
      let docId: string;

      // 1. Send file or text to backend
      if (fileObj && isPdf) {
        // Upload raw file — backend extracts text
        setProgressMsg("Extrayendo texto del archivo...");
        const formData = new FormData();
        formData.append("tenant_id", "tenant-demo");
        formData.append("file", fileObj);

        const uploadRes = await fetch(`${API_BASE}/documents/upload`, {
          method: "POST",
          body: formData,
        });
        if (!uploadRes.ok) {
          const errText = await uploadRes.text();
          throw new Error(`Error al subir: ${errText}`);
        }
        const doc = await uploadRes.json();
        docId = doc.id;
      } else {
        // Send pasted text or .txt content
        setProgressMsg("Enviando documento...");
        const docRes = await fetch(`${API_BASE}/documents`, {
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
        docId = doc.id;
      }

      // 2. Start analysis
      setProgressMsg("Iniciando análisis con IA...");
      const revRes = await fetch(`${API_BASE}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: "tenant-demo",
          document_id: docId,
          review_type: contractType,
          language: "es",
        }),
      });
      if (!revRes.ok) throw new Error("Error al crear revisión");
      const review = await revRes.json();

      // 3. Poll until done
      setProgressMsg("Analizando contrato...");
      let current = review;
      while (current.status === "pending" || current.status === "in_progress") {
        await new Promise((r) => setTimeout(r, 1500));
        const pollRes = await fetch(
          `${API_BASE}/reviews/${review.id}?tenant_id=tenant-demo`
        );
        if (pollRes.ok) current = await pollRes.json();
      }

      setStatus("done");
      router.push(`/app/review/${review.id}`);
    } catch (e: any) {
      setErrorMsg(e.message || "Error inesperado");
      setStatus("error");
    }
  };

  const canAnalyze = (text.trim() || fileObj) && status !== "analyzing";

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
        Sube un contrato en PDF, DOCX o TXT, o pega el texto directamente.
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
            if (file) handleFileDrop(file);
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
          {dragOver ? "📄" : fileObj ? "✅" : "📁"}
        </span>
        <p style={{ color: "var(--on-surface)", fontSize: 14, fontWeight: 500, margin: "0 0 4px" }}>
          {dragOver ? "Suelta aquí" : fileObj ? `Archivo listo: ${fileName}` : "Arrastra un archivo o haz clic"}
        </p>
        <p style={{ color: "var(--navy-muted)", fontSize: 12, margin: 0 }}>
          {fileObj ? `${(fileObj.size / 1024).toFixed(0)} KB` : "PDF, DOCX o TXT — hasta 10 MB"}
        </p>
        {fileObj && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setFileObj(null);
              setFileName("");
              setText("");
            }}
            style={{
              marginTop: 12,
              background: "none",
              border: "none",
              color: "var(--risk-high)",
              fontSize: 12,
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Quitar archivo
          </button>
        )}
      </div>

      {/* Contract type selector */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 14, fontWeight: 500, color: "var(--navy)", display: "block", marginBottom: 8 }}>
          Tipo de contrato
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { value: "commercial", label: "Comercial", desc: "Compraventa, servicios, distribución" },
            { value: "laboral", label: "Laboral", desc: "Trabajo, honorarios, confidencialidad" },
            { value: "corporate", label: "Societario", desc: "Accionistas, joint venture, fusiones" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setContractType(opt.value)}
              style={{
                flex: "1 1 0",
                minWidth: 140,
                padding: "10px 14px",
                border: `2px solid ${contractType === opt.value ? "var(--gold)" : "var(--outline-variant)"}`,
                borderRadius: 8,
                background: contractType === opt.value ? "rgba(119,90,25,0.06)" : "var(--surface-card)",
                cursor: "pointer",
                textAlign: "left" as const,
                transition: "all 0.15s",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, color: contractType === opt.value ? "var(--gold)" : "var(--navy)", marginBottom: 2 }}>
                {opt.label}
              </div>
              <div style={{ fontSize: 11, color: "var(--navy-muted)", lineHeight: 1.3 }}>
                {opt.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Text area (for .txt or paste) */}
      <div style={{ marginBottom: 16 }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={fileObj && isPdf ? "El texto se extraerá del archivo en el servidor..." : "O pega el texto del contrato aquí..."}
          rows={6}
          readOnly={!!(fileObj && isPdf)}
          style={{
            width: "100%",
            padding: 14,
            border: "1px solid var(--outline-variant)",
            borderRadius: 6,
            fontFamily: "var(--font-body)",
            fontSize: 14,
            lineHeight: 1.6,
            color: "var(--on-surface)",
            background: fileObj && isPdf ? "rgba(4,22,39,0.02)" : "var(--surface-card)",
            resize: "vertical",
            opacity: fileObj && isPdf ? 0.6 : 1,
          }}
        />
      </div>

      {/* Status */}
      {status === "analyzing" && (
        <div
          style={{
            padding: 12,
            background: "rgba(119,90,25,0.06)",
            border: "1px solid rgba(119,90,25,0.15)",
            borderRadius: 6,
            marginBottom: 12,
            fontSize: 14,
            color: "var(--gold)",
            fontWeight: 500,
          }}
        >
          ⏳ {progressMsg}
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
        disabled={!canAnalyze}
        style={{
          width: "100%",
          padding: "14px 24px",
          background: canAnalyze ? "var(--gold)" : "var(--navy-muted)",
          color: "#fff",
          fontWeight: 600,
          fontSize: 15,
          border: "none",
          borderRadius: 6,
          cursor: canAnalyze ? "pointer" : "not-allowed",
          transition: "background 0.2s",
        }}
        onMouseEnter={(e) => {
          if (canAnalyze) e.currentTarget.style.background = "#8a6a20";
        }}
        onMouseLeave={(e) => {
          if (canAnalyze) e.currentTarget.style.background = "var(--gold)";
        }}
      >
        {status === "analyzing" ? "Analizando..." : "Analizar Contrato"}
      </button>
    </div>
  );
}
