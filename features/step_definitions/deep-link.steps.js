const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');

const selectors = {
  track: '[data-testid="springstack-track"]',
  panel: depth => `[data-testid="springstack-panel-${depth}"]`,
  crumb: (kind, id) => `[data-testid="springstack-crumb-${kind}-${id}"]`,
  card: (kind, id) => `[data-testid="springstack-card-${kind}-${id}"]`
};

const KINDS = {
  folder: 'application/x-folder',
  detail: 'application/x-detail'
};

const corpusIdFor = (name) => {
  if (name === 'Documents') return 'c-docs';
  if (name === 'Media') return 'c-media';
  if (name === 'Data & Code') return 'c-data';
  if (name === 'Diagrams') return 'c-diagrams';
  return name;
};

const itemKindFor = (id) => ({
  'md-report': 'text/markdown',
  'pdf-dossier': 'application/pdf',
  'notes': 'text/plain',
  'blur-photo': 'image/png',
  'footsteps': 'audio/wav',
  'hallway-loop': 'video/mp4',
  'glyph': 'image/svg+xml',
  'composition': 'application/x-vml+xml',
  'crowd-log': 'text/csv',
  'roster-matrix': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'roster-json': 'application/json',
  'beacon-driver': 'text/typescript',
  'asset-bundle': 'application/zip',
  'stack-db': 'application/x-sqlite3',
  'sensor-parquet': 'application/x-parquet',
  'service-map': 'text/vnd.graphviz',
  'handoff-flow': 'text/x-plantuml',
  'scene-sketch': 'application/x-excalidraw+json',
  'ops-flow': 'text/x-mermaid'
}[id]);

Given('I open {string}', async function (path) {
  await this.goto(path);
  await this.page.waitForSelector(selectors.card(KINDS.folder, 'c-docs'), { state: 'visible', timeout: 10000 });
});

Then('I see the root panel first', async function () {
  await this.page.waitForSelector(selectors.panel(0), { state: 'visible', timeout: 10000 });
});

When('I click the corpus card for {string}', async function (name) {
  const id = corpusIdFor(name);
  const selector = selectors.card(KINDS.folder, id);
  await this.page.waitForSelector(selector, { state: 'visible', timeout: 10000 });
  await this.page.dispatchEvent(selector, 'click');
});

Then('the corpus card for {string} animates to the breadcrumb', async function (name) {
  const id = corpusIdFor(name);
  await this.page.waitForSelector(selectors.crumb(KINDS.folder, id), { state: 'visible', timeout: 10000 });
});

Then('the corpus breadcrumb for {string} appears', async function (name) {
  const id = corpusIdFor(name);
  await this.page.waitForSelector(selectors.crumb(KINDS.folder, id), { state: 'visible', timeout: 10000 });
});

When('I click the item card for {string}', async function (itemId) {
  const kind = itemKindFor(itemId);
  if (!kind) throw new Error(`Unknown item id: ${itemId}`);
  this.currentItemId = itemId;
  const selector = selectors.card(kind, itemId);
  await this.page.waitForSelector(selector, { state: 'visible', timeout: 10000 });
  await this.page.dispatchEvent(selector, 'click');
});

When('I click the detail card', async function () {
  const itemId = this.currentItemId;
  if (!itemId) throw new Error('No current item id set');
  const id = `detail-${itemId}`;
  const selector = selectors.card(KINDS.detail, id);
  await this.page.waitForSelector(selector, { state: 'visible', timeout: 10000 });
  await this.page.dispatchEvent(selector, 'click');
});

Then('the detail panel shows the {string} preview', async function (preview) {
  await this.page.waitForSelector(`[data-testid="file-${preview}"]`, { state: 'visible', timeout: 10000 });
});

Then('the items panel slides in from the right', async function () {
  await this.page.waitForSelector(selectors.track, { state: 'visible', timeout: 10000 });
  await this.page.waitForFunction(
    (selector) => {
      const el = document.querySelector(selector);
      if (!el) return false;
      const transform = getComputedStyle(el).transform;
      if (!transform || transform === 'none') return false;
      const match = transform.match(/matrix\(([^)]+)\)/);
      if (!match) return false;
      const values = match[1].split(',').map(Number);
      const x = values[4] || 0;
      return x < 0;
    },
    selectors.track,
    { timeout: 10000 }
  );
  const panel = await this.page.waitForSelector(selectors.panel(1), { state: 'visible', timeout: 10000 });
  assert.ok(panel, 'items panel should be visible after slide');
});
