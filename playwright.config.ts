import { defineConfig } from "@playwright/test";
const external = process.env.PLAYWRIGHT_BASE_URL;
export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: external || "http://127.0.0.1:3087",
    headless: true,
    actionTimeout: 15000,
    navigationTimeout: 25000,
    launchOptions: {
      args: [
        "--use-fake-ui-for-media-stream",
        "--use-fake-device-for-media-stream",
      ],
    },
    channel: process.env.PLAYWRIGHT_CHANNEL || "msedge",
  },
  workers: 1,
  webServer: external
    ? undefined
    : {
        command:
          process.platform === "win32"
            ? "npm.cmd run start -- --port 3087"
            : "npm run start -- --port 3087",
        url: "http://127.0.0.1:3087",
        reuseExistingServer: false,
      },
  reporter: "list",
});
