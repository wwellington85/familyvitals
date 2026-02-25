import crypto from "crypto";
import { NextResponse } from "next/server";
import { requireProfileRole } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, role } = await requireProfileRole(id);
  if (role === "viewer") {
    return NextResponse.json({ error: "Viewer cannot upload" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const collectedAt = String(formData.get("collected_at") || "") || null;
  const docType = String(formData.get("doc_type") || "lab");
  const ext = file.name.split(".").pop() ?? "pdf";
  const key = `${id}/documents/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from("health_docs").upload(key, file, {
    contentType: file.type || "application/pdf",
    upsert: false
  });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 400 });
  }

  const { data: doc, error: insertError } = await supabase
    .from("documents")
    .insert({
      profile_id: id,
      uploaded_by_user_id: user.id,
      filename: file.name,
      storage_path: key,
      collected_at: collectedAt,
      doc_type: docType,
      status: "uploaded"
    })
    .select("id")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  const signed = await supabase.storage.from("health_docs").createSignedUrl(key, 60 * 20);
  const extractorUrl = process.env.FASTAPI_EXTRACTOR_URL;
  if (extractorUrl && signed.data?.signedUrl) {
    await supabase.from("documents").update({ status: "extracting" }).eq("id", doc.id);
    fetch(`${extractorUrl}/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ document_id: doc.id, signed_pdf_url: signed.data.signedUrl })
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text().catch(() => "Extraction failed");
          await supabase
            .from("documents")
            .update({ status: "error", extracted_json: { error: text.slice(0, 500) } })
            .eq("id", doc.id);
        }
      })
      .catch(async (err) => {
        await supabase
          .from("documents")
          .update({ status: "error", extracted_json: { error: err instanceof Error ? err.message : "Extractor request failed" } })
          .eq("id", doc.id);
      });
  }

  return NextResponse.json({ id: doc.id });
}
