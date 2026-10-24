import { test as base, expect } from "@playwright/test";
export const test = base.extend({
  page: async ({ page, baseURL }, use) => {
    if (process.env.VERCEL_OIDC_TOKEN && baseURL)
      await page.route(`${baseURL}/**`, (route) =>
        route.continue({
          headers: {
            ...route.request().headers(),
            "x-vercel-trusted-oidc-idp-token": process.env.VERCEL_OIDC_TOKEN!,
          },
        }),
      );
    await use(page);
  },
});
export { expect };
export type { Page } from "@playwright/test";
