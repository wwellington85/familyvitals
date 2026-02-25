import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { normalizeEmail } from "@/lib/invites";

const schema = z.object({
  token: z.string().min(8)
});

export async function POST(req: Request) {
  const body = schema.parse(await req.json());
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user?.id || !user.email) {
    return NextResponse.json({ error: "You must be logged in to accept an invite" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const { data: invite, error: inviteError } = await admin
    .from("profile_invites")
    .select("id, profile_id, email, role, status, expires_at")
    .eq("invite_token", body.token)
    .single();

  if (inviteError || !invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  if (invite.status !== "pending") {
    return NextResponse.json({ error: `Invite is ${invite.status}` }, { status: 400 });
  }

  if (new Date(invite.expires_at).getTime() <= Date.now()) {
    await admin.from("profile_invites").update({ status: "expired" }).eq("id", invite.id);
    return NextResponse.json({ error: "Invite expired" }, { status: 410 });
  }

  if (normalizeEmail(user.email) !== normalizeEmail(invite.email)) {
    return NextResponse.json(
      { error: `This invite is for ${invite.email}. Please login with that email.` },
      { status: 403 }
    );
  }

  const { error: accessError } = await admin.from("profile_access").upsert(
    {
      profile_id: invite.profile_id,
      user_id: user.id,
      role: invite.role
    },
    { onConflict: "profile_id,user_id" }
  );

  if (accessError) {
    return NextResponse.json({ error: accessError.message }, { status: 400 });
  }

  const { error: updateError } = await admin
    .from("profile_invites")
    .update({
      status: "accepted",
      accepted_by_user_id: user.id,
      accepted_at: new Date().toISOString()
    })
    .eq("id", invite.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, profile_id: invite.profile_id });
}
