import { format } from "date-fns";
import { requireProfileRole } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProfileNav } from "@/components/profile-nav";
import { MedicalDisclaimer } from "@/components/disclaimer";
import { GenerateInsightButton } from "@/components/generate-insight-button";

export default async function TimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireProfileRole(id);

  const [{ data: profile }, { data: docs }, { data: observations }, { data: medEvents }, { data: insights }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", id).single(),
    supabase.from("documents").select("id, filename, status, created_at").eq("profile_id", id).order("created_at", { ascending: false }).limit(10),
    supabase
      .from("observations")
      .select("id, name, category, status, effective_datetime, value_number, value_text, unit, flagged")
      .eq("profile_id", id)
      .order("effective_datetime", { ascending: false })
      .limit(10),
    supabase
      .from("medication_events")
      .select("id, event_type, event_date, dosage, medications!inner(profile_id, medication_name)")
      .eq("medications.profile_id", id)
      .order("event_date", { ascending: false })
      .limit(10),
    supabase.from("insights").select("id, summary, clinician_questions, disclaimer, created_at").eq("profile_id", id).order("created_at", { ascending: false }).limit(5)
  ]);

  return (
    <div>
      <ProfileNav profileId={id} current="timeline" />
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{profile?.full_name ?? "Profile"} Timeline</h1>
          <p className="text-sm text-muted-foreground">All records are profile-scoped.</p>
        </div>
        <GenerateInsightButton profileId={id} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(docs ?? []).map((doc) => (
              <div key={doc.id} className="flex items-center justify-between rounded border border-border p-2 text-sm">
                <div>
                  <p>{doc.filename}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(doc.created_at), "PPp")}</p>
                </div>
                <Badge>{doc.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Observations</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(observations ?? []).map((obs) => (
              <div key={obs.id} className="rounded border border-border p-2 text-sm">
                <p className="font-medium">{obs.name}</p>
                <p className="text-xs text-muted-foreground">
                  {obs.value_number ?? obs.value_text ?? "-"} {obs.unit ?? ""} ({obs.flagged})
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Medication Timeline</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(medEvents ?? []).map((event: any) => (
              <div key={event.id} className="rounded border border-border p-2 text-sm">
                <p className="font-medium">{event.medications.medication_name}</p>
                <p className="text-xs text-muted-foreground">{event.event_date} - {event.event_type} {event.dosage ? `(${event.dosage})` : ""}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>AI Insight Cards</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(insights ?? []).map((insight) => (
              <div key={insight.id} className="rounded border border-border p-3 text-sm">
                <p>{insight.summary}</p>
                {insight.clinician_questions?.length ? (
                  <ul className="mt-2 list-disc pl-5 text-xs text-muted-foreground">
                    {insight.clinician_questions.map((q: string) => <li key={q}>{q}</li>)}
                  </ul>
                ) : null}
                <p className="mt-2 text-[11px] text-muted-foreground">{format(new Date(insight.created_at), "PPp")}</p>
              </div>
            ))}
            <MedicalDisclaimer />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
