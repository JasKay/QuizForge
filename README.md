# Trivia

Mobile trivia practice at https://hcascquiz.vercel.app.
The GitHub repository and Vercel project retain their original QuizForge identifiers.

## Screens

- Quick play: five multiple-choice questions. No buzzer, question card, category tags or difficulty labels.
- Categories: choose a subject and difficulty, see the matching count, then start.
- Ultimate Challenge: ten spoken-answer questions on one topic, sixty seconds, twenty-five points each. Passes and misses recycle.
- Team Rooms: paste a room link/code or create a room. The creator is a playing host, not a question reader.
- My Profile: device progress, accuracy, streak, best Ultimate score, name editing and missed-answer review.

The small header and four home tiles replace bottom navigation. Main screens use the available visual viewport, including when a setup form opens the phone keyboard. Active games hide the app header. Questions use plain text; no decorative question boxes.

## Team play

Every room has Team A and Team B. The host starts on A; joining players go to the smaller side. The host can move players before starting. Both teams must contain a player, with sizes differing by at most one. Assignment is locked during a round.

The app narrates the question using browser speech synthesis. A tinted reading overlay highlights the words. Buzzers remain closed until reading ends, with a server-enforced minimum reading period. If a browser blocks audio, a tap starts narration; unavailable speech falls back to paced visual reading. A large blue buzzer opens afterward. All devices see who won the buzz; only that player can answer within five seconds. Host players use the same lockout, deadline and scoring.

Spoken answers are optional in team rooms. Enable the microphone under Answer options before play. Room-private recorded clips and transcripts are shared; the host can correct a timely recognized answer without awarding points twice. Speech accuracy and support depend on the browser. Ultimate Challenge requires browser speech recognition and microphone permission; setup happens before the clock starts.

## Development

Node 24 and npm are used. Install dependencies with npm install.
Copy .env.example to .env.local and configure the Neon connection.
Never commit .env.local or database credentials.

Commands:

- npm run dev — local development
- npm run build — production build and TypeScript
- npm test — backend/unit tests, including PGlite database invariants
- npm run db:migrate — idempotent Neon migrations and question seeding
- npm run test:e2e — Edge/Playwright browser checks

Set RUN_LIVE_ROOMS=1 to include real shared-room tests.
Set PLAYWRIGHT_BASE_URL to verify an external deployment.
Browser tests use a synthetic microphone and deterministic narration/recognition substitutes; they verify lifecycle and scoring, not recognition accuracy for every accent or device.

## Data and deployment

Next.js serves the UI and server-only room API. Neon stores rooms, guest membership, teams, buzz locks, answers, scores and bounded voice clips. The API checks origin and membership; HttpOnly guest tokens are hashed in storage. Correct answers stay hidden until resolution. Team operations and scoring are enforced in PostgreSQL.

The bank contains original questions and attributed community questions. See QUESTION-LICENSE.md. Import and expansion scripts remain available for maintaining the bank.

Deployment uses the linked Vercel project. A production CLI deployment updates hcascquiz.vercel.app. Git push alone may not trigger a deployment.

This is independent HCASC-inspired practice, not an official tournament product.
