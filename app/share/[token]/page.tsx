import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export default async function PublicSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createSupabaseAdminClient();
  const { data: snapshot } = await supabase
    .from("snapshots")
    .select("id, share_token, expires_at, snapshot_markdown, pdf_storage_path")
    .eq("share_token", token)
    .single();

  if (!snapshot) {
    notFound();
  }

  const isExpired = new Date(snapshot.expires_at).getTime() <= Date.now();
  if (isExpired) {
    return <p className="text-sm">This share link expired on {new Date(snapshot.expires_at).toLocaleString()}.</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">Doctor Snapshot</h1>
      <div className="rounded-lg border border-border bg-card p-5">
        <pre className="whitespace-pre-wrap text-sm font-sans">{snapshot.snapshot_markdown}</pre>
      </div>
      {snapshot.pdf_storage_path ? (
        <Link className="text-primary underline" href={`/api/share/${token}/pdf`}>
          Download PDF
        </Link>
      ) : null}
    </div>
  );
}
