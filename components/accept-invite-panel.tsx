"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AcceptInvitePanel({ token }: { token: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function acceptInvite() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/invites/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token })
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error ?? "Failed to accept invite");
      setLoading(false);
      return;
    }

    router.push(`/profiles/${body.profile_id}/timeline`);
    router.refresh();
  }

  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <CardTitle>Family Invite</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Accept this invite to join the shared FamilyVitals profile.
        </p>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        <Button onClick={acceptInvite} disabled={loading}>
          {loading ? "Accepting..." : "Accept Invite"}
        </Button>
      </CardContent>
    </Card>
  );
}
