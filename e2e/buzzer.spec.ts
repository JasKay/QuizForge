import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { Client } from "pg";
import { test as previewTest } from "./preview";

previewTest(
  "welcome and signup remain usable on a small phone",
  async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto("/");
    const start = page.getByRole("link", { name: "Get started", exact: true });
    await start.scrollIntoViewIfNeeded();
    const startBox = await start.boundingBox();
    expect(startBox!.y + startBox!.height).toBeLessThanOrEqual(640);
    await start.click();
    await expect(page).toHaveURL(/\/learn$/);
    await page.goto("/signup");
    const submit = page.getByRole("button", {
      name: "Create account",
      exact: true,
    });
    await submit.scrollIntoViewIfNeeded();
    const submitBox = await submit.boundingBox();
    expect(submitBox!.y + submitBox!.height).toBeLessThanOrEqual(640);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
  },
);

test("Buzzer accounts persist learning, teams join by code, and captains arrange a live match", async ({
  browser,
  baseURL,
}) => {
  test.skip(
    process.env.RUN_BUZZER_LIVE !== "1",
    "Explicitly enabled account/database flow",
  );
  test.setTimeout(240000);
  const id = Date.now().toString(36),
    password = randomBytes(24).toString("base64url");
  const emails = [
    `buzzer-qa-${id}-one@example.com`,
    `buzzer-qa-${id}-two@example.com`,
  ];
  const contexts: BrowserContext[] = [];
  const roomCodes: string[] = [];
  async function context() {
    const c = await browser.newContext({
      baseURL,
      viewport: { width: 390, height: 844 },
    });
    if (process.env.VERCEL_OIDC_TOKEN)
      await c.route(`${baseURL}/**`, (route) =>
        route.continue({
          headers: {
            ...route.request().headers(),
            "x-vercel-trusted-oidc-idp-token": process.env.VERCEL_OIDC_TOKEN!,
          },
        }),
      );
    contexts.push(c);
    return c;
  }
  async function api(page: Page, url: string, body?: Record<string, unknown>) {
    return page.evaluate(
      async ({ url, body }) => {
        const r = await fetch(url, {
          method: body ? "POST" : "GET",
          headers: body ? { "Content-Type": "application/json" } : undefined,
          body: body ? JSON.stringify(body) : undefined,
        });
        return { status: r.status, data: await r.json() };
      },
      { url, body },
    );
  }
  async function signup(page: Page, email: string, name: string) {
    await page.goto("/signup");
    await page.getByLabel("Your name").fill(name);
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await expect(page).toHaveURL(/\/learn$/, { timeout: 60000 });
    await expect(
      page.getByRole("button", { name: "Start learning" }),
    ).toBeVisible();
  }
  let one: Page | undefined, two: Page | undefined;
  try {
    one = await (await context()).newPage();
    await one.goto("/");
    await expect(
      one.getByRole("heading", { name: /Big curiosity/ }),
    ).toBeVisible();
    expect((await api(one, "/api/learn")).status).toBe(200);
    const guestLesson = await api(one, "/api/learn?lesson=major-museums");
    await one.evaluate(
      (q) =>
        localStorage.setItem(
          "buzzer-guest-recall-v1",
          JSON.stringify([
            {
              questionId: q.id,
              answer: q.study.answer,
              correct: true,
              at: Date.now(),
            },
          ]),
        ),
      guestLesson.data.questions[0],
    );
    await signup(one, emails[0], "Buzzer QA One");
    const lesson = await api(one, "/api/learn?lesson=major-museums");
    expect(lesson.status).toBe(200);
    expect(lesson.data.questions).toHaveLength(5);
    await one.getByRole("button", { name: "Next topic" }).click();
    await one.getByRole("button", { name: /Start learning|Continue lesson/ }).click();
    await expect(one.getByRole("dialog")).toBeVisible();
    await one.getByRole("button", { name: /begin$/ }).click();
    for (const q of lesson.data.questions.slice(0, 3)) {
      await one.getByRole("button", { name: /Got it/ }).click();
      await one
        .getByRole("button", {
          name: new RegExp(
            q.study.answer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$",
          ),
        })
        .click();
      await one.getByRole("button", { name: "Continue", exact: true }).click();
    }
    for (const q of lesson.data.questions.slice(0, 3)) {
      await one.getByLabel("Your answer", { exact: true }).fill(q.study.answer);
      await one
        .getByRole("button", { name: "Check answer", exact: true })
        .click();
      await one.getByRole("button", { name: "Continue", exact: true }).click();
    }
    await expect(one.getByRole("dialog")).toContainText("3 of 3");
    await one
      .getByRole("button", { name: "Keep exploring", exact: true })
      .click();
    await one.reload();
    const saved = await api(one, "/api/learn");
    expect(saved.data.total).toBe(4);
    expect(saved.data.xp).toBe(40);
    expect(
      (
        await api(one, "/api/learn", {
          questionId: lesson.data.questions[0].id,
          answer: lesson.data.questions[0].study.answer,
        })
      ).data.xp,
    ).toBe(0);
    expect(saved.data.correct).toBeGreaterThanOrEqual(4);
    await one.screenshot({
      path: "artifacts/buzzer-functional-learn.png",
      fullPage: true,
    });
    await one.goto("/teams");
    await one
      .getByRole("button", { name: "Create a team", exact: true })
      .click();
    await one
      .getByLabel("Team name", { exact: true })
      .fill(`QA Thinkers ${id}`);
    await one.getByRole("button", { name: "Create team", exact: true }).click();
    await expect(
      one.getByRole("heading", { name: `QA Thinkers ${id}`, exact: true }),
    ).toBeVisible();
    const teamA = (await api(one, "/api/teams")).data.team;
    expect(teamA.stats.xp).toBe(40);
    expect(teamA.stats.active).toBe(1);
    two = await (await context()).newPage();
    await signup(two, emails[1], "Buzzer QA Two");
    expect((await api(two, "/api/learn")).data.total).toBe(0);
    await two.goto("/teams");
    await two
      .getByRole("button", { name: "Have an invite?", exact: false })
      .click();
    await two.getByLabel("Team invite code").fill(teamA.invite_code);
    await two.getByRole("button", { name: "Join team", exact: true }).click();
    await expect(
      two.getByRole("heading", { name: teamA.name, exact: true }),
    ).toBeVisible();
    expect(
      (
        await api(two, "/api/teams", {
          action: "update",
          name: "Unauthorized change",
        })
      ).status,
    ).toBe(403);
    expect((await api(two, "/api/teams", { action: "leave" })).status).toBe(
      200,
    );
    expect(
      (
        await api(two, "/api/teams", {
          action: "create",
          name: `QA Scholars ${id}`,
        })
      ).status,
    ).toBe(200);
    const teamB = (await api(two, "/api/teams")).data.team;
    expect(
      (
        await api(one, "/api/teams", {
          action: "challenge",
          opponent: teamB.id,
          scheduledAt: new Date(Date.now() + 3600000).toISOString(),
        })
      ).status,
    ).toBe(200);
    const challenge = (await api(two, "/api/teams")).data.challenges[0];
    expect(challenge.status).toBe("pending");
    expect(
      (
        await api(one, "/api/teams", {
          action: "respond",
          id: challenge.id,
          status: "accepted",
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await api(two, "/api/teams", {
          action: "respond",
          id: challenge.id,
          status: "accepted",
        })
      ).status,
    ).toBe(200);
    await one.reload();
    await expect(
      one.getByRole("heading", { name: teamA.name, exact: true }),
    ).toBeVisible();
    await one.locator(".bz-loading-line").waitFor({ state: "hidden" });
    for (
      let i = 0;
      i < 8 &&
      !(await one
        .getByRole("button", { name: "Open match room", exact: false })
        .isVisible());
      i++
    )
      await one.getByRole("button", { name: "Next page", exact: true }).click();
    await one
      .getByRole("button", { name: "Open match room", exact: false })
      .click();
    await expect(one).toHaveURL(/\/rooms\?code=/, { timeout: 30000 });
    await expect(
      one.getByRole("heading", { name: "Room ready" }),
    ).toBeVisible();
    const code = new URL(one.url()).searchParams.get("code")!;
    roomCodes.push(code);
    expect((await api(two, "/api/teams")).data.challenges[0].room_code).toBe(
      code,
    );
    const joined = await api(two, "/api/rooms", {
      action: "join",
      code,
      name: "Buzzer QA Two",
    });
    expect(joined.status).toBe(200);
    expect(
      joined.data.room.members.find(
        (m: { id: string }) => m.id === joined.data.room.me,
      ).team,
    ).toBe("B");
    const host = (await api(one, "/api/rooms?code=" + code)).data.room;
    expect(
      host.members.find((m: { id: string }) => m.id === host.me).team,
    ).toBe("A");
    expect(
      (
        await api(one, "/api/rooms", {
          action: "assign_team",
          code,
          member: joined.data.room.me,
          team: "A",
        })
      ).status,
    ).toBe(400);
    const guest = await (await context()).newPage();
    await guest.goto("/play");
    expect(
      (
        await api(guest, "/api/rooms", {
          action: "join",
          code,
          name: "Uninvited player",
        })
      ).status,
    ).toBe(400);
    await one.goto("/account");
    await expect(one.getByRole("heading", { name: /Hey,/ })).toBeVisible();
    await one.locator(".bz-loading-line").waitFor({ state: "hidden" });
    for (
      let i = 0;
      i < 8 &&
      !(await one
        .getByRole("button", { name: "Sign out", exact: false })
        .isVisible());
      i++
    )
      await one.getByRole("button", { name: "Next page", exact: true }).click();
    await one.getByRole("button", { name: "Sign out", exact: false }).click();
    await expect(one).toHaveURL(/\/$/);
    await one.goto("/login");
    await one.getByLabel("Email", { exact: true }).fill(emails[0]);
    await one.getByLabel("Password", { exact: true }).fill(password);
    await one.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(one).toHaveURL(/\/learn$/, { timeout: 60000 });
    expect((await api(one, "/api/learn")).data.total).toBe(4);
    await one.goto("/play");
    await expect(one.getByRole("heading", { name: /Know it/ })).toBeVisible();
    await one.screenshot({
      path: "artifacts/buzzer-functional-play.png",
      fullPage: true,
    });
    await one.goto("/teams");
    await expect(
      one.getByRole("heading", { name: teamA.name, exact: true }),
    ).toBeVisible();
    await one.screenshot({
      path: "artifacts/buzzer-functional-teams.png",
      fullPage: true,
    });
    expect(
      await one.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
  } finally {
    for (const c of contexts) await c.close();
    if (process.env.DATABASE_URL) {
      const db = new Client({ connectionString: process.env.DATABASE_URL });
      try {
        await db.connect();
        await db.query("begin");
        if (roomCodes.length)
          await db.query("delete from arena.rooms where code=any($1::text[])", [
            roomCodes,
          ]);
        await db.query(
          "delete from public.buzzer_user where email=any($1::text[])",
          [emails],
        );
        await db.query("commit");
      } catch (e) {
        await db.query("rollback").catch(() => {});
        throw e;
      } finally {
        await db.end();
      }
    }
  }
});
