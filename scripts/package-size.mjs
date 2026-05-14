import { readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const limitBytes = 2_500_000;
const dist = fileURLToPath(new URL('../dist/', import.meta.url));

async function sizeOf(directory) {
  let total = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    total += entry.isDirectory() ? await sizeOf(fullPath) : (await stat(fullPath)).size;
  }
  return total;
}

const total = await sizeOf(dist);
if (total > limitBytes) {
  throw new Error(`agentcraft dist size ${total} bytes exceeds ${limitBytes} bytes`);
}

console.log(`agentcraft dist size ${total} bytes`);
