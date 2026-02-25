"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function VitalsForm({ profileId }: { profileId: string }) {
  const [measuredAt, setMeasuredAt] = useState(new Date().toISOString().slice(0, 16));
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [weight, setWeight] = useState("");
  const [glucose, setGlucose] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/profiles/${profileId}/vitals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        measured_at: new Date(measuredAt).toISOString(),
        systolic: systolic ? Number(systolic) : null,
        diastolic: diastolic ? Number(diastolic) : null,
        heart_rate: heartRate ? Number(heartRate) : null,
        weight: weight ? Number(weight) : null,
        glucose: glucose ? Number(glucose) : null
      })
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to save vitals");
      setLoading(false);
      return;
    }

    setLoading(false);
    router.push(`/profiles/${profileId}/vitals`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <Label>Measured at</Label>
        <Input type="datetime-local" value={measuredAt} onChange={(e) => setMeasuredAt(e.target.value)} required />
      </div>
      <div>
        <Label>BP Systolic</Label>
        <Input value={systolic} onChange={(e) => setSystolic(e.target.value)} />
      </div>
      <div>
        <Label>BP Diastolic</Label>
        <Input value={diastolic} onChange={(e) => setDiastolic(e.target.value)} />
      </div>
      <div>
        <Label>Heart Rate</Label>
        <Input value={heartRate} onChange={(e) => setHeartRate(e.target.value)} />
      </div>
      <div>
        <Label>Weight</Label>
        <Input value={weight} onChange={(e) => setWeight(e.target.value)} />
      </div>
      <div>
        <Label>Glucose</Label>
        <Input value={glucose} onChange={(e) => setGlucose(e.target.value)} />
      </div>
      {error ? <p className="md:col-span-2 text-xs text-destructive">{error}</p> : null}
      <div className="md:col-span-2">
        <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Vitals"}</Button>
      </div>
    </form>
  );
}
