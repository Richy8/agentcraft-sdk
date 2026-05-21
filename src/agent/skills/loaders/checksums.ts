import { createHash } from 'node:crypto';
import type { ExternalSkillChecksums } from './types.js';

export function verifyChecksum(
  name: keyof ExternalSkillChecksums,
  content: string,
  checksums: ExternalSkillChecksums | undefined,
): void {
  const expected = checksums?.[name];
  if (!expected) return;
  const actual = createHash('sha256').update(content, 'utf8').digest('hex');
  const normalizedExpected = expected.replace(/^sha256:/, '').toLowerCase();
  if (actual !== normalizedExpected) {
    throw new Error(`External skill asset '${name}' checksum mismatch`);
  }
}
