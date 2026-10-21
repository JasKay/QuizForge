"use client";
import { GameHeader } from "./game-header";
import { GameLobby } from "./game-lobby";
export function Landing(p: {
  name?: string;
  correct?: number;
  total?: number;
}) {
  return (
    <div className="arcade trivia-app">
      <GameHeader />
      <main className="trivia-main">
        <GameLobby {...p} />
      </main>
    </div>
  );
}
