const REPO = /^apps\/api\/src\/modules\/([^/]+)\/[^/]+\.repository\.ts$/;
const SCOPED_MARKER = /\bcustomerId\b|\bCustomerId\b|\bcustomer_id\b/;
const EXPORTED_FN =
  /export\s+(?:async\s+)?function\s+(\w+)\s*(?:<[^>]*>)?\(([^)]*)\)|export\s+const\s+(\w+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*(?::[^=]+)?=>/g;

/**
 * Customer-scoped repositories (ADR-0005): any repository mentioning a customer id.
 * Every exported function takes `customerId: CustomerId` first, and the module has a cross-customer test.
 */
export function checkScoping(files: Map<string, string>): string[] {
  const errors: string[] = [];
  for (const [path, content] of files) {
    const match = REPO.exec(path);
    if (!match || !SCOPED_MARKER.test(content)) continue;

    for (const fn of content.matchAll(EXPORTED_FN)) {
      const name = fn[1] ?? fn[3]!;
      const firstParam = (fn[2] ?? fn[4] ?? '').split(',')[0]!.trim();
      if (!/^customerId\s*:\s*CustomerId$/.test(firstParam)) {
        errors.push(`${path}: ${name} must take "customerId: CustomerId" as its first param`);
      }
    }
    const moduleDir = `apps/api/src/modules/${match[1]}/`;
    const hasTest = [...files.keys()].some(
      (p) => p.startsWith(moduleDir) && p.endsWith('.cross-customer.test.ts'),
    );
    if (!hasTest)
      errors.push(`${moduleDir}: customer-scoped module needs a *.cross-customer.test.ts`);
  }
  return errors;
}
