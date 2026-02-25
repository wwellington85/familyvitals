import { NextResponse } from "next/server";
import { addHours } from "date-fns";
import { z } from "zod";
import { requireProfileRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { normalizeEmail, randomInviteToken } from "@/lib/invites";

const createSchema = z.object({
  email: z.string().email(),
  role: z.enum(["owner", "editor", "viewer"]).default("viewer")
});

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { role } = await requireProfileRole(id);
  if (role !== "owner") {
    return NextResponse.json({ error: "Only owner can view invites" }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("profile_invites")
    .select("id, email, role, status, invite_token, expires_at, created_at")
    .eq("profile_id", id)
    .in("status", ["pending", "accepted"])
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ invites: data ?? [] });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, role } = await requireProfileRole(id);
  if (role !== "owner") {
    return NextResponse.json({ error: "Only owner can invite" }, { status: 403 });
  }

  const body = createSchema.parse(await req.json());
  const admin = createSupabaseAdminClient();

  const email = normalizeEmail(body.email);
  const token = randomInviteToken();
  const expiresAt = addHours(new Date(), 24 * 7);

  const { data: invite, error: inviteError } = await admin
    .from("profile_invites")
    .insert({
      profile_id: id,
      email,
      role: body.role,
      invite_token: token,
      status: "pending",
      invited_by_user_id: user.id,
      expires_at: expiresAt.toISOString()
    })
    .select("id, invite_token, expires_at")
    .single();

  if (inviteError || !invite) {
    return NextResponse.json({ error: inviteError?.message ?? "Failed to create invite" }, { status: 400 });
  }

  const origin = new URL(req.url).origin;
  const inviteUrl = `${origin}/accept-invite?token=${invite.invite_token}`;

  let emailed = false;
  let emailMessage = "";

  // Attempt delivery through Supabase Auth email invite flow.
  const emailResult = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: inviteUrl
  });

  if (emailResult.error) {
    emailMessage = emailResult.error.message;
  } else {
    emailed = true;
    emailMessage = "Invite email sent.";
  }

  return NextResponse.json({
    ok: true,
    invite_id: invite.id,
    invite_url: inviteUrl,
    emailed,
    email_message: emailMessage,
    expires_at: invite.expires_at
  });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { role } = await requireProfileRole(id);
  if (role !== "owner") {
    return NextResponse.json({ error: "Only owner can revoke invites" }, { status: 403 });
  }

  const url = new URL(req.url);
  const inviteId = url.searchParams.get("invite_id");
  if (!inviteId) {
    return NextResponse.json({ error: "invite_id is required" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("profile_invites")
    .update({ status: "revoked" })
    .eq("id", inviteId)
    .eq("profile_id", id)
    .eq("status", "pending");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
