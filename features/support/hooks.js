const { Before, After, setDefaultTimeout } = require('@cucumber/cucumber');

setDefaultTimeout(60000);

Before(async function () {
  await this.init();
});

After(async function (scenario) {
  if (scenario.result?.status === 'FAILED' && this.page) {
    const name = scenario.pickle?.name?.replace(/[^a-z0-9]+/gi, '_').toLowerCase() || 'failure';
    await this.page.screenshot({ path: `artifacts/${name}.png`, fullPage: true }).catch(() => {});
  }
  await this.dispose();
});
