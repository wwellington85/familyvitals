import { requireProfileRole } from "@/lib/auth";
import { ProfileNav } from "@/components/profile-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentUploadForm } from "@/components/document-upload-form";
import { DocumentsList } from "@/components/documents-list";

export default async function DocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, role } = await requireProfileRole(id);
  const { data: docs } = await supabase.from("documents").select("id, filename, status, created_at, doc_type").eq("profile_id", id).order("created_at", { ascending: false });

  return (
    <div>
      <ProfileNav profileId={id} current="documents" />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <DocumentsList profileId={id} docs={(docs ?? []) as any} canEdit={role !== "viewer"} />
          </CardContent>
        </Card>
        {role !== "viewer" ? <DocumentUploadForm profileId={id} /> : null}
      </div>
    </div>
  );
}
