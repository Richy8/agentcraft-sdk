export interface IPromptLoader {
  readFile(filePath: string): Promise<string>;
  listFiles(dirPath: string): Promise<string[]>;
}

