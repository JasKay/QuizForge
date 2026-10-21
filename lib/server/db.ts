import "server-only";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
let connection: NeonQueryFunction<false, false> | null = null;
export function databaseReady() {
  return Boolean(process.env.DATABASE_URL);
}
export function database() {
  if (!process.env.DATABASE_URL)
    throw Error("Team rooms are not available yet.");
  if (!connection) connection = neon(process.env.DATABASE_URL);
  return connection;
}
