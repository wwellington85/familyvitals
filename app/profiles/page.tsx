import Link from "next/link";
import type { Route } from "next";
import { requireUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateProfileForm } from "@/components/create-profile-form";
import { Button } from "@/components/ui/button";

export default async function ProfilesPage() {
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from("profile_access")
    .select("role, profiles(id, full_name, birth_date, created_at)")
    .eq("user_id", user.id);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Card>
        <CardHeader>
          <CardTitle>My Family</CardTitle>
          <p className="text-sm text-muted-foreground">Select an existing profile or create one for Dad/Mom/family.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {(data ?? []).map((row: any) => {
            const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
            if (!profile) return null;
            const profileId = profile.id as string;
            const canEdit = row.role !== "viewer";

            return (
              <div key={profile.id} className="rounded-md border border-border p-3">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{profile.full_name}</p>
                    <p className="text-xs text-muted-foreground">DOB: {profile.birth_date ?? "unknown"}</p>
                  </div>
                  <Badge>{row.role}</Badge>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link href={`/profiles/${profileId}/timeline` as Route}>
                    <Button size="sm" variant="outline">Timeline</Button>
                  </Link>
                  {canEdit ? (
                    <Link href={`/profiles/${profileId}/vitals/add` as Route}>
                      <Button size="sm" variant="outline">Add Vitals</Button>
                    </Link>
                  ) : null}
                  <Link href={`/profiles/${profileId}/documents` as Route}>
                    <Button size="sm" variant="outline">{canEdit ? "Upload Doc" : "View Docs"}</Button>
                  </Link>
                  <Link href={`/profiles/${profileId}/meds` as Route}>
                    <Button size="sm" variant="outline">Meds</Button>
                  </Link>
                  <Link href={`/profiles/${profileId}/share` as Route}>
                    <Button size="sm" variant="outline">Share</Button>
                  </Link>
                </div>
              </div>
            );
          })}
          {data?.length === 0 ? <p className="text-sm text-muted-foreground">No profiles yet.</p> : null}
        </CardContent>
      </Card>
      <CreateProfileForm />
    </div>
  );
}
