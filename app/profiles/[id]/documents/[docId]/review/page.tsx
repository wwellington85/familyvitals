import { requireProfileRole } from "@/lib/auth";
import { ProfileNav } from "@/components/profile-nav";
import { DocumentReviewEditor } from "@/components/document-review-editor";

export default async function DocumentReviewPage({ params }: { params: Promise<{ id: string; docId: string }> }) {
  const { id, docId } = await params;
  const { supabase, role } = await requireProfileRole(id);

  const [{ data: doc }, { data: observations }] = await Promise.all([
    supabase.from("documents").select("id, storage_path, status, extracted_json").eq("profile_id", id).eq("id", docId).single(),
    supabase
      .from("observations")
      .select("id, name, effective_datetime, value_number, value_text, unit, reference_low, reference_high, flagged, extraction_confidence, status")
      .eq("profile_id", id)
      .eq("source_document_id", docId)
      .order("effective_datetime", { ascending: true })
  ]);

  const signedPdfUrl = doc?.storage_path
    ? (await supabase.storage.from("health_docs").createSignedUrl(doc.storage_path, 60 * 30)).data?.signedUrl ?? null
    : null;

  return (
    <div>
      <ProfileNav profileId={id} current="documents" />
      {doc?.extracted_json?.method ? (
        <p className="mb-2 text-xs text-muted-foreground">Extraction method: {String(doc.extracted_json.method).toUpperCase()}</p>
      ) : null}
      {doc?.status === "extracting" ? (
        <p className="mb-3 text-xs text-muted-foreground">
          Document is currently extracting. You can still edit rows manually and save.
        </p>
      ) : null}
      {doc?.status === "error" ? (
        <p className="mb-3 text-xs text-destructive">
          Extraction failed. Return to Documents and click Run/Retry Extraction, or continue manual entry here.
        </p>
      ) : null}
      <DocumentReviewEditor
        profileId={id}
        docId={docId}
        signedPdfUrl={signedPdfUrl}
        initialRows={(observations as any[]) ?? []}
        canEdit={role !== "viewer"}
      />
    </div>
  );
}
