"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MedicalDisclaimer } from "@/components/disclaimer";

export function GenerateSnapshot({ profileId }: { profileId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/profiles/${profileId}/share`, { method: "POST" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to generate snapshot");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setShareUrl(data.share_url);
    setPdfUrl(data.pdf_url ?? null);
    setLoading(false);
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <Button onClick={generate} disabled={loading}>{loading ? "Generating..." : "Generate Doctor Snapshot"}</Button>
      <MedicalDisclaimer />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {shareUrl ? (
        <div className="space-y-1 text-sm">
          <p>Share link: <a className="text-primary underline" href={shareUrl}>{shareUrl}</a></p>
          {pdfUrl ? <p>PDF: <a className="text-primary underline" href={pdfUrl}>Download snapshot PDF</a></p> : null}
        </div>
      ) : null}
    </div>
  );
}
