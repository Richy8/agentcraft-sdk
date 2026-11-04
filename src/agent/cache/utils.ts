export async function importOptional<T>(packageName: string, feature: string): Promise<T> {
  try {
    const dynamicImport = new Function("specifier", "return import(specifier)") as (
      specifier: string,
    ) => Promise<T>;
    return await dynamicImport(packageName);
  } catch {
    throw new Error(
      `${feature} requires optional dependency '${packageName}'. Install it with: npm install ${packageName}`,
    );
  }
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
