import { spawn } from 'child_process';
import path from 'path';

async function main() {
  const scriptPath = path.join(process.cwd(), 'scripts', 'gemini-smart-start.js');
  const child = spawn('node', [scriptPath], { stdio: 'inherit', shell: true });
  child.on('close', (code) => process.exit(code ?? 1));
  child.on('error', (err) => {
    console.error('Failed to start smart-start:', err.message);
    process.exit(1);
  });
}

if (process.argv[1] && process.argv[1].endsWith('claude-smart-start.js')) {
  main();
}

