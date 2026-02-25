import { format } from "date-fns";
import { requireProfileRole } from "@/lib/auth";
import { ProfileNav } from "@/components/profile-nav";
import { VitalsCharts } from "@/components/vitals-charts";

export default async function VitalsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireProfileRole(id);

  const { data } = await supabase
    .from("observations")
    .select("name, value_number, effective_datetime")
    .eq("profile_id", id)
    .eq("category", "vital")
    .order("effective_datetime", { ascending: true });

  const map = new Map<string, any>();
  for (const row of data ?? []) {
    const key = row.effective_datetime;
    if (!map.has(key)) {
      map.set(key, { date: format(new Date(key), "MM/dd"), iso: key });
    }
    const point = map.get(key);
    const value = row.value_number ?? undefined;
    if (row.name === "Blood Pressure Systolic") point.systolic = value;
    if (row.name === "Blood Pressure Diastolic") point.diastolic = value;
    if (row.name === "Heart Rate") point.heartRate = value;
    if (row.name === "Weight") point.weight = value;
    if (row.name === "Glucose") point.glucose = value;
  }

  const chartData = [...map.values()].sort((a, b) => a.iso.localeCompare(b.iso));

  return (
    <div>
      <ProfileNav profileId={id} current="vitals" />
      <VitalsCharts data={chartData} />
    </div>
  );
}
