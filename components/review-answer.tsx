"use client";
import { useState, useEffect } from "react";
import { configured, supabase } from "@/lib/supabase";
import type { Question } from "@/lib/questions";
import type { Result } from "@/lib/types";
export function ReviewAnswer({ question }: { question: Question }) {
  const [data, setData] = useState<Result | null>(
      configured
        ? null
        : {
            correct: false,
            answer: question.answer,
            explanation: question.explanation,
            source: question.source,
          },
    ),
    [error, setError] = useState("");
  useEffect(() => {
    if (!supabase) return;
    supabase
      .rpc("review_answer", { question_id: question.id })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setData(data);
      });
  }, [question.id]);
  return error ? (
    <p role="alert">{error}</p>
  ) : data ? (
    <div className="review-answer">
      <strong>{data.answer}</strong>
      <p>{data.explanation}</p>
      <a href={data.source} target="_blank" rel="noreferrer">
        Source reference ↗
      </a>
    </div>
  ) : (
    <p>Loading explanation…</p>
  );
}
