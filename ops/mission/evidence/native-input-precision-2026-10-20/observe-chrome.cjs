const path = require('node:path');
const { chromium } = require(path.resolve('apps/web/node_modules/playwright-core'));
const launch = chromium.launch.bind(chromium);
chromium.launch = async (...args) => {
  const browser = await launch(...args), newContext = browser.newContext.bind(browser);
  browser.newContext = async (...options) => {
    const context = await newContext(...options), newPage = context.newPage.bind(context);
    context.newPage = async (...pageOptions) => {
      const page = await newPage(...pageOptions), goto = page.goto.bind(page);
      page.on('crash', () => console.log('DIAGNOSTIC page crash', page.url()));
      page.on('pageerror', error => console.log('DIAGNOSTIC pageerror', page.url(), error.message));
      page.on('console', message => { if (message.type() === 'error') console.log('DIAGNOSTIC console', message.text()); });
      page.on('response', response => { if (response.status() >= 400) console.log('DIAGNOSTIC HTTP', response.status(), response.url()); });
      page.goto = async (...navigation) => {
        const response = await goto(...navigation);
        console.log('DIAGNOSTIC navigation', response?.status(), page.url());
        return response;
      };
      return page;
    };
    return context;
  };
  return browser;
};
