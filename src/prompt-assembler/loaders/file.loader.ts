import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { IPromptLoader } from './base.loader.js';

export class FileLoader implements IPromptLoader {
  readFile(filePath: string): Promise<string> {
    return fs.readFile(filePath, 'utf8');
  }

  async listFiles(dirPath: string): Promise<string[]> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries
      .filter((dirent) => dirent.isFile())
      .map((dirent) => path.join(dirPath, dirent.name))
      .sort((a, b) => a.localeCompare(b));
  }
}
