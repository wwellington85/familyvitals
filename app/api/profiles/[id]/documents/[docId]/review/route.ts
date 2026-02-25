import { NextResponse } from "next/server";
import { z } from "zod";
import { requireProfileRole } from "@/lib/auth";

const rowSchema = z.object({
  id: z.string().uuid().optional(),
  category: z.literal("lab"),
  name: z.string().min(1),
  effective_datetime: z.string(),
  value_number: z.number().nullable().optional(),
  value_text: z.string().nullable().optional(),
  unit: z.string().nullable().optional(),
  reference_low: z.number().nullable().optional(),
  reference_high: z.number().nullable().optional(),
  flagged: z.enum(["H", "L", "N", "U"]).optional(),
  extraction_confidence: z.number().nullable().optional(),
  status: z.enum(["extracted", "user_edited", "manual"]),
  notes: z.string().nullable().optional()
});

const schema = z.object({
  mark_reviewed: z.boolean(),
  rows: z.array(rowSchema)
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; docId: string }> }) {
  const { id, docId } = await params;
  const { supabase, role } = await requireProfileRole(id);
  if (role === "viewer") {
    return NextResponse.json({ error: "Viewer cannot edit" }, { status: 403 });
  }

  const body = schema.parse(await req.json());

  const { error: deleteError } = await supabase.from("observations").delete().eq("profile_id", id).eq("source_document_id", docId);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }

  if (body.rows.length > 0) {
    const { error: insertError } = await supabase.from("observations").insert(
      body.rows.map((row) => ({
        profile_id: id,
        source_document_id: docId,
        category: "lab",
        name: row.name,
        effective_datetime: row.effective_datetime,
        value_number: row.value_number ?? null,
        value_text: row.value_text ?? null,
        unit: row.unit ?? null,
        reference_low: row.reference_low ?? null,
        reference_high: row.reference_high ?? null,
        flagged: row.flagged ?? "U",
        extraction_confidence: row.extraction_confidence ?? null,
        status: row.status === "manual" ? "manual" : "user_edited",
        notes: row.notes ?? null
      }))
    );

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }
  }

  if (body.mark_reviewed) {
    const { error: updateError } = await supabase.from("documents").update({ status: "reviewed" }).eq("id", docId).eq("profile_id", id);
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}
