export type RoomMember = {
  id: string;
  name: string;
  role: "moderator" | "player" | "spectator";
  score: number;
  team: "A" | "B" | null;
};
export type RoomState = {
  id: string;
  code: string;
  title: string;
  status: "waiting" | "open" | "locked" | "resolved" | "finished";
  index: number;
  total: number;
  focus: string | null;
  seconds: number;
  correct_points: number;
  incorrect_points: number;
  armed: boolean;
  attempt: 1 | 2;
  steal_available: boolean;
  steal_team: "A" | "B" | null;
  outcome: { id: string; correct: boolean } | null;
  reading_started_at: string | null;
  read_until: string | null;
  winner: string | null;
  opened_at: string | null;
  locked_at: string | null;
  version: number;
  server_time: string;
  me: string;
  my_role: RoomMember["role"];
  members: RoomMember[];
  mode?: "classic" | "hcasc";
  round?: number;
  round_started_at?: string | null;
  round_ends_at?: string | null;
  pick_team?: "A" | "B" | null;
  hcasc_phase?:
    "classic" | "pick" | "question" | "ultimate_pick" | "ultimate" | "finished";
  sudden_death?: boolean;
  question_kind?: "faceoff" | "bonus";
  bonus_team?: "A" | "B" | null;
  representatives?: { A: string; B: string };
  ultimate_team?: "A" | "B";
  ultimate_sequence?: number;
  ultimate_cleared?: number;
  ultimate_feedback?: { correct: boolean; passed: boolean } | null;
  ultimate_question?: { id: string; text: string; subject: string } | null;
  final_categories?: {
    id: string;
    title: string;
    description: string;
    selected_by: string | null;
  }[];
  board?: {
    category: string;
    slots: { slot: number; available: boolean }[];
  }[];
  question: {
    id: string;
    text: string;
    subject: string;
    difficulty: string;
    choices: string[];
  } | null;
  voice: {
    audio: string;
    mime: string;
    transcript: string;
    needs_review: boolean;
    timely: boolean;
  } | null;
  result: {
    answer: string;
    explanation: string;
    source: string;
    correct: boolean;
    response: string;
  } | null;
  review:
    | {
        question: string;
        subject: string;
        answer: string;
        explanation: string;
        source: string;
        correct: boolean;
        points: number;
      }[]
    | null;
};
