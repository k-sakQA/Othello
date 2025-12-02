import { chromium } from "@playwright/test";

const LOGIN_URL = process.env.LOGIN_URL || "http://localhost:3000/login";
const DASHBOARD_URL_PATTERN =
  process.env.DASHBOARD_URL_PATTERN || "**/dashboard";
const AUTH_STATE_PATH = process.env.AUTH_STATE_PATH || "auth.json";

async function main() {
  const browser = await chromium.launch({
    headless: false,
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  console.log("Opening login page...");
  await page.goto(LOGIN_URL);

  console.log("Please log in manually and complete any MFA prompts.");
  console.log(
    "After successful login, wait until redirected to the application's home/dashboard page."
  );

  console.log(
    `Waiting for authenticated page that matches: ${DASHBOARD_URL_PATTERN}`
  );
  await page.waitForURL(DASHBOARD_URL_PATTERN, { timeout: 0 });

  console.log("Login detected. Saving authenticated browser state...");
  await context.storageState({ path: AUTH_STATE_PATH });

  console.log(`${AUTH_STATE_PATH} has been saved/updated.`);
  await browser.close();
}

main();
