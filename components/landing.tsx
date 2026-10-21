import { GameHeader } from "./game-header";
import { GameLobby } from "./game-lobby";
export function Landing({
  name,
  correct = 0,
  total = 0,
}: {
  name?: string;
  correct?: number;
  total?: number;
}) {
  return (
    <div className="arcade">
      <GameHeader name={name} xp={correct * 100} />
      <main className="game-container">
        <GameLobby name={name} correct={correct} total={total} />
      </main>
      <footer className="game-footer">
        <span>
          Made for the love of the game. <span>✳</span>
        </span>
        <span>Growing question library · Independent of Honda & HCASC</span>
      </footer>
    </div>
  );
}
