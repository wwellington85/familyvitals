import { requireProfileRole } from "@/lib/auth";
import { ProfileNav } from "@/components/profile-nav";
import { GenerateSnapshot } from "@/components/generate-snapshot";
import { SharingControls } from "@/components/sharing-controls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, role } = await requireProfileRole(id);

  const { data: snapshots } = await supabase
    .from("snapshots")
    .select("id, share_token, expires_at, created_at")
    .eq("profile_id", id)
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div>
      <ProfileNav profileId={id} current="share" />
      {role === "owner" ? <GenerateSnapshot profileId={id} /> : <p className="text-sm">Only owner can create snapshots.</p>}
      {role === "owner" ? <SharingControls profileId={id} /> : null}
      <Card className="mt-5">
        <CardHeader><CardTitle>Recent Snapshots</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {(snapshots ?? []).map((s) => (
            <div key={s.id} className="rounded border border-border p-2">
              <p>Token: {s.share_token}</p>
              <p className="text-xs text-muted-foreground">Expires: {new Date(s.expires_at).toLocaleString()}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
