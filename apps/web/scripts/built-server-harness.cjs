/* eslint-disable @typescript-eslint/no-require-imports */
const { spawn, spawnSync } = require('node:child_process');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');

const host = '127.0.0.1';

function allocatePort() {
  return new Promise((resolve, reject) => {
    const reservation = net.createServer();
    reservation.unref();
    reservation.once('error', reject);
    reservation.listen(0, host, () => {
      const address = reservation.address();
      const port = typeof address === 'object' && address ? address.port : null;
      reservation.close((error) => (error || !port ? reject(error ?? new Error('No ephemeral port assigned.')) : resolve(port)));
    });
  });
}

function requestRoot(origin) {
  return new Promise((resolve, reject) => {
    const request = http.get(origin, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => resolve({ body, statusCode: response.statusCode }));
    });
    request.on('error', reject);
    request.setTimeout(3000, () => request.destroy(new Error('Built server request timed out.')));
  });
}

async function waitForServer(server, origin, readyMarker) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 20000) {
    if (server.exitCode !== null) throw new Error('Built server exited before it was ready.');
    try {
      const response = await requestRoot(origin);
      if (response.statusCode === 200 && response.body.includes(readyMarker)) return;
    } catch {
      // Retry while the production server starts.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Built server did not start at ${origin}.`);
}

function stopServerImmediately(server, signal = 'SIGTERM') {
  if (!server || server.exitCode !== null) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(server.pid), '/t', '/f'], { stdio: 'ignore', windowsHide: true });
    return;
  }
  try {
    process.kill(-server.pid, signal);
  } catch {
    server.kill(signal);
  }
}

async function stopServer(server) {
  if (!server || server.exitCode !== null) return;
  stopServerImmediately(server);
  if (typeof server.once !== 'function') return;
  await new Promise((resolve) => {
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      stopServerImmediately(server, 'SIGKILL');
      done();
    }, 4000);
    server.once('exit', done);
  });
}

async function startBuiltServer(appRoot, readyMarker = 'InterestShield - Financial Empowerment') {
  const port = await allocatePort();
  const origin = `http://${host}:${port}`;
  const nextBin = path.join(appRoot, 'node_modules', 'next', 'dist', 'bin', 'next');
  const server = spawn(process.execPath, [nextBin, 'start', '-H', host, '-p', String(port)], {
    cwd: appRoot,
    detached: process.platform !== 'win32',
    stdio: 'ignore',
    windowsHide: true,
  });
  try {
    await waitForServer(server, origin, readyMarker);
    return { origin, server };
  } catch (error) {
    await stopServer(server);
    throw error;
  }
}

function createGracefulShutdown({ closeBrowser, stopServer: stop, exit, hardExit = exit, hardExitDelayMs = 5000, setTimeoutFn = setTimeout, clearTimeoutFn = clearTimeout }) {
  let shutdownPromise;
  return (exitCode) => {
    if (shutdownPromise) return shutdownPromise;
    const hardExitTimer = setTimeoutFn(() => hardExit(exitCode), hardExitDelayMs);
    hardExitTimer?.unref?.();
    shutdownPromise = (async () => {
      try {
        await closeBrowser();
      } finally {
        await stop();
        clearTimeoutFn(hardExitTimer);
        exit(exitCode);
      }
    })();
    return shutdownPromise;
  };
}

module.exports = { createGracefulShutdown, startBuiltServer, stopServer };
