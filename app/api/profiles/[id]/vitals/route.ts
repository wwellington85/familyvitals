import { NextResponse } from "next/server";
import { z } from "zod";
import { requireProfileRole } from "@/lib/auth";

const schema = z.object({
  measured_at: z.string(),
  systolic: z.number().nullable().optional(),
  diastolic: z.number().nullable().optional(),
  heart_rate: z.number().nullable().optional(),
  weight: z.number().nullable().optional(),
  glucose: z.number().nullable().optional()
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, role } = await requireProfileRole(id);
  if (role === "viewer") {
    return NextResponse.json({ error: "Viewer cannot add vitals" }, { status: 403 });
  }

  const body = schema.parse(await req.json());
  const rows = [
    ["Blood Pressure Systolic", body.systolic, "mmHg"],
    ["Blood Pressure Diastolic", body.diastolic, "mmHg"],
    ["Heart Rate", body.heart_rate, "bpm"],
    ["Weight", body.weight, "kg"],
    ["Glucose", body.glucose, "mg/dL"]
  ]
    .filter(([, value]) => value != null)
    .map(([name, value, unit]) => ({
      profile_id: id,
      category: "vital",
      name,
      effective_datetime: body.measured_at,
      value_number: value,
      unit,
      flagged: "U",
      status: "manual"
    }));

  if (!rows.length) {
    return NextResponse.json({ error: "No values provided" }, { status: 400 });
  }

  const { error } = await supabase.from("observations").insert(rows);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
