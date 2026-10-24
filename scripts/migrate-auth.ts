import { existsSync } from "node:fs";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
async function main() {
  const { getAuth } = await import("../lib/auth");
  const { getMigrations } = await import("better-auth/db/migration");
  const { runMigrations } = await getMigrations(getAuth().options);
  await runMigrations();
  console.log("Buzzer! account schema is ready.");
  process.exit(0);
}
main().catch((error) => {
  console.error(
    "Account migration failed. Check the database connection and auth configuration.",
  );
  console.error({code:error.code||error.name,message:String(error.message).replace(/postgres(?:ql)?:\/\/\S+/g,'[database URL redacted]')});
  process.exit(1);
});
