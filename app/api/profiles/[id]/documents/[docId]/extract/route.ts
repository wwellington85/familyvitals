import { NextResponse } from "next/server";
import { requireProfileRole } from "@/lib/auth";

export async function POST(_: Request, { params }: { params: Promise<{ id: string; docId: string }> }) {
  const { id, docId } = await params;
  const { supabase, role } = await requireProfileRole(id);

  if (role === "viewer") {
    return NextResponse.json({ error: "Viewer cannot extract documents" }, { status: 403 });
  }

  const extractorUrl = process.env.FASTAPI_EXTRACTOR_URL;
  if (!extractorUrl) {
    return NextResponse.json({ error: "FASTAPI_EXTRACTOR_URL is not configured" }, { status: 500 });
  }

  const { data: doc, error: docError } = await supabase
    .from("documents")
    .select("id, storage_path")
    .eq("profile_id", id)
    .eq("id", docId)
    .single();

  if (docError || !doc) {
    return NextResponse.json({ error: docError?.message ?? "Document not found" }, { status: 404 });
  }

  const signed = await supabase.storage.from("health_docs").createSignedUrl(doc.storage_path, 60 * 20);
  const signedUrl = signed.data?.signedUrl;
  if (!signedUrl) {
    await supabase.from("documents").update({ status: "error", extracted_json: { error: "Unable to create signed URL" } }).eq("id", docId);
    return NextResponse.json({ error: "Unable to create signed URL" }, { status: 400 });
  }

  await supabase.from("documents").update({ status: "extracting" }).eq("id", docId);

  try {
    const extractorRes = await fetch(`${extractorUrl}/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ document_id: docId, signed_pdf_url: signedUrl })
    });

    if (!extractorRes.ok) {
      const text = await extractorRes.text();
      await supabase
        .from("documents")
        .update({ status: "error", extracted_json: { error: `Extractor failed: ${text.slice(0, 500)}` } })
        .eq("id", docId);
      return NextResponse.json({ error: "Extraction failed" }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Extractor request failed";
    await supabase.from("documents").update({ status: "error", extracted_json: { error: message } }).eq("id", docId);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
