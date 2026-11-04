import { Client } from "pg";
import { readFileSync, existsSync } from "node:fs";
type Question = {id:string;text:string;answer:string;alternatives:string[];explanation:string;subject:string;difficulty:string;source:string;review_status:string};
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const urlString=process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if(!urlString) throw Error("DATABASE_URL is required.");
const url=new URL(urlString);
url.searchParams.set("sslmode","verify-full");
const db=new Client({connectionString:url.toString()});
const community=JSON.parse(readFileSync("lib/community-questions.json","utf8")) as Question[];
const normalized=(s:string)=>s.normalize("NFKC").toLowerCase().replace(/[^\\p{L}\\p{N}]+/gu," ").trim();
const seen=new Set<string>();
async function main(){
 await db.connect();
 let inserted=0, skipped=0;
 try {
  await db.query("begin");
  for(const q of community){
   const stem=q.text.split(/\\s+Choices:\\s+/)[0].trim();
   const choices=q.text.includes(" Choices: ")?q.text.split(" Choices: ")[1].split(" · ").map(s=>s.trim()):[];
   const key=normalized(stem);
   if(!key || seen.has(key) || stem.length<12 || !q.answer || !q.subject || !q.source?.startsWith("https://") ||
      (choices.length!==4 || new Set(choices.map(normalized)).size!==4 || !choices.some(c=>normalized(c)===normalized(q.answer)))){
     skipped++;continue;
   }
   seen.add(key);
   const result=await db.query(
    "insert into arena.questions(id,text,answer,alternatives,explanation,subject,difficulty,source,review_status) values($1,$2,$3,$4,$5,$6,$7,$8,'pending') on conflict(id) do nothing",
    [q.id,q.text,q.answer,q.alternatives||[],q.explanation,q.subject,q.difficulty,q.source]
   );
   inserted+=result.rowCount||0;
  }
  await db.query("commit");
  const counts=await db.query("select review_status,count(*)::integer as count from arena.questions group by review_status order by review_status");
  console.log(JSON.stringify({importedPending:inserted,skipped,byStatus:counts.rows},null,2));
 }catch(e){await db.query("rollback");throw e;}finally{await db.end();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
