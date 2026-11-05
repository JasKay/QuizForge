import { readFileSync, writeFileSync } from "node:fs";
type Row = { id: string; text: string; answer: string; subject: string; source: string; review_status?: string; alternatives?: string[]; tags?: string[] };
const source = "lib/community-questions.json";
const rows = JSON.parse(readFileSync(source, "utf8")) as Row[];
const normalized = (s: string) => s.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
const reasons = new Map<string, number>();
const examples: { id: string; reason: string }[] = [];
const seen = new Set<string>();
let clean = 0, flagged = 0;
for (const q of rows) {
  const stem = q.text.split(/\s+Choices:\s+/)[0].trim();
  const choices = q.text.includes(" Choices: ") ? q.text.split(" Choices: ")[1].split(" · ").map(s=>s.trim()) : [];
  const issues: string[] = [];
  const key = normalized(stem);
  if (!key || seen.has(key)) issues.push("duplicate_or_empty_stem");
  seen.add(key);
  if (stem.length < 12 || stem.length > 400) issues.push("unusual_stem_length");
  if (!q.answer?.trim() || !q.subject?.trim() || !q.source?.trim()) issues.push("missing_required_fields");
  if (choices.length && (choices.length !== 4 || new Set(choices.map(normalized)).size !== 4 || !choices.some(c=>normalized(c)===normalized(q.answer)))) issues.push("invalid_choices");
  if (/\\b(?:all of the above|none of the above|both a and b)\\b/i.test(choices.join(" "))) issues.push("meta_answer_option");
  if (/\\b(?:which of the following|which one of these|not one of the following)\\b/i.test(stem) && !choices.length) issues.push("requires_options");
  if (!q.source?.startsWith("https://")) issues.push("unverifiable_source_url");
  if (issues.length) { flagged++; for(const reason of issues){reasons.set(reason,(reasons.get(reason)||0)+1);if(examples.length<30)examples.push({id:q.id,reason});} }
  else clean++;
}
const report={generatedAt:new Date().toISOString(),total:rows.length,structurallyClean:clean,flagged,approvedByHuman:0,countsByIssue:Object.fromEntries(reasons),sampleFlags:examples,notes:"Structural validation only. No fact-checking or human editorial approval. Community questions remain unapproved."};
writeFileSync("question-bank-audit.json",JSON.stringify(report,null,2)+"\\n");
console.log(JSON.stringify(report,null,2));
if(process.argv.includes("--strict") && flagged) process.exitCode=1;
