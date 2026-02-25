import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createSupabaseAdminClient();
  const { data: snapshot } = await supabase
    .from("snapshots")
    .select("expires_at, pdf_storage_path")
    .eq("share_token", token)
    .single();

  if (!snapshot || !snapshot.pdf_storage_path) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (new Date(snapshot.expires_at).getTime() <= Date.now()) {
    return NextResponse.json({ error: "Expired" }, { status: 410 });
  }

  const signed = await supabase.storage.from("health_docs").createSignedUrl(snapshot.pdf_storage_path, 60 * 10);
  if (!signed.data?.signedUrl) {
    return NextResponse.json({ error: "Unable to sign URL" }, { status: 400 });
  }

  return NextResponse.redirect(signed.data.signedUrl);
}
