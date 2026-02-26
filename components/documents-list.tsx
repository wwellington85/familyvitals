"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Doc = {
  id: string;
  filename: string;
  status: "uploaded" | "extracting" | "extracted" | "reviewed" | "error";
  created_at: string;
  doc_type: string | null;
  extracted_json?: { method?: string } | null;
};

export function DocumentsList({ profileId, docs, canEdit }: { profileId: string; docs: Doc[]; canEdit: boolean }) {
  const router = useRouter();
  const [busyDocId, setBusyDocId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function triggerExtract(docId: string, mode: "ai" | "regex") {
    setBusyDocId(docId);
    setError(null);

    const res = await fetch(`/api/profiles/${profileId}/documents/${docId}/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode })
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error ?? "Extraction failed");
      setBusyDocId(null);
      return;
    }

    setBusyDocId(null);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {docs.map((doc) => (
        <div key={doc.id} className="rounded border border-border p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">{doc.filename}</p>
              <p className="text-xs text-muted-foreground">{doc.doc_type} • {format(new Date(doc.created_at), "PPp")}</p>
            </div>
            <Badge>{doc.status}</Badge>
          </div>
          {doc.extracted_json?.method ? (
            <p className="mt-1 text-xs text-muted-foreground">Method: {doc.extracted_json.method.toUpperCase()}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2">
            <Link href={`/profiles/${profileId}/documents/${doc.id}/review`} className="inline-flex">
              <Button size="sm" variant="outline">Open Review</Button>
            </Link>
            {canEdit && ["uploaded", "extracting", "error"].includes(doc.status) ? (
              <>
                <Button size="sm" onClick={() => triggerExtract(doc.id, "ai")} disabled={busyDocId === doc.id}>
                  {busyDocId === doc.id ? "Running..." : "Run AI Extract"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => triggerExtract(doc.id, "regex")} disabled={busyDocId === doc.id}>
                  {busyDocId === doc.id ? "Running..." : "Run Basic Extract"}
                </Button>
              </>
            ) : null}
          </div>
          {doc.status === "extracting" ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Extraction is in progress. If it appears stuck, use Retry Extraction.
            </p>
          ) : null}
        </div>
      ))}
      {docs.length === 0 ? <p className="text-sm text-muted-foreground">No documents yet.</p> : null}
    </div>
  );
}
