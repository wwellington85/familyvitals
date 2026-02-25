"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DocumentUploadForm({ profileId }: { profileId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [collectedAt, setCollectedAt] = useState("");
  const [docType, setDocType] = useState("lab");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onUpload(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("collected_at", collectedAt);
    formData.append("doc_type", docType);

    const res = await fetch(`/api/profiles/${profileId}/documents`, { method: "POST", body: formData });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Upload failed");
      setLoading(false);
      return;
    }

    setLoading(false);
    setFile(null);
    router.refresh();
  }

  return (
    <form onSubmit={onUpload} className="space-y-3 rounded-lg border border-border p-4">
      <h3 className="text-sm font-semibold">Upload PDF</h3>
      <div>
        <Label>PDF file</Label>
        <Input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
      </div>
      <div>
        <Label>Collected at</Label>
        <Input type="date" value={collectedAt} onChange={(e) => setCollectedAt(e.target.value)} />
      </div>
      <div>
        <Label>Document type</Label>
        <select className="h-10 w-full rounded-md border border-border bg-background px-3" value={docType} onChange={(e) => setDocType(e.target.value)}>
          <option value="lab">Lab</option>
          <option value="imaging">Imaging</option>
          <option value="note">Note</option>
        </select>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <Button type="submit" disabled={!file || loading}>{loading ? "Uploading..." : "Upload"}</Button>
    </form>
  );
}
