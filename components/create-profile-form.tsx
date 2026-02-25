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
  const [relationship, setRelationship] = useState("dad");
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
    const relationshipNote = relationship ? `Relationship: ${relationship}` : "";
    const mergedNotes = [relationshipNote, notes].filter(Boolean).join("\n");
    const res = await fetch("/api/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: fullName,
        birth_date: birthDate || null,
        sex: sex || null,
        notes: mergedNotes || null
      })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to create profile");
      setLoading(false);
      return;
    }
    setLoading(false);
    setFullName("");
    setRelationship("dad");
    setBirthDate("");
    setSex("");
    setNotes("");
    onCreated?.();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-lg border border-border bg-card p-4">
      <h3 className="text-sm font-semibold">Create Family Profile</h3>
      <p className="text-xs text-muted-foreground">Create a profile for Dad, Mom, yourself, or another family member.</p>
      <div>
        <Label>Full name</Label>
        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="e.g., Robert Wellington" />
      </div>
      <div>
        <Label>Relationship</Label>
        <select
          value={relationship}
          onChange={(e) => setRelationship(e.target.value)}
          className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
        >
          <option value="dad">Dad</option>
          <option value="mom">Mom</option>
          <option value="self">Self</option>
          <option value="sibling">Sibling</option>
          <option value="spouse">Spouse</option>
          <option value="child">Child</option>
          <option value="other">Other</option>
        </select>
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
