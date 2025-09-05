import { spawn } from 'child_process';
import os from 'os';

function startDetached(command, args, title) {
  if (process.platform === 'win32') {
    // Use a new minimized console window on Windows
    spawn('cmd.exe', ['/c', 'start', '"' + (title || '') + '"', '/min', 'cmd', '/k', `${command} ${args.join(' ')}`], {
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
    }).unref();
  } else {
    // Unix-like: run detached with no stdio
    spawn(command, args, { detached: true, stdio: 'ignore' }).unref();
  }
}

async function main() {
  startDetached('npm', ['run', 'claude:start'], 'Claude Start');
  // Small stagger to avoid port checks racing
  setTimeout(() => startDetached('npm', ['run', 'dev'], 'Vite Dev'), 800);
  console.log('Started claude:start and dev in background.');
}

if (process.argv[1] && process.argv[1].endsWith('start-parallel.js')) {
  main();
}

