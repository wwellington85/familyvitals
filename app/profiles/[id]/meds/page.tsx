import { requireProfileRole } from "@/lib/auth";
import { ProfileNav } from "@/components/profile-nav";
import { MedsManager } from "@/components/meds-manager";

export default async function MedsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, role } = await requireProfileRole(id);

  const { data: meds } = await supabase
    .from("medications")
    .select("id, medication_name, indication, medication_events(id, event_type, event_date, dosage, frequency)")
    .eq("profile_id", id)
    .order("created_at", { ascending: false });

  const normalized = (meds ?? []).map((m: any) => ({
    id: m.id,
    medication_name: m.medication_name,
    indication: m.indication,
    events: m.medication_events ?? []
  }));

  return (
    <div>
      <ProfileNav profileId={id} current="meds" />
      <MedsManager profileId={id} canEdit={role !== "viewer"} meds={normalized} />
    </div>
  );
}
