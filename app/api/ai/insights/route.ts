import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";

const schema = z.object({
  profile_id: z.string().uuid(),
  selected_metrics: z.array(z.string()).default([])
});

function summarizeTrend(values: number[]) {
  if (values.length < 2) return "Limited recent data.";
  const delta = values[values.length - 1] - values[0];
  if (Math.abs(delta) < 0.01) return "Stable trend in selected period.";
  return delta > 0 ? "Overall increasing trend." : "Overall decreasing trend.";
}

export async function POST(req: Request) {
  const { supabase, user } = await requireUser();
  const body = schema.parse(await req.json());

  const { data: access } = await supabase
    .from("profile_access")
    .select("role")
    .eq("profile_id", body.profile_id)
    .eq("user_id", user.id)
    .single();

  if (!access || access.role === "viewer") {
    return NextResponse.json({ error: "Only owner/editor can generate insights" }, { status: 403 });
  }

  const { data: observations } = await supabase
    .from("observations")
    .select("name, value_number, effective_datetime")
    .eq("profile_id", body.profile_id)
    .eq("category", "vital")
    .order("effective_datetime", { ascending: true })
    .limit(200);

  const metricMap: Record<string, number[]> = {};
  for (const row of observations ?? []) {
    if (row.value_number == null) continue;
    const key = row.name.toLowerCase().replace(/\s+/g, "_");
    metricMap[key] = metricMap[key] ?? [];
    metricMap[key].push(row.value_number);
  }

  const included = Object.keys(metricMap).filter((m) => body.selected_metrics.length === 0 || body.selected_metrics.some((s) => m.includes(s)));
  const summaryParts = included.map((m) => `${m}: ${summarizeTrend(metricMap[m])}`);
  const summary = summaryParts.length
    ? `Trend summary: ${summaryParts.join(" ")}`
    : "Trend summary: not enough selected metric data yet.";

  const clinicianQuestions = [
    "Are these trend changes clinically meaningful for current treatment goals?",
    "Should timing, frequency, or home measurement technique be adjusted?",
    "Are there medication or lifestyle factors that could explain recent variation?"
  ];

  const { data: insight, error } = await supabase
    .from("insights")
    .insert({
      profile_id: body.profile_id,
      created_by_user_id: user.id,
      metrics: body.selected_metrics,
      summary,
      clinician_questions: clinicianQuestions,
      disclaimer: "This is not medical advice and not a diagnosis."
    })
    .select("id, summary, clinician_questions, disclaimer")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(insight);
}
