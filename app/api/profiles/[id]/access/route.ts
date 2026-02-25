import { NextResponse } from "next/server";
import { z } from "zod";
import { requireProfileRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

const createSchema = z.object({
  email: z.string().email(),
  role: z.enum(["owner", "editor", "viewer"]).default("viewer")
});

async function findUserIdByEmail(email: string) {
  const admin = createSupabaseAdminClient();
  const normalized = email.trim().toLowerCase();

  let page = 1;
  const perPage = 200;

  while (page <= 20) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(error.message);
    }

    const users = data.users ?? [];
    const found = users.find((u) => (u.email ?? "").toLowerCase() === normalized);
    if (found) {
      return found.id;
    }

    if (users.length < perPage) {
      break;
    }

    page += 1;
  }

  return null;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { role } = await requireProfileRole(id);
  if (role !== "owner") {
    return NextResponse.json({ error: "Only owner can manage family access" }, { status: 403 });
  }

  const body = createSchema.parse(await req.json());
  const targetUserId = await findUserIdByEmail(body.email);

  if (!targetUserId) {
    return NextResponse.json(
      { error: "No user found with that email yet. Ask them to create an account first via /login." },
      { status: 400 }
    );
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("profile_access").upsert(
    {
      profile_id: id,
      user_id: targetUserId,
      role: body.role
    },
    { onConflict: "profile_id,user_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, user_id: targetUserId });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { role } = await requireProfileRole(id);
  if (role !== "owner") {
    return NextResponse.json({ error: "Only owner can manage family access" }, { status: 403 });
  }

  const url = new URL(req.url);
  const userId = url.searchParams.get("user_id");
  if (!userId) {
    return NextResponse.json({ error: "user_id is required" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: accessRow, error: accessError } = await admin
    .from("profile_access")
    .select("role")
    .eq("profile_id", id)
    .eq("user_id", userId)
    .single();

  if (accessError || !accessRow) {
    return NextResponse.json({ error: "Member not found on this profile" }, { status: 404 });
  }

  if (accessRow.role === "owner") {
    return NextResponse.json({ error: "Cannot remove owner from profile access" }, { status: 400 });
  }

  const { error } = await admin.from("profile_access").delete().eq("profile_id", id).eq("user_id", userId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
