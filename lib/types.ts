export type Role = "owner" | "editor" | "viewer";

export type ObservationInput = {
  id?: string;
  name: string;
  category: "lab" | "vital";
  effective_datetime: string;
  value_number?: number | null;
  value_text?: string | null;
  unit?: string | null;
  reference_low?: number | null;
  reference_high?: number | null;
  flagged?: "H" | "L" | "N" | "U";
  extraction_confidence?: number | null;
  status: "extracted" | "user_edited" | "manual";
  notes?: string | null;
};
