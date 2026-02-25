import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

const schema = z.object({
  full_name: z.string().min(1),
  birth_date: z.string().date().nullable().optional(),
  sex: z.string().nullable().optional(),
  notes: z.string().nullable().optional()
});

export async function POST(req: Request) {
  const { user } = await requireUser();
  const admin = createSupabaseAdminClient();
  const body = schema.parse(await req.json());

  const { data, error } = await admin
    .from("profiles")
    .insert({
      created_by_user_id: user.id,
      full_name: body.full_name,
      birth_date: body.birth_date ?? null,
      sex: body.sex ?? null,
      notes: body.notes ?? null
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ id: data.id });
}
