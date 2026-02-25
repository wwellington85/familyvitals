"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  onCreated?: () => void;
};

export function CreateProfileForm({ onCreated }: Props) {
  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [sex, setSex] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: fullName, birth_date: birthDate || null, sex: sex || null, notes: notes || null })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to create profile");
      setLoading(false);
      return;
    }
    setLoading(false);
    setFullName("");
    setBirthDate("");
    setSex("");
    setNotes("");
    onCreated?.();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-lg border border-border bg-card p-4">
      <h3 className="text-sm font-semibold">Create Profile</h3>
      <div>
        <Label>Full name</Label>
        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
      </div>
      <div>
        <Label>Birth date</Label>
        <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
      </div>
      <div>
        <Label>Sex</Label>
        <Input value={sex} onChange={(e) => setSex(e.target.value)} placeholder="optional" />
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <Button type="submit" disabled={loading || !fullName}>
        {loading ? "Creating..." : "Create"}
      </Button>
    </form>
  );
}
