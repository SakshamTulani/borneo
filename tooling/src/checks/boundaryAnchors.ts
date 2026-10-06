export type Anchor = { name: string; pattern: string };

const FEATURE_FILE = /^apps\/web\/src\/features\/[^/]+\/(.+)$/;
const FEATURE_ALLOWED = /^(model\.ts|index\.ts|(api|mappers|repository|hooks|ui)\/.+)$/;
const MODULE_FILE = /^apps\/api\/src\/modules\/[^/]+\/([^/]+)$/;
const MODULE_ALLOWED = /^([^/]+\.(route|service|repository|schema)\.ts|index\.ts)$/;
const TEST = /\.test\.tsx?$/;

/** Every boundary pattern must match a real file, and slices only contain known layers. */
export function checkBoundaryAnchors(anchors: Anchor[], files: string[]): string[] {
  const errors = anchors
    .filter((a) => !files.some((f) => new RegExp(a.pattern).test(f)))
    .map((a) => `boundary "${a.name}" (${a.pattern}) matches no file`);

  for (const file of files) {
    if (TEST.test(file)) continue;
    const feature = FEATURE_FILE.exec(file);
    if (feature && !FEATURE_ALLOWED.test(feature[1]!)) {
      errors.push(
        `${file}: not in a known feature layer (api, mappers, repository, hooks, ui, model.ts, index.ts)`,
      );
    }
    const mod = MODULE_FILE.exec(file);
    if (mod && !MODULE_ALLOWED.test(mod[1]!)) {
      errors.push(`${file}: module files must be *.route|service|repository|schema.ts or index.ts`);
    }
  }
  return errors;
}
