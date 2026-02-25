import { NextResponse } from "next/server";
import { z } from "zod";
import { requireProfileRole } from "@/lib/auth";

const schema = z.object({
  medication_name: z.string().min(1),
  start_dosage: z.string().nullable().optional(),
  start_frequency: z.string().nullable().optional()
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, role } = await requireProfileRole(id);
  if (role === "viewer") {
    return NextResponse.json({ error: "Viewer cannot edit meds" }, { status: 403 });
  }

  const body = schema.parse(await req.json());
  const { data: med, error: medError } = await supabase
    .from("medications")
    .insert({ profile_id: id, medication_name: body.medication_name })
    .select("id")
    .single();

  if (medError) {
    return NextResponse.json({ error: medError.message }, { status: 400 });
  }

  const { error: eventError } = await supabase.from("medication_events").insert({
    medication_id: med.id,
    event_type: "start",
    event_date: new Date().toISOString().slice(0, 10),
    dosage: body.start_dosage ?? null,
    frequency: body.start_frequency ?? null
  });

  if (eventError) {
    return NextResponse.json({ error: eventError.message }, { status: 400 });
  }

  return NextResponse.json({ id: med.id });
}
