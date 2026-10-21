export type Attempt = {
  id: string;
  question_id: string;
  correct: boolean;
  elapsed_ms: number;
  created_at: string;
  subject: string;
  answer: string;
  session_id?: string;
};
export type Profile = { name: string; role: string; email: string; id: string };
export type Result = {
  correct: boolean;
  answer: string;
  explanation: string;
  source: string;
};
