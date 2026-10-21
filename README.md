# QuizForge

A mobile-first quiz arcade for academic teams preparing for competitions. Next.js 16, TypeScript, Tailwind 4, Radix/CVA UI, Recharts, and Neon Postgres. Independent HCASC-inspired preparation; no Honda or HCASC affiliation or endorsement.

## Play

- **Team rooms:** a moderator hosts, teammates join by code or link on their own phones, and everyone sees the same question. Up to 32 people including the moderator and viewers. Viewers follow questions and scores without buzzing.
- **Authoritative buzzers:** PostgreSQL locks the room row. The first valid server-processed buzz gets the floor and locks everyone else out. Device clocks never determine the winner.
- **Answers and moderation:** the winning player has five seconds to speak or type an answer. The database checks accepted alternatives and the deadline. A moderator can instead judge a spoken answer, reveal a question, advance the round, and run another round.
- **Team results:** scores, membership, and question results persist in Neon. The final screen includes a review of the round. Scoring, question time, round length and subject focus are configurable practice settings, not official competition rules.
- **Solo arcade:** Quick Play, Beat the Clock, Daily Five, category practice, incorrect-answer review, XP, combo points, optional sounds, and rematches.
- **Pass & Play:** a separate local mode for two people sharing one screen. It is distinct from online team rooms.

The bank contains 618 practice questions across more than 20 subjects, including original HBCU questions and attributed community material. It is an expanding training repository, not an official HCASC packet bank. If a subject has fewer questions than the selected round length, the room uses the available questions.

## Run locally

Requires Node 22.9+ (Node 24 recommended) and npm.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Solo play works without credentials and saves progress in that browser. Clearing browser storage removes solo progress. Shared team rooms require a Neon database.

This Windows workspace also has a portable runtime at `../.tools/node-v24.22.0-win-x64/`. Add it to PATH and use `npm.cmd` if PowerShell blocks npm.ps1.

## Neon setup

Provision Neon through the linked Vercel project's Storage/Marketplace integration. The current release uses the free Neon resource `quizforge-arena`, with the app and database in the US East region. Vercel injects `DATABASE_URL` into production, preview, and development. Never add a NEXT_PUBLIC prefix to a database URL or commit `.env.local`.

For a fresh checkout:

```sh
vercel link
vercel env pull .env.local --yes
npm run db:migrate
```

Confirm the intended Vercel project before changing remote resources. `npm run db:migrate` uses the direct `DATABASE_URL_UNPOOLED` when supplied and falls back to `DATABASE_URL`. It applies versioned SQL from `db/migrations/001_arena.sql`, records the migration, and seeds original questions in a transaction. Rerunning it does not duplicate questions. Migrations run as a separate release step, not automatically during every build.

For development without Vercel, set a Neon `DATABASE_URL` and preferably `DATABASE_URL_UNPOOLED` in `.env.local` using `.env.example` as the template. The runtime lazily initializes the Neon HTTP driver, so builds and solo play do not require a database connection. No Supabase connection is needed for team rooms.

The retained Supabase adapter/migrations are an optional earlier account integration. They are not provisioned for this release. Email login, cloud solo history, and its administrator CSV screen require that optional configuration; the primary experience uses guest play and Neon-backed team rooms.

## Room identity and security

- Guest identities use cryptographically random 256-bit tokens in HttpOnly, SameSite=Lax cookies. HTTPS uses Secure cookies. Only token hashes are stored in Neon. A guest identity lasts seven days; keep the same browser to retain your room identity and scores.
- Join codes are eight cryptographically generated hexadecimal characters. Rooms accept joins for 24 hours unless the moderator ends the room. A room code is an invitation; share it only with intended teammates.
- Route handlers derive identity from the cookie. Clients cannot choose their identity or moderator role, write scores, advance another host's room, or answer another player's buzz.
- State access requires membership. Answers and explanations are omitted from the current-question payload until the moderator or a valid response resolves it. The static original solo demonstration bank is public learning content; private questions added to Neon are not bundled into the browser.
- All room mutations run in database functions with row locks, expected question indexes, deadline checks, and one result per question/run. Repeating a submitted answer cannot award points twice.
- Mutations require a matching Origin. Requests have size limits, validated codes and settings, and per-guest database action limits. The browser never receives DATABASE_URL. The `arena` schema is server-only, with PUBLIC privileges revoked.
- State refreshes about every 1.2 seconds while the tab is visible and immediately after actions. Hidden tabs pause polling. A returning tab refreshes and reconnects. This is synchronized HTTP polling, not a WebSocket push service. Network latency affects when a buzz reaches the server, as it does in other remote buzzer systems.
- The question clock starts when the moderator opens it. Buzzing opens a separate five-second answer clock. The server enforces both; on-screen clocks use the reported server time for display.
- Rooms, answers, and scores are persisted, but persistent email accounts, institutional teams, assignments and coach analytics are not part of this guest-room release. Solo/local Pass & Play attempts remain browser-local unless the optional account adapter is configured.

## Mobile design

The phone layout has compact entry content, fixed bottom navigation with safe-area padding, large buzzers and tap targets, and 16px inputs to prevent iOS input zoom. The app includes a standalone web manifest and an SVG icon for supported home-screen installs. It requires a connection for team rooms; it does not offer offline multiplayer.

Design references informed quick entry, friend challenges, and readable question screens rather than copied branding or game mechanics: [Trivia Crack Challengers](https://about.triviacrack.com/challengers) and [Sporcle challenges](https://support.sporcle.com/hc/en-us/articles/34080386114573-What-is-a-Challenge-and-how-does-it-work). QuizForge focuses on moderator-led team preparation and shared questions across devices.

## Verify

```sh
npm test
npm run typecheck
npm run build
npm run test:e2e
```

The unit/integration suite executes real PostgreSQL logic in PGlite and checks room permissions, answer secrecy, buzzer lockout, replay-safe scoring, deadlines, session transitions, CSV parsing, answer matching, arcade scoring and the legacy adapter's policies.

Browser tests use Microsoft Edge by default (`PLAYWRIGHT_CHANNEL` can select another installed Playwright channel). To include the real Neon test, enable `RUN_LIVE_ROOMS=1`. This test opens separate browser contexts for a moderator, two players and a viewer, checks shared questions, races simultaneous buzz requests, verifies viewer/CSRF restrictions, answers the question, reloads saved results, and starts a rematch. It creates and then closes its own small QA room.

PowerShell:

```powershell
$env:RUN_LIVE_ROOMS = '1'
npm.cmd run test:e2e
```

To verify an already deployed build without starting a local server:

```powershell
$env:PLAYWRIGHT_BASE_URL = 'https://YOUR-DEPLOYMENT.vercel.app'
$env:RUN_LIVE_ROOMS = '1'
npx.cmd playwright test e2e/rooms.spec.ts
```

Browser screenshots are written to ignored `artifacts/`. Guest cookies, environment files, dependency folders, build output, and local provider skills are excluded from Git and deployment source.

## GitHub and Vercel

The repository is private: https://github.com/JasKay/QuizForge. The Vercel project is `quizforge` in `kay-jasanyas-projects`, linked to that repository with the application at the repository root. The production branch is `main`. Vercel builds Next.js with Node 24; Neon credentials are configured through its project integration.

Before releasing schema changes: test them, apply the migration to the intended Neon database, then push the verified commit. Vercel's Git integration builds the pushed source. There are no payments or subscriptions in the app.

## Next product work

Expand the reviewed question bank, add durable institutional teams and coach assignments, introduce richer competition formats, and add email-backed identity and recovery for users who want permanent cross-device solo history. The current team mode is moderator-led and short-answer; it is not an officially scored HCASC competition simulator.
## Growing question library

Public site: https://hcascquiz.vercel.app

The bundled bank now includes 18 original questions (including HBCU history) and 600
community questions across more than 20 subjects. Each community prompt includes its
answer choices, provenance and CC BY-SA 4.0 attribution; see QUESTION-LICENSE.md.
These community answers have not been independently fact-checked into an official
competition packet. No finite collection is inexhaustible.

Grow the bundled library without repeating imported prompts:
```sh
npm run bank:expand -- 10
npm test
npm run db:migrate
```
Commit and deploy the resulting JSON so both solo and room play receive the new set.
Rooms prioritize questions not yet used in that room before recycling a category.

For your own reviewed CSV packs (same columns as lib/csv.ts):
```sh
npm run bank:import -- path/to/questions.csv
npm run bank:import -- path/to/reviewed-questions.csv --approve
```
The first command stores new questions as pending; the second enables new reviewed
rows for team rooms. This operator command uses server credentials; visitors cannot
approve questions. Existing imported IDs are skipped, not silently overwritten.
Operator CSV imports are Neon room content; to add them to solo play, add their data
to the bundled repository and deploy. Allowed subjects are declared in lib/questions.ts.

## Spoken practice

The moderator reads the question (optionally using the Read question aloud button)
and opens buzzers afterward. The default buzz window is three seconds, configurable
for training. The first valid buzz is shown on every device with all other players locked out.
The winning player gets a server-enforced five-second answer window; a visible-room
poll also resolves an unanswered expired buzz.

Players explicitly enable their mic before buzzing. Only the winner's mic records.
Supported browsers transcribe using their built-in speech service, which can process
audio through the browser vendor's servers. The first final response is sent automatically,
or the short capture is sent before the deadline with the available partial transcript.
Short clips and transcripts are shared with room members for playback after submission;
this is recorded answer sharing, not a continuous voice call.
Clips are bounded to 135 KB and are private to the room. Old clips are deleted on a new-room
creation after 24 hours; no recordings are kept in browser storage or the public bank.

Without speech recognition, the audio recording still works and the moderator judges it.
Without microphone access, players can type within the same deadline.
Recognition mistakes produce a provisional score; the moderator can correct a timely
spoken answer while that question remains resolved, with score-delta updates that cannot
double-award points. An expired or absent answer cannot be corrected into a timely voice answer.

This is HCASC-inspired practice, not a complete official tournament simulation.
The official rules require immediate Face-Off answers after recognition; five seconds
is the requested training allowance. Bonus pairs, team representatives, turnovers and
the full Ultimate Challenge structure are not implemented by this room mode.
Rules reference: https://ffl.hcasc.com/pub/gamerules.asp

Browser tests exercise real MediaRecorder capture with a synthetic microphone and a
deterministic speech-recognition substitute. This verifies permission/capture/submission,
shared audio, transcription handling and moderation, not a vendor's recognition accuracy
for a real person's accent. Try an actual microphone on your target mobile browser.

## Focused mobile play

Active rounds hide the site navigation, invites, roster sidebar, and decorative content.
The question, countdown, buzzer and answer field remain together. A small Scores menu
and collapsed Answer options keep secondary controls available on the same screen.
Long questions scroll within their text region so the buzzer remains accessible.
Voice mode shows a speaking prompt instead of a competing typing form; switch through
Answer options. Solo rounds use the same reduced navigation treatment.
The mobile lobby uses compact mode tiles; host round settings are optional disclosures.