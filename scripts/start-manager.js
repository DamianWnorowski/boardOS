import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import net from 'net';

const LOCK_DIR = path.join(process.cwd(), '.runlocks');
if (!fs.existsSync(LOCK_DIR)) fs.mkdirSync(LOCK_DIR, { recursive: true });

function isPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readLock(role) {
  const lockPath = path.join(LOCK_DIR, `${role}.json`);
  if (!fs.existsSync(lockPath)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeLock(role, pids) {
  const lockPath = path.join(LOCK_DIR, `${role}.json`);
  fs.writeFileSync(lockPath, JSON.stringify(pids, null, 2));
}

async function isPortListening(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const onError = () => { socket.destroy(); resolve(false); };
    socket.setTimeout(1000);
    socket.once('error', onError);
    socket.once('timeout', onError);
    socket.connect(port, host, () => {
      socket.end();
      resolve(true);
    });
  });
}

function spawnDetachedWindows(title, command, args) {
  // Start a minimized new console window on Windows
  spawn('cmd.exe', ['/c', 'start', title ? `"${title}"` : '""', '/min', 'cmd', '/k', `${command} ${args.join(' ')}`], {
    detached: true,
    stdio: 'ignore',
    windowsHide: false,
  }).unref();
}

function spawnDetachedUnix(command, args) {
  spawn(command, args, { detached: true, stdio: 'ignore' }).unref();
}

function spawnRole(role, command, args, title) {
  if (process.platform === 'win32') {
    spawnDetachedWindows(title, command, args);
  } else {
    spawnDetachedUnix(command, args);
  }
  // No PID available (child of new shell). We record a sentinel to avoid respawn storms.
  const existing = readLock(role).filter((p) => isPidAlive(p));
  // Push a fake PID marker (timestamp) to throttle respawns
  existing.push(Date.now());
  writeLock(role, existing.slice(-3));
}

async function ensureRole(role, max, checkFn, spawnFn) {
  const livePids = readLock(role).filter((p) => typeof p === 'number' && isPidAlive(p));
  const liveCount = livePids.length;
  const isHealthy = await checkFn();
  if (isHealthy) return { role, status: 'running', liveCount };
  if (liveCount >= max) return { role, status: 'max_reached', liveCount };
  spawnFn();
  return { role, status: 'started', liveCount: liveCount + 1 };
}

async function main() {
  // Recommended maxima per role
  const limits = {
    dev: Number(process.env.MAX_DEV || 1),
    claude: Number(process.env.MAX_CLAUDE || 1),
    docs: Number(process.env.MAX_DOCS || 1),
  };

  const results = [];

  // Dev server (Vite) on 5173
  results.push(await ensureRole(
    'dev',
    limits.dev,
    () => isPortListening(5173),
    () => spawnRole('dev', 'npm', ['run', 'dev'], 'Vite Dev')
  ));

  // Claude/Gemini smart start – treated as singleton
  results.push(await ensureRole(
    'claude',
    limits.claude,
    async () => false, // treat as not-verifiable; we always allow up to max
    () => spawnRole('claude', 'npm', ['run', 'claude:start'], 'Claude Start')
  ));

  // Docs watcher (optional)
  if (process.env.RUN_DOCS === '1') {
    results.push(await ensureRole(
      'docs',
      limits.docs,
      async () => false,
      () => spawnRole('docs', 'npm', ['run', 'docs:watch'], 'Docs Watch')
    ));
  }

  console.log('Parallel start summary:', results);
}

if (process.argv[1] && process.argv[1].endsWith('start-manager.js')) {
  main();
}

