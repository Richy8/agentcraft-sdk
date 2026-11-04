import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const staleApiDir = path.join(root, 'docs/api');
const publicApiDir = path.join(root, 'docs/public/api');

if (fs.existsSync(staleApiDir)) {
  throw new Error(
    [
      'Stale API docs output detected at docs/api.',
      'TypeDoc output must live in docs/public/api so VitePress serves it as static /api/ assets.',
      'Remove docs/api and rerun npm run docs:api.',
    ].join('\n'),
  );
}

if (!fs.existsSync(publicApiDir)) {
  throw new Error('API docs output missing at docs/public/api. Run npm run docs:api first.');
}

console.log('API docs output is clean: docs/public/api is the only generated API tree.');
