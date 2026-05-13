const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ── Types matching the backend schemas ──

export interface DocumentResponse {
  id: string;
  tenant_id: string;
  filename: string;
  content_type: string;
  text_content: string;
  status: string;
  created_at: string;
}

export interface ClauseAnalysis {
  ref: string;
  title: string;
  text_excerpt: string;
  risk: "bajo" | "medio" | "alto";
  finding: string;
  recommendation: string;
}

export interface AnalysisResult {
  overall_risk: "bajo" | "medio" | "alto";
  clauses: ClauseAnalysis[];
  summary: string;
}

export interface ReviewResponse {
  id: string;
  tenant_id: string;
  document_id: string;
  review_type: string;
  language: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  result: AnalysisResult | null;
  created_at: string;
}

// ── API Client ──

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json();
}

export const api = {
  /** Health check */
  health: () => request<{ status: string; version: string }>("/health"),

  /** Upload a document for analysis */
  createDocument: (data: {
    tenant_id: string;
    filename: string;
    content_type: string;
    text_content: string;
  }) =>
    request<DocumentResponse>("/documents", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /** Get a document by ID */
  getDocument: (id: string, tenant_id: string) =>
    request<DocumentResponse>(`/documents/${id}?tenant_id=${tenant_id}`),

  /** Start a review (triggers background LLM analysis) */
  createReview: (data: {
    tenant_id: string;
    document_id: string;
    review_type: string;
    language: string;
  }) =>
    request<ReviewResponse>("/reviews", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /** Poll for review results */
  getReview: (id: string, tenant_id: string) =>
    request<ReviewResponse>(`/reviews/${id}?tenant_id=${tenant_id}`),

  /** Convenience: upload + review in one call, poll until done */
  async analyzeContract(
    text: string,
    filename: string = "contrato.txt",
    tenant_id: string = "tenant-anon"
  ): Promise<ReviewResponse> {
    // 1. Upload document
    const doc = await this.createDocument({
      tenant_id,
      filename,
      content_type: "text/plain",
      text_content: text,
    });

    // 2. Start review
    const review = await this.createReview({
      tenant_id,
      document_id: doc.id,
      review_type: "commercial",
      language: "es",
    });

    // 3. Poll until completed or failed
    let current = review;
    while (current.status === "pending" || current.status === "in_progress") {
      await new Promise((r) => setTimeout(r, 1000));
      current = await this.getReview(review.id, tenant_id);
    }
    return current;
  },
};
