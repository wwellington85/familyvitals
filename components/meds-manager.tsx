"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Med = {
  id: string;
  medication_name: string;
  indication: string | null;
  events: Array<{ id: string; event_type: string; event_date: string; dosage: string | null; frequency: string | null }>;
};

export function MedsManager({ profileId, canEdit, meds }: { profileId: string; canEdit: boolean; meds: Med[] }) {
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function addMedication(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/profiles/${profileId}/meds`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ medication_name: name, start_dosage: dosage || null, start_frequency: frequency || null })
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to add medication");
      setLoading(false);
      return;
    }
    setLoading(false);
    setName("");
    setDosage("");
    setFrequency("");
    router.refresh();
  }

  async function addEvent(medId: string, eventType: "dose_change" | "stop", dose?: string) {
    const res = await fetch(`/api/profiles/${profileId}/meds/${medId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_type: eventType, dosage: dose || null, event_date: new Date().toISOString().slice(0, 10) })
    });
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-5">
      {canEdit ? (
        <form onSubmit={addMedication} className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-3">
          <div>
            <Label>Medication</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label>Start dosage</Label>
            <Input value={dosage} onChange={(e) => setDosage(e.target.value)} />
          </div>
          <div>
            <Label>Frequency</Label>
            <Input value={frequency} onChange={(e) => setFrequency(e.target.value)} />
          </div>
          <div className="md:col-span-3">
            {error ? <p className="mb-2 text-xs text-destructive">{error}</p> : null}
            <Button type="submit" disabled={loading}>{loading ? "Adding..." : "Add Medication + Start Event"}</Button>
          </div>
        </form>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {meds.map((med) => {
          const latest = [...med.events].sort((a, b) => b.event_date.localeCompare(a.event_date))[0];
          const active = latest ? !["stop", "pause"].includes(latest.event_type) : false;
          return (
            <div key={med.id} className="rounded-lg border border-border bg-card p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold">{med.medication_name}</h3>
                <span className={`rounded px-2 py-0.5 text-xs ${active ? "bg-green-100 text-green-800" : "bg-zinc-200 text-zinc-700"}`}>
                  {active ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                {med.events
                  .sort((a, b) => b.event_date.localeCompare(a.event_date))
                  .map((ev) => (
                    <p key={ev.id}>{ev.event_date} - {ev.event_type} {ev.dosage ? `(${ev.dosage})` : ""}</p>
                  ))}
              </div>
              {canEdit ? (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => addEvent(med.id, "dose_change", prompt("New dosage") ?? "")}>Change Dose</Button>
                  <Button size="sm" variant="destructive" onClick={() => addEvent(med.id, "stop")}>Stop</Button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
