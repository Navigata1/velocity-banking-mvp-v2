/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');

function geometry(root) {
  const canvas = document.createElement('canvas'), context = canvas.getContext('2d', { willReadFrequently: true });
  const rgba = color => { context.clearRect(0, 0, 1, 1); context.fillStyle = color; context.fillRect(0, 0, 1, 1); return [...context.getImageData(0, 0, 1, 1).data]; };
  const over = (front, back) => front.slice(0, 3).map((value, i) => value * front[3] / 255 + back[i] * (1 - front[3] / 255));
  const luminance = color => color.map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0);
  const nodes = [...root.querySelectorAll('p,h1,h2,h3,a,label,dt,dd,[data-financial-editor]>span,[data-financial-editor] button>span')].filter(node => !node.closest('figure'));
  return { overflow: document.documentElement.scrollWidth > innerWidth + 1, metrics: nodes.map(node => {
    const box = node.getBoundingClientRect(), style = getComputedStyle(node), ancestors = [];
    for (let parent = node; parent; parent = parent.parentElement) ancestors.push(parent);
    let background = [255, 255, 255];
    for (const parent of [...ancestors].reverse()) background = over(rgba(getComputedStyle(parent).backgroundColor), background);
    const foreground = over(rgba(style.color), background), a = luminance(foreground), b = luminance(background);
    const range = document.createRange(); range.selectNodeContents(node);
    const rects = [...range.getClientRects()].filter(rect => rect.width > 0 && rect.height > 0);
    const visible = ancestors.every(parent => { const s = getComputedStyle(parent); return s.display !== 'none' && s.visibility === 'visible' && Number(s.opacity) === 1; });
    const contained = rects.every(rect => rect.left >= box.left - 1 && rect.right <= box.right + 1 && rect.top >= box.top - 1 && rect.bottom <= box.bottom + 1 && ancestors.every(parent => {
      const s = getComputedStyle(parent), bounds = parent.getBoundingClientRect();
      return (!/hidden|clip/.test(s.overflowX) || rect.left >= bounds.left - 1 && rect.right <= bounds.right + 1)
        && (!/hidden|clip/.test(s.overflowY) || rect.top >= bounds.top - 1 && rect.bottom <= bounds.bottom + 1);
    }));
    return { text: node.textContent, visible, contained, painted: rects.length > 0, fits: node.scrollWidth <= node.clientWidth + 1,
      font: parseFloat(style.fontSize), color: style.color, background, contrast: (Math.max(a, b) + .05) / (Math.min(a, b) + .05) };
  }) };
}
function assertGeometry(proof) {
  assert.equal(proof.overflow, false, 'Simulator page must not overflow');
  assert.ok(proof.metrics.length >= 45, 'Financial values, scope, labels and controls must be present');
  const failed = proof.metrics.filter(m => !m.text.trim() || !m.visible || !m.contained || !m.painted || !m.fits || m.font < 12 || m.contrast < 4.5);
  assert.deepEqual(failed, [], 'Unreadable Simulator text: ' + JSON.stringify(failed));
}
async function originalNodeControls(page) {
  const root = page.getByTestId('portfolio-simulator'), value = page.getByTestId('simulator-interest-snowball');
  const original = await root.evaluate(geometry); assertGeometry(original);
  const rootStyle = await root.getAttribute('style');
  try { await root.evaluate(element => { element.style.opacity = '0'; }); const broken = await root.evaluate(geometry); assert.throws(() => assertGeometry(broken), 'ancestor opacity must be rejected'); }
  finally { await root.evaluate((element, style) => { if (style === null) element.removeAttribute('style'); else element.setAttribute('style', style); }, rootStyle); }
  assert.deepEqual(await root.evaluate(geometry), original);
  const snapshot = await value.evaluateHandle(element => ({ node: element.firstChild, data: element.firstChild.data, style: element.getAttribute('style') })), controls = [{kind:'ancestor-opacity',restored:true}];
  try {
    for (const kind of ['opacity', 'clip', 'empty', 'contrast']) {
      try {
        await value.evaluate((element, { state, kind }) => {
          if (kind === 'empty') state.node.data = '';
          else if (kind === 'opacity') element.style.opacity = '0';
          else if (kind === 'contrast') element.style.color = '#090d12';
          else { element.style.maxWidth = '1px'; element.style.overflow = 'hidden'; element.style.whiteSpace = 'nowrap'; }
        }, { state: snapshot, kind });
        const broken = await root.evaluate(geometry);
        assert.throws(() => assertGeometry(broken), kind + ' must be rejected');
      } finally {
        await value.evaluate((element, state) => { state.node.data = state.data; if (state.style === null) element.removeAttribute('style'); else element.setAttribute('style', state.style); }, snapshot);
      }
      assert.equal(await value.evaluate((element, state) => element.firstChild === state.node, snapshot), true);
      assert.deepEqual(await root.evaluate(geometry), original); controls.push({ kind, originalNode: true, restored: true });
    }
  } finally { await snapshot.dispose(); }
  return controls;
}
module.exports = { geometry, assertGeometry, originalNodeControls };
