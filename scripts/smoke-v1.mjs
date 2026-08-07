import { spawn } from 'node:child_process';
import puppeteer from 'puppeteer';

const BASE_URL = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:4173';
const ROUTES = ['/', '/login', '/tracking', '/terms', '/privacy'];

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 30000) {
  const startedAt = Date.now();
  let lastError;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { method: 'GET' });
      if (response.ok || response.status < 500) return;
    } catch (error) {
      lastError = error;
    }
    await wait(750);
  }

  throw new Error(`Preview server did not become ready at ${url}. ${lastError?.message || ''}`);
}

async function main() {
  const preview = spawn(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['vite', 'preview', '--host', '127.0.0.1', '--port', '4173'],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );

  preview.stdout.on('data', (chunk) => process.stdout.write(`[preview] ${chunk}`));
  preview.stderr.on('data', (chunk) => process.stderr.write(`[preview] ${chunk}`));

  let browser;

  try {
    await waitForServer(BASE_URL);

    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const failures = [];

    for (const route of ROUTES) {
      const url = `${BASE_URL}${route}`;
      const page = await browser.newPage();
      const pageErrors = [];

      page.on('pageerror', (error) => {
        pageErrors.push(error.message);
      });

      await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForSelector('#root', { timeout: 10000 });
      await wait(1200);

      const status = response?.status() || 0;
      const rootText = await page.$eval('#root', (node) => node.textContent?.trim() || '');
      const rootHtmlLength = await page.$eval('#root', (node) => node.innerHTML.length);
      const hasErrorBoundary = /Terjadi Kendala|Aplikasi Mengalami Kendala|Detail Error/i.test(rootText);

      if (status >= 500) failures.push(`${route}: HTTP ${status}`);
      if (rootHtmlLength < 50 && rootText.length < 10) failures.push(`${route}: root appears blank`);
      if (hasErrorBoundary) failures.push(`${route}: error boundary rendered`);
      if (pageErrors.length > 0) failures.push(`${route}: page error: ${pageErrors.join(' | ')}`);

      console.log(`✓ ${route} rendered with HTTP ${status || 'n/a'} and ${rootHtmlLength} root HTML chars`);
      await page.close();
    }

    if (failures.length > 0) {
      throw new Error(`Smoke test failed:\n- ${failures.join('\n- ')}`);
    }

    console.log('V1 smoke test passed.');
  } finally {
    if (browser) await browser.close();
    preview.kill('SIGTERM');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
