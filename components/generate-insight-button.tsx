"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MedicalDisclaimer } from "@/components/disclaimer";

export function GenerateInsightButton({ profileId }: { profileId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function generate() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/ai/insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile_id: profileId, selected_metrics: ["weight", "heart_rate", "glucose", "blood_pressure"] })
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to generate insight");
      setLoading(false);
      return;
    }
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <Button onClick={generate} disabled={loading}>{loading ? "Generating..." : "Generate AI Insight"}</Button>
      <MedicalDisclaimer />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
