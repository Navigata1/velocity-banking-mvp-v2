/* eslint-disable @typescript-eslint/no-require-imports */
const { performance } = require('node:perf_hooks');

function createPhaseTiming(now = () => performance.now()) {
  const origin = now();
  const phases = [];
  function begin(name, details) {
    const phase = { name, ...details, startedAtMs: now() - origin, status: 'running' };
    phases.push(phase);
    return (status) => {
      phase.endedAtMs = now() - origin;
      phase.durationMs = phase.endedAtMs - phase.startedAtMs;
      phase.status = status;
    };
  }
  async function measure(name, operation, details) {
    const end = begin(name, details);
    let status = 'failed';
    try {
      const result = await operation();
      status = 'passed';
      return result;
    } finally { end(status); }
  }
  function measureSync(name, operation) {
    const end = begin(name);
    let status = 'failed';
    try {
      const result = operation();
      status = 'passed';
      return result;
    } finally { end(status); }
  }
  return { phases, measure, measureSync };
}

module.exports = { createPhaseTiming };
