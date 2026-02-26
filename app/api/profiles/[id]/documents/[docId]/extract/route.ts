import { NextResponse } from "next/server";
import { z } from "zod";
import { requireProfileRole } from "@/lib/auth";

const schema = z.object({
  mode: z.enum(["auto", "ai", "regex"]).default("auto")
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string; docId: string }> }) {
  const { id, docId } = await params;
  const { supabase, role } = await requireProfileRole(id);
  const parsed = schema.safeParse(await req.json().catch(() => ({ mode: "auto" })));
  const mode = parsed.success ? parsed.data.mode : "auto";

  if (role === "viewer") {
    return NextResponse.json({ error: "Viewer cannot extract documents" }, { status: 403 });
  }

  const extractorUrl = process.env.FASTAPI_EXTRACTOR_URL;
  if (!extractorUrl) {
    return NextResponse.json({ error: "FASTAPI_EXTRACTOR_URL is not configured" }, { status: 500 });
  }
  if (extractorUrl.includes("localhost") || extractorUrl.includes("127.0.0.1")) {
    return NextResponse.json(
      {
        error:
          "FASTAPI_EXTRACTOR_URL points to localhost. In Vercel this must be a public HTTPS URL for your deployed extractor service."
      },
      { status: 500 }
    );
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
      body: JSON.stringify({ document_id: docId, signed_pdf_url: signedUrl, extraction_mode: mode })
    });

    if (!extractorRes.ok) {
      const text = await extractorRes.text();
      let message = text.slice(0, 500);
      try {
        const parsed = JSON.parse(text);
        if (typeof parsed?.detail === "string") {
          message = parsed.detail;
        } else if (typeof parsed?.error === "string") {
          message = parsed.error;
        }
      } catch {
        // keep raw text
      }
      await supabase
        .from("documents")
        .update({ status: "error", extracted_json: { error: `Extractor failed: ${message}` } })
        .eq("id", docId);
      return NextResponse.json({ error: `Extraction failed: ${message}` }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : "Extractor request failed";
    const message =
      rawMessage.toLowerCase().includes("fetch failed")
        ? `Extractor unreachable. Verify FASTAPI_EXTRACTOR_URL (${extractorUrl}) is a live public HTTPS endpoint.`
        : rawMessage;
    await supabase.from("documents").update({ status: "error", extracted_json: { error: message } }).eq("id", docId);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
