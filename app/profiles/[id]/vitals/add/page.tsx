import { requireProfileRole } from "@/lib/auth";
import { ProfileNav } from "@/components/profile-nav";
import { VitalsForm } from "@/components/vitals-form";

export default async function AddVitalsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireProfileRole(id);

  return (
    <div>
      <ProfileNav profileId={id} current="vitals/add" />
      <VitalsForm profileId={id} />
    </div>
  );
}
