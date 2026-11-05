import { readFileSync, writeFileSync } from "node:fs";

type Question = {
  id: string;
  text: string;
  answer: string;
  explanation?: string;
  source?: string;
  subject?: string;
};
const questions = JSON.parse(readFileSync("lib/community-questions.json", "utf8")) as Question[];
const findings: { id: string; issue: string }[] = [];
const counts: Record<string, number> = {};
const mark = (id: string, issue: string) => {
  counts[issue] = (counts[issue] || 0) + 1;
  findings.push({ id, issue });
};
for (const q of questions) {
  const explanation = (q.explanation || "").trim();
  const answer = (q.answer || "").trim();
  if (!explanation) mark(q.id, "missing_explanation");
  else {
    if (explanation.length < 65) mark(q.id, "short_explanation");
    if (explanation.toLowerCase() === answer.toLowerCase()) mark(q.id, "repeats_answer");
    if (/^(?:the (?:correct )?answer is|answer:|correct:|open trivia db)/i.test(explanation))
      mark(q.id, "answer_only_or_attribution");
    if (!/[.!?]$/.test(explanation)) mark(q.id, "incomplete_sentence");
  }
  if (!q.source?.startsWith("https://")) mark(q.id, "missing_source");
}
const report = {
  generatedAt: new Date().toISOString(),
  total: questions.length,
  counts,
  examples: findings.slice(0, 100),
  note: "Automated editorial triage only. Does not verify facts or imply that questions passed human review."
};
writeFileSync("learning-content-audit.json", JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ total: report.total, counts: report.counts, flagged: new Set(findings.map(f => f.id)).size }, null, 2));
