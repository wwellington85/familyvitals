"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type SectionName = "documents" | "labs" | "vitals" | "medications" | "snapshots" | "insights";

type Member = {
  user_id: string;
  email: string | null;
  role: "owner" | "editor" | "viewer";
  sections: Record<SectionName, boolean>;
};

const sectionLabels: Record<SectionName, string> = {
  documents: "Documents",
  labs: "Labs",
  vitals: "Vitals",
  medications: "Medications",
  snapshots: "Snapshots",
  insights: "Insights"
};

export function SharingControls({ profileId }: { profileId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/profiles/${profileId}/sharing`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error ?? "Failed to load sharing settings");
      setLoading(false);
      return;
    }

    setMembers(body.members ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  async function toggle(member: Member, section: SectionName, next: boolean) {
    const key = `${member.user_id}:${section}`;
    setSavingKey(key);
    setError(null);

    const previous = members;
    setMembers((current) =>
      current.map((m) =>
        m.user_id === member.user_id
          ? {
              ...m,
              sections: {
                ...m.sections,
                [section]: next
              }
            }
          : m
      )
    );

    const res = await fetch(`/api/profiles/${profileId}/sharing`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: member.user_id, section, can_read: next })
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to update permission");
      setMembers(previous);
    }

    setSavingKey(null);
  }

  return (
    <Card className="mt-5">
      <CardHeader>
        <CardTitle>Family Sharing Controls</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">
          Owner controls who can view each section for this profile. Owners always retain full access.
        </p>
        {error ? <p className="mb-3 text-xs text-destructive">{error}</p> : null}
        {loading ? <p className="text-sm text-muted-foreground">Loading sharing settings...</p> : null}

        {!loading ? (
          <div className="overflow-x-auto">
            <table className="min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="p-2 text-left">Member</th>
                  <th className="p-2 text-left">Role</th>
                  {(Object.keys(sectionLabels) as SectionName[]).map((section) => (
                    <th className="p-2 text-left" key={section}>{sectionLabels[section]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.user_id} className="border-b border-border">
                    <td className="p-2">
                      <p className="font-medium">{member.email ?? member.user_id}</p>
                      <p className="text-xs text-muted-foreground">{member.user_id}</p>
                    </td>
                    <td className="p-2">
                      <Badge>{member.role}</Badge>
                    </td>
                    {(Object.keys(sectionLabels) as SectionName[]).map((section) => {
                      const disabled = member.role === "owner" || savingKey === `${member.user_id}:${section}`;
                      return (
                        <td key={section} className="p-2">
                          <label className="inline-flex items-center gap-2 text-xs">
                            <input
                              type="checkbox"
                              checked={member.sections[section]}
                              disabled={disabled}
                              onChange={(e) => toggle(member, section, e.target.checked)}
                            />
                            <span>{member.sections[section] ? "Visible" : "Private"}</span>
                          </label>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
