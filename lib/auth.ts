import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { Pool } from "pg";

function createAuth() {
  if (!process.env.BETTER_AUTH_SECRET || !process.env.DATABASE_URL)
    throw Error(
      "Accounts are temporarily unavailable. Please try again shortly.",
    );
  return betterAuth({
    appName: "Buzzer!",
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    database: new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 3,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
    },
    user: { modelName: "buzzer_user", deleteUser: { enabled: true } },
    session: { modelName: "buzzer_session", expiresIn: 60 * 60 * 24 * 14 },
    account: { modelName: "buzzer_account" },
    verification: { modelName: "buzzer_verification" },
    rateLimit: {
      enabled: true,
      storage: "database",
      modelName: "buzzer_rate_limit",
      window: 60,
      max: 30,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 60, max: 3 },
      },
    },
    plugins: [nextCookies()],
  });
}
let instance: ReturnType<typeof createAuth> | undefined;
export function getAuth() {
  return (instance ??= createAuth());
}
