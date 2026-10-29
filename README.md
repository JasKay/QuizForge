# Buzzer!

Mobile trivia practice at https://hcascquiz.vercel.app.
The GitHub repository and Vercel project retain their original QuizForge identifiers.

## Screens

- Welcome and email/password signup: personal accounts, independent of school affiliation.
- Learn: guided themed sessions, server-checked answers, saved progress and spaced review.
- Play: guest-friendly Quick Play, categories, Ultimate Challenge and shared rooms.
- Mastery: category power, difficulty-weighted XP, permanent levels, seven-day trends, strengths and targeted learning/game links.
- Team: a shared weekly goal, each member’s strengths and practice focus, daily cheers, and university match invitations. Create or join by code, invite members, save an optional school affiliation, run team practice and arrange friendly matches. Captains accept/decline invitations and open accepted match rooms.
- Account: saved recall progress, name editing and sign-out. Device game history remains available separately.

- Quick play: five multiple-choice questions with a small category label on each question.
- Categories: choose a subject and difficulty, see the matching count, then start.
- Ultimate Challenge: ten spoken-answer questions sharing one specific theme, sixty seconds, fifty points each. Passes and misses recycle. Topic cards and each question include a short summary.
- Team Rooms: paste a room link/code or create a room. The creator is a playing host, not a question reader.
- My Profile: device progress, accuracy, streak, best Ultimate score, name editing and missed-answer review.

Learn, Play, Mastery and Team use the Buzzer! charcoal, ivory and lime design with bottom navigation. Active game screens hide the app header. Guest games remain available without registration.

## Team play

Every room has Team A and Team B. The host starts on A; joining players go to the smaller side. The host can move players before starting. Both teams must contain a player, with sizes differing by at most one. Assignment is locked during a round.

Team Rooms retain the original shared-question format. HCASC practice now has three four-minute rounds, four categories and three Face-Off/Bonus pairs per category, followed by a team Ultimate Challenge for each side. A different player represents each team in each Face-Off round; small practice rosters reuse players. University matches require three active players per side; other teammates can join as spectators.

The first category picker is randomized. In later rounds the trailing team picks first; ties are randomized. The team that answers a Face-Off correctly gets a 20-point team bonus and chooses the next category. Face-Offs earn 10 points. Bonuses allow five seconds to confer after narration. Face-Off buzz windows last three seconds, followed by a five-second answer deadline; turnovers retain a second buzz step as a digital practice aid. A pair selected before the round clock expires is completed. Exhausted boards also advance the round.

The final board offers four specific themes. The trailing team goes first, picks a theme and immediately starts its 60-second clock. Ten questions earn 50 points each; misses and passes recycle. The second team chooses from the remaining three themes and always gets its turn. Ties continue with sudden-death Face-Offs (the automatically selected representatives play), worth 10 points. Type answers or use browser speech recognition in the final round.

Format reference: [HCASC Game Format](https://ffl.hcasc.com/games/gameformat.asp); timing/representatives reference: [HCASC Game Rules](https://ffl.hcasc.com/pub/gamerules.asp). Public HCASC pages disagree on older 25-point versus 50-point Ultimate scoring; this app uses the 50-point format, matching its existing solo Ultimate mode. Practice questions are independently authored/community material. Bonuses are paired by subject, not official authored tournament packets. Browser narration and automated answer matching are practice substitutes for a live moderator.

Selecting a question immediately starts browser speech synthesis on each device; there is no extra host reading/start step or fixed one-second delay. Other devices receive it on their next room poll (normally within 1.2 seconds). A tinted reading overlay highlights the words. Buzzers remain closed until reading ends, with a server-enforced minimum reading period. If a browser blocks audio, a tap starts narration; unavailable speech falls back to paced visual reading. A large blue buzzer opens afterward. All devices see who won the buzz; only that player can answer within five seconds. Host players use the same lockout, deadline and scoring.

After a first-team miss, the correct answer stays hidden and the host passes the question to the other team. Only that team may buzz for the second attempt. A correct response or two misses completes the question; the host advances. Each attempt is retained separately, including voice clips and score corrections.

Short synthesized sounds distinguish correct and incorrect answers in every mode. They are on by default, unlock on the first interaction, and can be muted under My Profile. Shared room outcomes play once per answer on each device.

Spoken answers are optional in team rooms. Enable the microphone under Answer options before play. Room-private recorded clips and transcripts are shared; the host can correct a timely recognized answer without awarding points twice. Speech accuracy and support depend on the browser. Ultimate Challenge requires browser speech recognition and microphone permission; setup happens before the clock starts.

## Connected Mastery

Learn, category games, solo Ultimate and signed-in room answers feed `buzzer.mastery_events`. Answers are server-graded; event IDs deduplicate retries, and room corrections edit the original evidence transactionally. Only actual responders receive personal room credit. Missed room answers also enter Learn review. Guest Learn/solo events persist on the device and import on sign-in; pending writes retry when returning to Learn or Mastery. Guest shared-room play requires signing in **before joining** to earn account Mastery.

Easy/medium/hard answers earn 10/20/40 XP, once per question per 24 hours. XP and levels never decrease. Power uses bounded per-question evidence, difficulty and recall context; same-day repeats have a small effect, misses reduce evidence, and evidence halves over 30 days after a seven-day grace period. Review rebuilds recall. Power is capped at 99 and is not a completion percentage or an official rating. Weekly trends recompute the same formula at each historical day. Earlier learning progress supplies only a last-observed baseline, not invented historical attempts.

Teammates share a rolling seven-day goal of 50 different correct player/question pairs across all modes. Members can cheer another member once per UTC day. School affiliations are self-declared; challenge rooms reserve sides for the invited teams’ signed-in members.

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

Apply `011_mastery` and `012_hcasc_complete` using `npm run db:migrate` before deploying this version. The migration runner also seeds the Ultimate theme table. No database credentials are included in the repository.

Set RUN_LIVE_ROOMS=1 to include real shared-room tests.
Set PLAYWRIGHT_BASE_URL to verify an external deployment.
The connected Mastery browser test uses the real guest learning API. Team browser fixtures test UI interactions; `hcasc-reading.spec.ts` uses actual PGlite room functions behind a browser API adapter. A live Neon/auth deployment still needs a credentialed smoke test.
Browser tests use a synthetic microphone and deterministic narration/recognition substitutes; they verify lifecycle and scoring, not recognition accuracy for every accent or device.

## Data and deployment

Next.js serves the UI and server-only room API. Neon stores rooms, guest membership, teams, buzz locks, answers, scores and bounded voice clips. The API checks origin and membership; HttpOnly guest tokens are hashed in storage. Correct answers stay hidden until resolution. Team operations and scoring are enforced in PostgreSQL.

The bank contains original questions and attributed community questions. See QUESTION-LICENSE.md. Import and expansion scripts remain available for maintaining the bank.

Deployment uses the linked Vercel project. A production CLI deployment updates hcascquiz.vercel.app. Git push alone may not trigger a deployment.

This is independent HCASC-inspired practice, not an official tournament product.
