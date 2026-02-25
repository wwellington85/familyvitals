import { NextResponse } from "next/server";
import { z } from "zod";
import { requireProfileRole } from "@/lib/auth";

const schema = z.object({
  event_type: z.enum(["start", "dose_change", "pause", "resume", "stop"]),
  event_date: z.string().date(),
  dosage: z.string().nullable().optional(),
  frequency: z.string().nullable().optional(),
  route: z.string().nullable().optional(),
  prescribed_by: z.string().nullable().optional(),
  reason: z.string().nullable().optional(),
  notes: z.string().nullable().optional()
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string; medId: string }> }) {
  const { id, medId } = await params;
  const { supabase, role } = await requireProfileRole(id);
  if (role === "viewer") {
    return NextResponse.json({ error: "Viewer cannot edit meds" }, { status: 403 });
  }

  const body = schema.parse(await req.json());
  const { error } = await supabase.from("medication_events").insert({
    medication_id: medId,
    event_type: body.event_type,
    event_date: body.event_date,
    dosage: body.dosage ?? null,
    frequency: body.frequency ?? null,
    route: body.route ?? null,
    prescribed_by: body.prescribed_by ?? null,
    reason: body.reason ?? null,
    notes: body.notes ?? null
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
