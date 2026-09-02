import { spawnSync, spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mainScript = path.join(__dirname, 'main.py');

const candidates = [
  'python',
  'py',
  'python3',
  'C:\\Program Files\\Blender Foundation\\Blender 5.2\\5.2\\python\\bin\\python.exe',
  'C:\\Program Files\\Blender Foundation\\Blender 4.5\\4.5\\python\\bin\\python.exe'
];

function findWorkingPython() {
  for (const bin of candidates) {
    try {
      const res = spawnSync(bin, ['--version'], { encoding: 'utf8', stdio: 'pipe' });
      const out = (res.stdout || '') + (res.stderr || '');
      if (res.status === 0 && out.includes('Python 3')) {
        return bin;
      }
    } catch (e) {}
  }
  return null;
}

const pythonBin = findWorkingPython();
if (!pythonBin) {
  console.error('[!] Could not locate a working Python 3 installation.');
  process.exit(1);
}

const args = [mainScript, ...process.argv.slice(2)];
const child = spawn(pythonBin, args, { stdio: 'inherit' });
child.on('exit', (code) => {
  process.exit(code ?? 0);
});
