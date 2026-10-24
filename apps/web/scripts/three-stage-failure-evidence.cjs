/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs');
const path = require('node:path');

function createFailureEvidence(directory) {
  let selection = null, screenshots = {}, snapshot = null;
  const cleanupErrors = [];
  const text = (value, limit) => { try { return String(value ?? '').slice(0, limit); } catch { return '[unprintable]'; } };
  const field = (value, key, limit) => { try { return text(value?.[key] ?? (key === 'message' ? value : ''), limit); } catch { return '[unreadable]'; } };
  const errorInfo = value => ({ name: field(value, 'name', 80), message: field(value, 'message', 512), stack: field(value, 'stack', 1024) });
  const view = () => selection && ({ viewportLabel: text(selection.viewportLabel, 40), artifactId: text(selection.artifactId, 40),
    selectionStartedAt: selection.selectionStartedAt ?? null, selectionDeadline: selection.selectionDeadline ?? null, stabilityBudgetMs: selection.stabilityBudgetMs ?? null,
    phases: (selection.timing?.phases ?? []).slice(0, 32).map(p => ({ name: text(p.name, 80), status: text(p.status, 16),
      ...Object.fromEntries(['startedAtMs', 'endedAtMs', 'durationMs', 'timeoutMs', 'deadline'].filter(k => Number.isFinite(p[k])).map(k => [k, p[k]])) })) });
  return {
    begin(viewportLabel, artifactId = null) { selection = { viewportLabel, artifactId }; screenshots = {}; snapshot = null; },
    track(selectionStartedAt, timing, settleMs, stabilityBudgetMs) { Object.assign(selection, { selectionStartedAt, selectionDeadline: selectionStartedAt + settleMs, timing, stabilityBudgetMs }); },
    capture(phase, buffer) { if (selection?.artifactId && ['canvas', 'candidate', 'confirmation'].includes(phase) && Buffer.isBuffer(buffer)) screenshots[phase] = buffer; },
    async guard(operation, cleanup) {
      let failed = false, primary, result;
      try { result = await operation(); } catch (error) { failed = true; primary = error; snapshot ??= view(); }
      try { await cleanup(); } catch (error) {
        if (failed) { if (cleanupErrors.length < 4) cleanupErrors.push(errorInfo(error)); }
        else { failed = true; primary = error; snapshot ??= view(); }
      }
      if (failed) throw primary;
      return result;
    },
    write(error) {
      try {
        fs.mkdirSync(directory, { recursive: true });
        const images = {};
        for (const [phase, buffer] of Object.entries(screenshots)) {
          images[phase] = { bytes: buffer.length, retained: false };
          if (buffer.length > 8388608) continue;
          try { fs.writeFileSync(path.join(directory, `failure-${phase}.png`), buffer, { flag: 'wx' }); images[phase].retained = true; }
          catch (reason) { images[phase].error = errorInfo(reason); }
        }
        const raw = JSON.stringify({ schema: 'three-stage-failure-v1', status: 'failed', error: errorInfo(error),
          selection: snapshot ?? view(), cleanupErrors, images, rawBuffersAreNotPixelApproval: true }, null, 2) + '\n';
        if (Buffer.byteLength(raw) <= 65536) fs.writeFileSync(path.join(directory, 'failure.json'), raw, { flag: 'wx' });
      } catch { /* Evidence failure must never replace the test's primary error. */ }
    },
  };
}
module.exports = { createFailureEvidence };
