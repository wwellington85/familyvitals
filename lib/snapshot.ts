import crypto from "crypto";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export function randomShareToken() {
  return crypto.randomBytes(18).toString("base64url");
}

export function buildSnapshotMarkdown(input: {
  profileName: string;
  observations: Array<{ name: string; value: string; when: string }>;
  meds: Array<{ name: string; latest: string }>;
  recentDocs: Array<{ filename: string; status: string }>;
  insights: Array<{ summary: string }>;
}) {
  const lines: string[] = [];
  lines.push(`# Doctor Snapshot for ${input.profileName}`);
  lines.push("");
  lines.push("## Recent Observations");
  input.observations.forEach((o) => lines.push(`- ${o.when}: ${o.name} = ${o.value}`));
  lines.push("");
  lines.push("## Active / Recent Medications");
  input.meds.forEach((m) => lines.push(`- ${m.name}: ${m.latest}`));
  lines.push("");
  lines.push("## Recent Documents");
  input.recentDocs.forEach((d) => lines.push(`- ${d.filename} (${d.status})`));
  lines.push("");
  lines.push("## AI Insight Highlights");
  input.insights.forEach((i) => lines.push(`- ${i.summary}`));
  lines.push("");
  lines.push("This is not medical advice and not a diagnosis.");

  return lines.join("\n");
}

export async function markdownToPdfBytes(markdown: string) {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([612, 792]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const lines = markdown.split("\n");

  let y = 760;
  for (const line of lines) {
    if (y < 40) {
      y = 760;
      page = pdfDoc.addPage([612, 792]);
    }
    page.drawText(line.slice(0, 110), {
      x: 36,
      y,
      size: 10,
      font,
      color: rgb(0.1, 0.12, 0.13)
    });
    y -= 14;
  }

  return Buffer.from(await pdfDoc.save());
}
