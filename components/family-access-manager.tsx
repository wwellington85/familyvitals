"use client";

import { type FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type Member = {
  user_id: string;
  email: string | null;
  role: "owner" | "editor" | "viewer";
};

export function FamilyAccessManager({ profileId }: { profileId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"owner" | "editor" | "viewer">("viewer");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMembers() {
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/profiles/${profileId}/sharing`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(body.error ?? "Failed to load family members");
      setLoading(false);
      return;
    }

    setMembers((body.members ?? []).map((m: any) => ({ user_id: m.user_id, email: m.email, role: m.role })));
    setLoading(false);
  }

  useEffect(() => {
    loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  async function onInvite(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch(`/api/profiles/${profileId}/access`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role })
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error ?? "Failed to add member");
      setSaving(false);
      return;
    }

    setEmail("");
    setRole("viewer");
    setSaving(false);
    await loadMembers();
  }

  async function removeMember(userId: string) {
    setError(null);
    const confirmed = window.confirm("Remove this family member from this profile?");
    if (!confirmed) return;

    const res = await fetch(`/api/profiles/${profileId}/access?user_id=${encodeURIComponent(userId)}`, {
      method: "DELETE"
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error ?? "Failed to remove member");
      return;
    }

    await loadMembers();
  }

  return (
    <Card className="mt-5">
      <CardHeader>
        <CardTitle>Family Access</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Add family members by email after they create an account at login. Role controls edit rights.
        </p>

        <form onSubmit={onInvite} className="grid gap-3 rounded border border-border p-3 md:grid-cols-[1fr_160px_auto]">
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="family@example.com"
              required
            />
          </div>
          <div>
            <Label>Role</Label>
            <select
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value as "owner" | "editor" | "viewer")}
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
              <option value="owner">Owner</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={saving || !email}>{saving ? "Adding..." : "Add Member"}</Button>
          </div>
        </form>

        {error ? <p className="text-xs text-destructive">{error}</p> : null}

        {loading ? <p className="text-sm text-muted-foreground">Loading members...</p> : null}

        {!loading ? (
          <div className="space-y-2">
            {members.map((member) => (
              <div key={member.user_id} className="flex items-center justify-between rounded border border-border p-2">
                <div>
                  <p className="text-sm font-medium">{member.email ?? member.user_id}</p>
                  <p className="text-xs text-muted-foreground">{member.user_id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{member.role}</Badge>
                  {member.role !== "owner" ? (
                    <Button size="sm" variant="outline" onClick={() => removeMember(member.user_id)}>
                      Remove
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
