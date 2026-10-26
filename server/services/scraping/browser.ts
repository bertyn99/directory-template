import type { Browser, BrowserContext, Page } from "playwright";
import { chromium } from "playwright";

let browserInstance: Browser | null = null;

/**
 * Get or create a browser instance (singleton pattern)
 */
export async function getBrowser(): Promise<Browser> {
  if (!browserInstance) {
    let executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined;
    // Auto-detect system Chromium when no explicit path set (e.g. Nixpacks nixPkgs chromium)
    if (!executablePath) {
      try {
        const { execSync } = await import("node:child_process");
        executablePath =
          execSync("which chromium 2>/dev/null || which chromium-browser 2>/dev/null", {
            encoding: "utf-8",
          }).trim() || undefined;
      } catch {
        /* no system chromium found */
      }
    }
    browserInstance = await chromium.launch({
      headless: true,
      executablePath,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
  }
  return browserInstance;
}

/**
 * Create a new browser context
 */
export async function createContext(): Promise<BrowserContext> {
  const browser = await getBrowser();
  return browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  });
}

/**
 * Wait for meaningful content to appear on the page.
 * Handles JS SPAs that render content after initial HTML load.
 * Falls through silently after timeout — caller extracts whatever is available.
 */
async function waitForContent(page: Page, timeout: number = 8000): Promise<void> {
  try {
    await page.waitForFunction(
      () => {
        const body = document.body;
        if (!body) return false;
        const text = body.innerText || body.textContent || "";
        // Need at least 100 chars of visible text
        if (text.trim().length < 100) return false;
        // And at least one content element
        return !!document.querySelector(
          "h1, h2, p, article, main, [role='main'], .content, #content",
        );
      },
      { timeout },
    );
  } catch {
    // Content didn't appear within timeout — proceed with whatever we have.
    // The scraper will extract partial data or return empty fields.
  }
}

/**
 * Navigate to a URL with retry logic.
 * Uses domcontentloaded (not networkidle) for reliability with JS SPAs,
 * then waits for actual content to render before returning.
 */
export async function navigateWithRetry(
  page: Page,
  url: string,
  maxRetries: number = 3,
  retryDelay: number = 2000,
): Promise<void> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await waitForContent(page);
      return;
    } catch (error) {
      lastError = error as Error;
      console.warn(`Navigation attempt ${attempt}/${maxRetries} failed for ${url}:`, error);

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay * attempt));
      }
    }
  }

  throw new Error(
    `Failed to navigate to ${url} after ${maxRetries} attempts: ${lastError?.message}`,
  );
}

/**
 * Extract JSON data from __NEXT_DATA__ script tag
 */
export async function extractNextJsData(page: Page): Promise<unknown> {
  const scriptContent = await page.evaluate(() => {
    const scriptTag = document.getElementById("__NEXT_DATA__");
    return scriptTag ? scriptTag.innerHTML : null;
  });

  if (!scriptContent) {
    throw new Error("No __NEXT_DATA__ script tag found");
  }

  try {
    return JSON.parse(scriptContent);
  } catch (error) {
    throw new Error(`Failed to parse __NEXT_DATA__: ${error}`, { cause: error });
  }
}

/**
 * Cleanup browser instance
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}
