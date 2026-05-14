import { ConfigurationError } from '../../errors/index.js';
import { withAdapterRuntime, type AdapterAuditEvent } from './adapter-runtime.js';
import { createAdapter, tool } from './types.js';
import type { AgentAdapter } from './types.js';

export interface BrowserLike {
  newPage(): Promise<PageLike>;
  close(): Promise<void>;
}

export interface PageLike {
  goto(
    url: string,
    options?: { waitUntil?: 'load' | 'domcontentloaded'; timeout?: number }
  ): Promise<unknown>;
  click(selector: string, options?: { timeout?: number }): Promise<void>;
  fill(selector: string, value: string, options?: { timeout?: number }): Promise<void>;
  screenshot(options?: { fullPage?: boolean; type?: 'png' | 'jpeg' }): Promise<Buffer | Uint8Array>;
  textContent(selector: string, options?: { timeout?: number }): Promise<string | null>;
  waitForSelector(selector: string, options?: { timeout?: number }): Promise<unknown>;
  close?(): Promise<void>;
}

export interface PlaywrightAdapterConfig {
  headless?: boolean;
  defaultTimeout?: number;
  allowedDomains?: string[];
  launch?: (options: { headless?: boolean }) => Promise<BrowserLike>;
  timeoutMs?: number;
  onAuditEvent?: (event: AdapterAuditEvent) => void;
}

export class PlaywrightAdapter {
  static readonly adapterName = 'playwright';

  static connect(config: PlaywrightAdapterConfig = {}): AgentAdapter {
    let browser: BrowserLike | undefined;
    let page: PageLike | undefined;
    const defaultTimeout = config.defaultTimeout ?? 30_000;
    const run = <T>(toolName: string, operation: () => Promise<T>) =>
      withAdapterRuntime(this.adapterName, toolName, async () => operation(), {
        ...(config.timeoutMs !== undefined && { timeoutMs: config.timeoutMs }),
        ...(config.onAuditEvent !== undefined && { onAuditEvent: config.onAuditEvent }),
      });
    const ensurePage = async () => {
      if (!browser) browser = await launchBrowser(config);
      page ??= await browser.newPage();
      return page;
    };

    return createAdapter({
      name: this.adapterName,
      metadata: {
        kind: 'native-sdk',
        auth: 'none',
        trustLevel: 'review-required',
        sideEffects: ['read', 'write', 'external'],
        scopes: ['browser'],
        readOnly: false,
      },
      init: async () => {
        await ensurePage();
      },
      cleanup: async () => {
        await page?.close?.();
        await browser?.close();
        page = undefined;
        browser = undefined;
      },
      tools: [
        tool({
          name: 'browse_url',
          description: 'Navigate the browser to an allowed URL.',
          security: { sideEffect: 'external', scopes: ['browser:navigate'] },
          params: { url: { type: 'string', description: 'Absolute URL to navigate to.' } },
          run: async ({ url }) =>
            run('browse_url', async () => {
              const parsedUrl = validateBrowserUrl(url, config.allowedDomains);
              const activePage = await ensurePage();
              await activePage.goto(parsedUrl.toString(), {
                waitUntil: 'domcontentloaded',
                timeout: defaultTimeout,
              });
              return { url: parsedUrl.toString() };
            }),
        }),
        tool({
          name: 'click_element',
          description: 'Click an element matching a selector.',
          security: {
            sideEffect: 'write',
            requiresConfirmation: true,
            scopes: ['browser:interact'],
          },
          params: { selector: { type: 'string', description: 'CSS selector to click.' } },
          run: async ({ selector }) =>
            run('click_element', async () => {
              await (await ensurePage()).click(selector, { timeout: defaultTimeout });
              return { clicked: selector };
            }),
        }),
        tool({
          name: 'fill_form',
          description: 'Fill a form field matching a selector.',
          security: {
            sideEffect: 'write',
            requiresConfirmation: true,
            scopes: ['browser:interact'],
          },
          params: {
            selector: { type: 'string', description: 'CSS selector to fill.' },
            value: { type: 'string', description: 'Value to enter.' },
          },
          run: async ({ selector, value }) =>
            run('fill_form', async () => {
              await (await ensurePage()).fill(selector, value, { timeout: defaultTimeout });
              return { filled: selector };
            }),
        }),
        tool({
          name: 'take_screenshot',
          description: 'Capture a PNG screenshot as base64.',
          security: { sideEffect: 'read', scopes: ['browser:read'] },
          params: {
            fullPage: { type: 'boolean', description: 'Capture the full page.', required: false },
          },
          run: async ({ fullPage = true }) =>
            run('take_screenshot', async () => {
              const bytes = await (await ensurePage()).screenshot({ fullPage, type: 'png' });
              return { mimeType: 'image/png', base64: Buffer.from(bytes).toString('base64') };
            }),
        }),
        tool({
          name: 'extract_text',
          description: 'Extract text content from a selector.',
          security: { sideEffect: 'read', scopes: ['browser:read'] },
          params: { selector: { type: 'string', description: 'CSS selector.', required: false } },
          run: async ({ selector = 'body' }) =>
            run('extract_text', async () => ({
              selector,
              text:
                (await (await ensurePage()).textContent(selector, { timeout: defaultTimeout })) ??
                '',
            })),
        }),
        tool({
          name: 'wait_for_selector',
          description: 'Wait for a selector to appear.',
          security: { sideEffect: 'read', scopes: ['browser:read'] },
          params: { selector: { type: 'string', description: 'CSS selector to wait for.' } },
          run: async ({ selector }) =>
            run('wait_for_selector', async () => {
              await (await ensurePage()).waitForSelector(selector, { timeout: defaultTimeout });
              return { selector, found: true };
            }),
        }),
      ],
    });
  }
}

async function launchBrowser(config: PlaywrightAdapterConfig): Promise<BrowserLike> {
  if (config.launch) return config.launch({ headless: config.headless ?? true });
  const importer = new Function('specifier', 'return import(specifier)') as (
    specifier: string
  ) => Promise<{
    chromium?: { launch(options: { headless?: boolean }): Promise<BrowserLike> };
  }>;
  const playwright = await importer('playwright');
  if (!playwright.chromium)
    throw new ConfigurationError('Playwright chromium launcher is unavailable');
  return playwright.chromium.launch({ headless: config.headless ?? true });
}

function validateBrowserUrl(url: string, allowedDomains: string[] | undefined): URL {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new ConfigurationError(`Invalid browser URL '${url}'`);
  }
  if (!['http:', 'https:'].includes(parsedUrl.protocol))
    throw new ConfigurationError(`Protocol '${parsedUrl.protocol}' is not allowed`);
  if (
    allowedDomains?.length &&
    !allowedDomains.some((domain) => matchesDomain(parsedUrl.hostname, domain))
  ) {
    throw new ConfigurationError(`Domain '${parsedUrl.hostname}' is not allowed`);
  }
  return parsedUrl;
}

function matchesDomain(hostname: string, domain: string): boolean {
  const normalizedHost = hostname.toLowerCase();
  const normalizedDomain = domain.toLowerCase();
  return normalizedHost === normalizedDomain || normalizedHost.endsWith(`.${normalizedDomain}`);
}
