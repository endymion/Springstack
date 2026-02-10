const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');

const selectors = {
  track: '[data-testid="springstack-track"]',
  panel: depth => `[data-testid="springstack-panel-${depth}"]`,
  crumb: (kind, id) => `[data-testid="springstack-crumb-${kind}-${id}"]`,
  card: (kind, id) => `[data-testid="springstack-card-${kind}-${id}"]`
};

const waitForTrackShift = async (page, fromX, minShiftPx = 10) => {
  await page.waitForFunction(
    ([selector, startX, shift]) => {
      const el = document.querySelector(selector);
      if (!el) return false;
      const transform = getComputedStyle(el).transform;
      if (!transform || transform === 'none') return false;
      const match = transform.match(/matrix\(([^)]+)\)/);
      if (!match) return false;
      const values = match[1].split(',').map(Number);
      const x = values[4] || 0;
      return x <= startX - shift;
    },
    [selectors.track, fromX, minShiftPx],
    { timeout: 10000 }
  );
};

Given('I open {string}', async function (path) {
  await this.goto(path);
});

Then('I see the root panel first', async function () {
  await this.page.waitForSelector(selectors.panel(0), { state: 'visible' });
});

When('I click the corpus card for {string}', async function (name) {
  const id = name === 'Alfa' ? 'alfa--Alfa' : name;
  await this.page.waitForSelector(selectors.card('corpus', id), { state: 'visible' });
  await this.page.click(selectors.card('corpus', id));
});

Then('the corpus card for {string} animates to the breadcrumb', async function (name) {
  const id = name === 'Alfa' ? 'alfa--Alfa' : name;
  await this.page.waitForSelector(selectors.crumb('corpus', id), { state: 'visible' });
});

Then('the corpus breadcrumb for {string} appears', async function (name) {
  const id = name === 'Alfa' ? 'alfa--Alfa' : name;
  await this.page.waitForSelector(selectors.crumb('corpus', id), { state: 'visible' });
});

Then('the items panel slides in from the right', async function () {
  const track = await this.page.waitForSelector(selectors.track, { state: 'visible' });
  const transform = await track.evaluate(el => getComputedStyle(el).transform);
  const startX = transform && transform !== 'none'
    ? Number(transform.match(/matrix\(([^)]+)\)/)?.[1]?.split(',')[4] || 0)
    : 0;
  await waitForTrackShift(this.page, startX);
  const panel = await this.page.waitForSelector(selectors.panel(1), { state: 'visible' });
  assert.ok(panel, 'items panel should be visible after slide');
});
