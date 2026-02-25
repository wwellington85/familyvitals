"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type Row = {
  id?: string;
  name: string;
  effective_datetime: string;
  value_number?: number | null;
  value_text?: string | null;
  unit?: string | null;
  reference_low?: number | null;
  reference_high?: number | null;
  flagged?: "H" | "L" | "N" | "U";
  extraction_confidence?: number | null;
  status: "extracted" | "user_edited" | "manual";
};

export function DocumentReviewEditor({
  profileId,
  docId,
  signedPdfUrl,
  canEdit,
  initialRows
}: {
  profileId: string;
  docId: string;
  signedPdfUrl: string | null;
  canEdit: boolean;
  initialRows: Row[];
}) {
  const [rows, setRows] = useState<Row[]>(
    initialRows.length
      ? initialRows
      : [
          {
            name: "",
            effective_datetime: new Date().toISOString(),
            status: "manual",
            flagged: "U"
          }
        ]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const avgConfidence = useMemo(() => {
    const values = rows.map((r) => r.extraction_confidence).filter((v): v is number => typeof v === "number");
    if (!values.length) return null;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }, [rows]);

  function updateRow(index: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch, status: row.status === "manual" ? "manual" : "user_edited" } : row)));
  }

  function addRow() {
    setRows((prev) => [
      ...prev,
      {
        name: "",
        effective_datetime: new Date().toISOString(),
        status: "manual",
        flagged: "U"
      }
    ]);
  }

  async function save(markReviewed: boolean) {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/profiles/${profileId}/documents/${docId}/review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mark_reviewed: markReviewed,
        rows: rows.map((r) => ({
          ...r,
          category: "lab"
        }))
      })
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Save failed");
      setLoading(false);
      return;
    }
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-lg border border-border bg-card p-3">
        {signedPdfUrl ? (
          <iframe src={signedPdfUrl} className="h-[75vh] w-full rounded border" title="PDF" />
        ) : (
          <p className="text-sm text-muted-foreground">Unable to load signed PDF URL.</p>
        )}
      </div>

      <div className="space-y-3 rounded-lg border border-border bg-card p-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Editable Observations</h3>
          <Badge>{avgConfidence == null ? "No confidence" : `Avg conf ${(avgConfidence * 100).toFixed(0)}%`}</Badge>
        </div>
        <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
          {rows.map((row, idx) => (
            <div key={`${row.id ?? "new"}-${idx}`} className="rounded border border-border p-2">
              <div className="grid gap-2 md:grid-cols-2">
                <Input placeholder="Name" value={row.name} disabled={!canEdit} onChange={(e) => updateRow(idx, { name: e.target.value })} />
                <Input
                  type="datetime-local"
                  value={row.effective_datetime.slice(0, 16)}
                  disabled={!canEdit}
                  onChange={(e) => updateRow(idx, { effective_datetime: new Date(e.target.value).toISOString() })}
                />
                <Input
                  placeholder="Value number"
                  value={row.value_number ?? ""}
                  disabled={!canEdit}
                  onChange={(e) => updateRow(idx, { value_number: e.target.value ? Number(e.target.value) : null, value_text: null })}
                />
                <Input
                  placeholder="Value text"
                  value={row.value_text ?? ""}
                  disabled={!canEdit}
                  onChange={(e) => updateRow(idx, { value_text: e.target.value || null, value_number: null })}
                />
                <Input placeholder="Unit" value={row.unit ?? ""} disabled={!canEdit} onChange={(e) => updateRow(idx, { unit: e.target.value || null })} />
                <Input
                  placeholder="Flag H/L/N/U"
                  value={row.flagged ?? "U"}
                  disabled={!canEdit}
                  onChange={(e) => updateRow(idx, { flagged: (e.target.value || "U") as Row["flagged"] })}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>Confidence: {row.extraction_confidence == null ? "manual" : `${(row.extraction_confidence * 100).toFixed(0)}%`}</span>
                {canEdit ? (
                  <button className="text-destructive" onClick={() => setRows((prev) => prev.filter((_, i) => i !== idx))} type="button">
                    Delete
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        {canEdit ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={addRow}>Add row</Button>
            <Button type="button" variant="outline" onClick={() => save(false)} disabled={loading}>Save Draft</Button>
            <Button type="button" onClick={() => save(true)} disabled={loading}>Approve & Mark Reviewed</Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Viewer access: read-only.</p>
        )}
      </div>
    </div>
  );
}
