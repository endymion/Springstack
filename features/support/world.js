const { setWorldConstructor } = require('@cucumber/cucumber');
const { chromium } = require('@playwright/test');

const parseBaseUrl = () => {
  if (process.env.BASE_URL) return process.env.BASE_URL;
  if (process.env.CUCUMBER_BASE_URL) return process.env.CUCUMBER_BASE_URL;
  return 'http://localhost:5173';
};

class SpringstackWorld {
  constructor() {
    this.browser = null;
    this.page = null;
    this.baseUrl = parseBaseUrl();
  }

  async init() {
    this.browser = await chromium.launch();
    this.page = await this.browser.newPage();
  }

  async dispose() {
    const closeWithTimeout = async (promise, timeoutMs) => {
      let timeoutId;
      const timeout = new Promise(resolve => {
        timeoutId = setTimeout(resolve, timeoutMs);
      });
      await Promise.race([promise.catch(() => {}), timeout]);
      clearTimeout(timeoutId);
    };

    if (this.page) {
      await closeWithTimeout(this.page.close(), 5000);
    }
    if (this.browser) {
      await closeWithTimeout(this.browser.close(), 5000);
    }
  }

  async goto(path) {
    const targetUrl = `${this.baseUrl}${path}`;
    const response = await this.page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
    if (!response) return;
    if (response.status() >= 500) {
      throw new Error(`Failed to load ${targetUrl} (status ${response.status()})`);
    }
  }
}

setWorldConstructor(SpringstackWorld);
