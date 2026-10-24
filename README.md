# Buzzer!

Mobile trivia practice at https://hcascquiz.vercel.app.
The GitHub repository and Vercel project retain their original QuizForge identifiers.

## Screens

- Welcome and email/password signup: personal accounts, independent of school affiliation.
- Learn: guided themed sessions, server-checked answers, saved progress and spaced review.
- Play: guest-friendly Quick Play, categories, Ultimate Challenge and shared rooms.
- Teams: create or join by code, invite members, save an optional school affiliation, run team practice and arrange friendly matches. Captains accept/decline invitations and open accepted match rooms.
- Account: saved recall progress, name editing and sign-out. Device game history remains available separately.

- Quick play: five multiple-choice questions with a small category label on each question.
- Categories: choose a subject and difficulty, see the matching count, then start.
- Ultimate Challenge: ten spoken-answer questions sharing one specific theme, sixty seconds, fifty points each. Passes and misses recycle. Topic cards and each question include a short summary.
- Team Rooms: paste a room link/code or create a room. The creator is a playing host, not a question reader.
- My Profile: device progress, accuracy, streak, best Ultimate score, name editing and missed-answer review.

Learn, Play and Teams use the Buzzer! charcoal, ivory and lime design with bottom navigation. Active game screens hide the app header. Guest games remain available without registration.

## Team play

Every room has Team A and Team B. The host starts on A; joining players go to the smaller side. The host can move players before starting. Both teams must contain a player, with sizes differing by at most one. Assignment is locked during a round.

Team Rooms retain the original shared-question format and also offer an HCASC-style tournament: three four-minute rounds, four categories per round, alternating team question picks, a first-to-buzz answer, and one opposing-team chance after a miss. If both teams miss, play returns to the board. The creator remains a playing host, not a question reader.

The app narrates questions using browser speech synthesis. A tinted reading overlay highlights the words. Buzzers remain closed until reading ends, with a server-enforced minimum reading period. If a browser blocks audio, a tap starts narration; unavailable speech falls back to paced visual reading. A large blue buzzer opens afterward. All devices see who won the buzz; only that player can answer within five seconds. Host players use the same lockout, deadline and scoring.

After a first-team miss, the correct answer stays hidden and the host passes the question to the other team. Only that team may buzz for the second attempt. A correct response or two misses completes the question; the host advances. Each attempt is retained separately, including voice clips and score corrections.

Short synthesized sounds distinguish correct and incorrect answers in every mode. They are on by default, unlock on the first interaction, and can be muted under My Profile. Shared room outcomes play once per answer on each device.

Spoken answers are optional in team rooms. Enable the microphone under Answer options before play. Room-private recorded clips and transcripts are shared; the host can correct a timely recognized answer without awarding points twice. Speech accuracy and support depend on the browser. Ultimate Challenge requires browser speech recognition and microphone permission; setup happens before the clock starts.

## Development

Node 24 and npm are used. Install dependencies with npm install.
Copy .env.example to .env.local and configure the Neon connection.
Set a random BETTER_AUTH_SECRET (at least 32 characters) and BETTER_AUTH_URL to the app origin. Run `npx tsx scripts/migrate-auth.ts` before `npm run db:migrate` to create the account schema, then the learning/team tables. Preview deployments infer their auth origin when BETTER_AUTH_URL is unset.
Google login, email recovery and official school verification are not enabled. Friendly matches and self-declared school affiliation work with email/password accounts.
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
