export type ReviewStatus = "pending" | "in_progress" | "completed" | "failed";
export type ReviewType = "full" | "summary" | "risk_scan";

export interface DocumentCreateRequest {
  filename: string;
  content_type: string;
  text_content: string;
  tenant_id?: string;
}

export interface DocumentResponse {
  id: string;
  filename: string;
  content_type: string;
  tenant_id?: string;
  status: "ingested";
  created_at: string;
}

export interface ReviewCreateRequest {
  document_id: string;
  review_type: ReviewType;
  language: "es-CL";
}

export interface ReviewResponse {
  id: string;
  document_id: string;
  review_type: string;
  language: string;
  status: ReviewStatus;
  created_at: string;
}
