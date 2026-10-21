import { writeFileSync } from "node:fs";
import { questions } from "../lib/questions";
const quote = (v: string) => "'" + v.replaceAll("'", "''") + "'";
const array = (values: string[]) =>
  `ARRAY[${values.map(quote).join(",")}]::text[]`;
const columns = [
  "id",
  "text",
  "answer",
  "alternatives",
  "explanation",
  "subject",
  "subcategory",
  "difficulty",
  "source",
  "tags",
  "format",
  "review_status",
] as const;
writeFileSync(
  "supabase/seed.sql",
  "-- Original demonstration questions. References are attached to each row.\nINSERT INTO public.questions (" +
    columns.join(",") +
    ") VALUES\n" +
    questions
      .map(
        (q) =>
          "(" +
          columns
            .map((k) =>
              Array.isArray(q[k])
                ? array(q[k] as string[])
                : quote(q[k] as string),
            )
            .join(",") +
          ")",
      )
      .join(",\n") +
    "\nON CONFLICT (id) DO NOTHING;\n",
);
