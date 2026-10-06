const HOOKS_DIR = /^apps\/web\/src\/features\/[^/]+\/hooks\//;
const FEATURE = /^apps\/web\/src\/features\//;
const NAME = /^use[A-Z][A-Za-z0-9]*(Query|Result|Form)$/;
const DECLARED =
  /^(?:export\s+)?(?:async\s+)?function\s+(use[A-Za-z0-9]*)|^(?:export\s+)?const\s+(use[A-Za-z0-9]*)\s*=/gm;

/** One hook per file in features/*\/hooks, named use<Name>Query | use<Feature>Result | use<Feature>Form. */
export function checkHookFile(path: string, content: string): string[] {
  if (!FEATURE.test(path) || /\.test\.tsx?$/.test(path)) return [];
  const declared = [...content.matchAll(DECLARED)].map((m) => m[1] ?? m[2]!);

  if (!HOOKS_DIR.test(path)) {
    return declared.map((name) => `${path}: hook ${name} must live in the feature's hooks/ folder`);
  }
  const base = path
    .split('/')
    .pop()!
    .replace(/\.tsx?$/, '');
  const errors: string[] = [];
  if (!NAME.test(base))
    errors.push(
      `${path}: file name must be use<Name>Query, use<Feature>Result or use<Feature>Form`,
    );
  if (declared.length !== 1)
    errors.push(`${path}: must declare exactly one hook, found ${declared.length}`);
  else if (declared[0] !== base)
    errors.push(`${path}: hook ${declared[0]} must match file name ${base}`);
  return errors;
}
