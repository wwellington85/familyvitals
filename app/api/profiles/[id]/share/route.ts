import { NextResponse } from "next/server";
import { addHours, format } from "date-fns";
import { requireProfileRole } from "@/lib/auth";
import { buildSnapshotMarkdown, markdownToPdfBytes, randomShareToken } from "@/lib/snapshot";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, role } = await requireProfileRole(id);
  if (role !== "owner") {
    return NextResponse.json({ error: "Only owner can create snapshot" }, { status: 403 });
  }

  const [{ data: profile }, { data: obs }, { data: meds }, { data: docs }, { data: insights }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", id).single(),
    supabase
      .from("observations")
      .select("name, value_number, value_text, unit, effective_datetime")
      .eq("profile_id", id)
      .order("effective_datetime", { ascending: false })
      .limit(12),
    supabase
      .from("medications")
      .select("id, medication_name, medication_events(event_type, event_date, dosage)")
      .eq("profile_id", id),
    supabase.from("documents").select("filename, status").eq("profile_id", id).order("created_at", { ascending: false }).limit(6),
    supabase.from("insights").select("summary").eq("profile_id", id).order("created_at", { ascending: false }).limit(3)
  ]);

  const snapshotJson = {
    profile: profile,
    observations: obs,
    medications: meds,
    documents: docs,
    insights
  };

  const markdown = buildSnapshotMarkdown({
    profileName: profile?.full_name ?? "Unknown",
    observations: (obs ?? []).map((o) => ({
      name: o.name,
      value: `${o.value_number ?? o.value_text ?? ""} ${o.unit ?? ""}`.trim(),
      when: format(new Date(o.effective_datetime), "PP")
    })),
    meds: (meds ?? []).map((m: any) => {
      const latest = [...(m.medication_events ?? [])].sort((a, b) => b.event_date.localeCompare(a.event_date))[0];
      return { name: m.medication_name, latest: latest ? `${latest.event_type} ${latest.dosage ?? ""}`.trim() : "No events" };
    }),
    recentDocs: (docs ?? []).map((d) => ({ filename: d.filename, status: d.status })),
    insights: (insights ?? []).map((i) => ({ summary: i.summary }))
  });

  const token = randomShareToken();
  const ttlHours = Number(process.env.SNAPSHOT_LINK_TTL_HOURS ?? "168");
  const expiresAt = addHours(new Date(), ttlHours);

  const pdfBytes = await markdownToPdfBytes(markdown);
  const pdfPath = `${id}/snapshots/${token}.pdf`;

  const { error: uploadError } = await supabase.storage.from("health_docs").upload(pdfPath, pdfBytes, {
    contentType: "application/pdf",
    upsert: false
  });
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 400 });
  }

  const { data: snapshot, error: snapshotError } = await supabase
    .from("snapshots")
    .insert({
      profile_id: id,
      created_by_user_id: user.id,
      share_token: token,
      expires_at: expiresAt.toISOString(),
      snapshot_json: snapshotJson,
      snapshot_markdown: markdown,
      pdf_storage_path: pdfPath
    })
    .select("id")
    .single();

  if (snapshotError) {
    return NextResponse.json({ error: snapshotError.message }, { status: 400 });
  }

  const origin = new URL(req.url).origin;
  const pdfSigned = await supabase.storage.from("health_docs").createSignedUrl(pdfPath, 60 * 30);

  return NextResponse.json({
    id: snapshot.id,
    share_url: `${origin}/share/${token}`,
    pdf_url: pdfSigned.data?.signedUrl ?? `${origin}/api/share/${token}/pdf`,
    expires_at: expiresAt.toISOString()
  });
}
