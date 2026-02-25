import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateProfileForm } from "@/components/create-profile-form";

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
          <CardTitle>Profiles</CardTitle>
          <p className="text-sm text-muted-foreground">Select an existing profile or create one for Dad/Mom/family.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {(data ?? []).map((row: any) => {
            const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
            if (!profile) return null;
            return (
              <Link
                key={profile.id}
                href={`/profiles/${profile.id}/timeline`}
                className="flex items-center justify-between rounded-md border border-border p-3 hover:bg-muted"
              >
                <div>
                  <p className="font-medium">{profile.full_name}</p>
                  <p className="text-xs text-muted-foreground">DOB: {profile.birth_date ?? "unknown"}</p>
                </div>
                <Badge>{row.role}</Badge>
              </Link>
            );
          })}
          {data?.length === 0 ? <p className="text-sm text-muted-foreground">No profiles yet.</p> : null}
        </CardContent>
      </Card>
      <CreateProfileForm />
    </div>
  );
}
