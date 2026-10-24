async function captureSharedDashboardCanvas(page) {
  let timer;
  try {
    return await Promise.race([page.evaluate(() => {
      const limit = 64;
      const number = value => Number.isFinite(value) ? value : null;
      const rect = node => {
        const box = node.getBoundingClientRect();
        return Object.fromEntries(['x', 'y', 'top', 'left', 'right', 'bottom', 'width', 'height'].map(key => [key, number(box[key])]));
      };
      const staticPath = value => {
        try {
          const url = new URL(value);
          return url.origin === location.origin && url.pathname.startsWith('/_next/static/') ? url.pathname : null;
        } catch { return null; }
      };
      const bounded = entries => ({ total: entries.length, limit, truncated: entries.length > limit, entries: entries.slice(0, limit) });
      const hero = document.querySelector('[data-testid="asset-hero"]');
      const stage = document.querySelector('[data-testid="asset-hero-canvas"]');
      const heroRect = hero ? rect(hero) : null;
      // Viewport overlap is geometry only; it is not React's IntersectionObserver state.
      const intersectsViewport = heroRect ? heroRect.width > 0 && heroRect.height > 0 && heroRect.bottom > 0
        && heroRect.right > 0 && heroRect.top < innerHeight && heroRect.left < innerWidth : false;
      const resources = performance.getEntriesByType('resource').flatMap(entry => {
        const path = staticPath(entry.name);
        return path ? [{ path, initiatorType: entry.initiatorType, startTime: number(entry.startTime),
          duration: number(entry.duration), transferSize: number(entry.transferSize), responseStatus: number(entry.responseStatus) }] : [];
      });
      return {
        captured: true,
        document: { hidden: document.hidden, visibilityState: document.visibilityState, readyState: document.readyState },
        viewport: { width: innerWidth, height: innerHeight },
        hero: hero ? { id: hero.getAttribute('data-hero'), rect: heroRect, intersectsViewport,
          inspectPressed: hero.querySelector('[aria-label="Inspect 3D model"]')?.getAttribute('aria-pressed') === 'true',
          replayPresent: !!hero.querySelector('[aria-label="Replay full turn"]'),
          unavailable: [...hero.querySelectorAll('[role="status"]')].some(node => node.textContent?.includes('3D unavailable.')) } : null,
        stage: stage ? { ready: stage.getAttribute('data-ready'), rect: rect(stage),
          canvases: [...stage.querySelectorAll('canvas')].map(canvas => ({ width: canvas.width, height: canvas.height, rect: rect(canvas) })) } : null,
        staticResources: bounded(resources),
        staticScripts: bounded([...document.querySelectorAll('script[src]')].map(node => staticPath(node.src)).filter(Boolean)),
      };
    }), new Promise(resolve => {
      // This Node-only deadline does not cancel evaluation; existing context cleanup does.
      timer = setTimeout(() => resolve({ captured: false, captureError: 'Browser state snapshot exceeded its 2000ms deadline.' }), 2000);
    })]);
  } catch {
    return { captured: false, captureError: 'Browser state snapshot unavailable.' };
  } finally {
    clearTimeout(timer);
  }
}
module.exports = { captureSharedDashboardCanvas };
