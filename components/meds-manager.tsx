"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Med = {
  id: string;
  medication_name: string;
  item_type: "medication" | "supplement";
  indication: string | null;
  events: Array<{ id: string; event_type: string; event_date: string; dosage: string | null; frequency: string | null }>;
};

export function MedsManager({ profileId, canEdit, meds }: { profileId: string; canEdit: boolean; meds: Med[] }) {
  const [name, setName] = useState("");
  const [itemType, setItemType] = useState<"medication" | "supplement">("medication");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [eventDateByMed, setEventDateByMed] = useState<Record<string, string>>({});
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
      body: JSON.stringify({
        medication_name: name,
        item_type: itemType,
        start_dosage: dosage || null,
        start_frequency: frequency || null
      })
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to add medication");
      setLoading(false);
      return;
    }
    setLoading(false);
    setName("");
    setItemType("medication");
    setDosage("");
    setFrequency("");
    router.refresh();
  }

  async function addEvent(medId: string, eventType: "dose_change" | "stop", dose?: string) {
    const eventDate = eventDateByMed[medId] || new Date().toISOString().slice(0, 10);
    const res = await fetch(`/api/profiles/${profileId}/meds/${medId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_type: eventType, dosage: dose || null, event_date: eventDate })
    });
    if (res.ok) router.refresh();
  }

  const medicationItems = meds.filter((m) => m.item_type !== "supplement");
  const supplementItems = meds.filter((m) => m.item_type === "supplement");

  return (
    <div className="space-y-5">
      {canEdit ? (
        <form onSubmit={addMedication} className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-4">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label>Type</Label>
            <select
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              value={itemType}
              onChange={(e) => setItemType(e.target.value as "medication" | "supplement")}
            >
              <option value="medication">Medication</option>
              <option value="supplement">Vitamin/Supplement</option>
            </select>
          </div>
          <div>
            <Label>Start dosage</Label>
            <Input value={dosage} onChange={(e) => setDosage(e.target.value)} />
          </div>
          <div>
            <Label>Frequency</Label>
            <Input value={frequency} onChange={(e) => setFrequency(e.target.value)} />
          </div>
          <div className="md:col-span-4">
            {error ? <p className="mb-2 text-xs text-destructive">{error}</p> : null}
            <Button type="submit" disabled={loading}>{loading ? "Adding..." : "Add Item + Start Event"}</Button>
          </div>
        </form>
      ) : null}

      <section>
        <h3 className="mb-2 text-sm font-semibold">Medications</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {medicationItems.map((med) => {
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
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Event date</Label>
                      <Input
                        type="date"
                        value={eventDateByMed[med.id] ?? new Date().toISOString().slice(0, 10)}
                        onChange={(e) => setEventDateByMed((prev) => ({ ...prev, [med.id]: e.target.value }))}
                        className="h-8"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => addEvent(med.id, "dose_change", prompt("New dosage") ?? "")}>Change Dose</Button>
                      <Button size="sm" variant="destructive" onClick={() => addEvent(med.id, "stop")}>Discontinue</Button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
          {medicationItems.length === 0 ? <p className="text-sm text-muted-foreground">No medications yet.</p> : null}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold">Vitamins & Supplements</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {supplementItems.map((med) => {
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
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Event date</Label>
                      <Input
                        type="date"
                        value={eventDateByMed[med.id] ?? new Date().toISOString().slice(0, 10)}
                        onChange={(e) => setEventDateByMed((prev) => ({ ...prev, [med.id]: e.target.value }))}
                        className="h-8"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => addEvent(med.id, "dose_change", prompt("New dosage") ?? "")}>Change Dose</Button>
                      <Button size="sm" variant="destructive" onClick={() => addEvent(med.id, "stop")}>Discontinue</Button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
          {supplementItems.length === 0 ? <p className="text-sm text-muted-foreground">No supplements yet.</p> : null}
        </div>
      </section>
    </div>
  );
}
