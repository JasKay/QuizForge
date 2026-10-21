import type { Question } from "./questions";
import { subjects } from "./questions";
export function parseCSV(text: string): Omit<Question, "id">[] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (quoted) throw Error("Unclosed quoted field");
  row.push(cell);
  if (row.some(Boolean)) rows.push(row);
  const header = rows.shift()?.map((s) => s.replace(/^\uFEFF/, "").trim());
  const required = [
    "text",
    "answer",
    "subject",
    "difficulty",
    "explanation",
    "source",
  ];
  if (!header || required.some((k) => !header.includes(k)))
    throw Error("Required columns: " + required.join(", "));
  if (rows.length > 500) throw Error("Import at most 500 questions at a time");
  return rows.map((r, i) => {
    if (r.length !== header.length)
      throw Error(`Row ${i + 2}: wrong number of columns`);
    const v = Object.fromEntries(header.map((k, j) => [k, r[j].trim()]));
    if (required.some((k) => !v[k]))
      throw Error(`Row ${i + 2}: missing required value`);
    if (
      !subjects.includes(v.subject) ||
      !["Easy", "Medium", "Hard"].includes(v.difficulty)
    )
      throw Error(`Row ${i + 2}: invalid subject or difficulty`);
    if (!/^https:\/\//.test(v.source))
      throw Error(`Row ${i + 2}: source must be an HTTPS URL`);
    return {
      text: v.text,
      answer: v.answer,
      subject: v.subject,
      difficulty: v.difficulty as Question["difficulty"],
      explanation: v.explanation,
      source: v.source,
      alternatives: (v.alternatives || "").split("|").filter(Boolean),
      subcategory: v.subcategory || v.subject,
      tags: (v.tags || "").split("|").filter(Boolean),
      format: "short_answer",
      review_status: "pending",
    };
  });
}
