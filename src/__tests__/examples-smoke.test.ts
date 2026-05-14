import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);

describe('examples smoke check', () => {
  it('keeps examples parseable and docs source includes resolvable', async () => {
    const result = await execFileAsync(process.execPath, ['scripts/check-examples.mjs'], {
      cwd: process.cwd(),
    });

    expect(result.stdout).toContain('Example smoke check passed.');
  });
});
