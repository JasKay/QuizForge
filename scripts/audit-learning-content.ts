import { writeFileSync } from "node:fs";
import { questions } from "../lib/questions";
const findings: {id:string; subject:string; issue:string}[] = [];
const norm = (s:string) => s.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
const tokens = (s:string) => new Set(norm(s).split(" ").filter(w=>w.length>2));
const sets = new Map<string,string[]>();
for(const q of questions){
 const mark=(issue:string)=>findings.push({id:q.id,subject:q.subject,issue});
 const [stem,raw] = q.text.split(" Choices: ");
 const options=raw?.split(" · ").map(s=>s.trim()) || [];
 const answer=norm(q.answer);
 const aliases=new Set([answer,...q.alternatives.map(norm)]);
 if(answer.length>=3 && (" "+norm(stem)+" ").includes(" "+answer+" ")) mark("possible_answer_leakage");
 const e=q.explanation?.trim() || "";
 if(!e || e.length<65) mark("missing_or_short_explanation");
 if(/^(?:the (?:correct )?answer is|answer:|correct:|open trivia db)/i.test(e) || norm(e).includes(norm(stem))) mark("answer_or_stem_repetition");
 const known=tokens(stem+" "+q.answer);
 const novel=[...tokens(e)].filter(t=>!known.has(t));
 if(novel.length<5) mark("insufficient_new_context");
 if(!q.source?.startsWith("https://")) mark("missing_source");
 if(!options.length) mark("no_curated_choices");
 else {
  if(options.length!==4 || new Set(options.map(norm)).size!==4 || options.filter(o=>aliases.has(norm(o))).length!==1) mark("invalid_choices");
  const wrong=options.filter(o=>!aliases.has(norm(o))).map(norm).sort();
  if(wrong.length===3){const key=wrong.join("|");sets.set(key,[...(sets.get(key)||[]),q.id]);}
  if(/^\d+(?:\.\d+)?$/.test(q.answer) && options.some(o=>!/^\d+(?:\.\d+)?$/.test(o))) mark("numeric_option_type_mismatch");
 }
 if(q.review_status!=="approved") mark("editorial_review_required");
}
for(const ids of sets.values()) if(ids.length>1) for(const id of ids) findings.push({id,subject:questions.find(q=>q.id===id)?.subject||"",issue:"reused_distractor_set"});
const counts:Record<string,number>={};
for(const f of findings) counts[f.issue]=(counts[f.issue]||0)+1;
const report={total:questions.length,flagged:new Set(findings.map(f=>f.id)).size,counts,findings,note:"Heuristic triage of every bundled question, not factual verification. Same-type semantic choices and difficulty require editorial review."};
writeFileSync("learning-content-audit.json",JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({total:report.total,flagged:report.flagged,counts},null,2));
if(process.argv.includes("--strict") && findings.length) process.exitCode=1;
