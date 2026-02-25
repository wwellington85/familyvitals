import Link from "next/link";
import { format } from "date-fns";
import { requireProfileRole } from "@/lib/auth";
import { ProfileNav } from "@/components/profile-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DocumentUploadForm } from "@/components/document-upload-form";

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
            {(docs ?? []).map((doc) => (
              <Link key={doc.id} href={`/profiles/${id}/documents/${doc.id}/review`} className="flex items-center justify-between rounded border border-border p-3 hover:bg-muted">
                <div>
                  <p className="font-medium">{doc.filename}</p>
                  <p className="text-xs text-muted-foreground">{doc.doc_type} • {format(new Date(doc.created_at), "PPp")}</p>
                </div>
                <Badge>{doc.status}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
        {role !== "viewer" ? <DocumentUploadForm profileId={id} /> : null}
      </div>
    </div>
  );
}
