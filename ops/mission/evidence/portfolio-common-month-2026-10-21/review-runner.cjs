const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
const log = path.join(__dirname, 'review-commands.jsonl');
const pinPath = path.join(__dirname, 'review-pins.json');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const record = value => fs.appendFileSync(log, JSON.stringify({ at: new Date().toISOString(), ...value }) + '\n');
const [mode, ...args] = process.argv.slice(2);
if (mode === 'pin' || mode === 'verify') {
  const list = cp.execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root }).toString().split('\0');
  const paths = [...new Set(list.filter(file => /^(apps\/(web|mobile)\/|packages\/financial-engine\/)/.test(file)
    && /\.(tsx?|[cm]?js|json|css)$/.test(file) && !/(^|\/)(test-results|playwright-report|node_modules|\.next|dist)\//.test(file))
    .concat(['package.json', 'package-lock.json']).filter(file => fs.existsSync(path.join(root, file))))].sort();
  const pins = Object.fromEntries(paths.map(file => [file, hash(file)]));
  const head = cp.execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root }).toString().trim();
  if (mode === 'pin') {
    fs.writeFileSync(pinPath, JSON.stringify({ head, note: 'Broad source pin; docs/ops and review artifacts intentionally excluded.', pins }, null, 2) + '\n');
    const result = { command: ['pin'], exit: 0, head, files: paths.length, pinPath };
    record(result); console.log(JSON.stringify(result));
  } else {
    const before = JSON.parse(fs.readFileSync(pinPath));
    const changes = [...new Set([...Object.keys(before.pins), ...paths])].filter(file => before.pins[file] !== pins[file]);
    const result = { command: ['verify'], exit: changes.length || before.head !== head ? 1 : 0, head, changes };
    record(result); console.log(JSON.stringify(result)); process.exitCode = result.exit;
  }
} else if (mode === 'read') {
  for (const item of args) {
    const [file, range] = item.split('@');
    const [start, end] = range ? range.split(':').map(Number) : [1, Infinity];
    const content = fs.readFileSync(path.join(root, file), 'utf8');
    console.log('\nFILE ' + file + '\n' + content.split(/\r?\n/).map((line, index) => (index + 1) + ': ' + line).slice(start - 1, end).join('\n'));
  }
  record({ command: ['read', ...args], exit: 0 });
} else if (mode === 'run') {
  const started = Date.now();
  const result = cp.spawnSync(args[0], args.slice(1), { cwd: root, encoding: 'utf8', timeout: 90000, maxBuffer: 12 * 1024 * 1024 });
  const entry = { command: args, exit: result.status, signal: result.signal, error: result.error?.message, milliseconds: Date.now() - started, stdout: result.stdout, stderr: result.stderr };
  record(entry); process.stdout.write(result.stdout || ''); process.stderr.write(result.stderr || '');
  if (result.error) console.error(result.error.message);
  process.exitCode = result.status === null ? 1 : result.status;
} else throw new Error('Expected pin, verify, read or run');
