export type RoomMember = {
  id: string;
  name: string;
  role: "moderator" | "player" | "spectator";
  score: number;
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
  winner: string | null;
  opened_at: string | null;
  locked_at: string | null;
  version: number;
  server_time: string;
  me: string;
  my_role: RoomMember["role"];
  members: RoomMember[];
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
