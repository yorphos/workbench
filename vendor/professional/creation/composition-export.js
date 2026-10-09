import { isDeepStrictEqual } from 'node:util';
import { validateComposition } from './composition.js';
import { profileFiles, verifyCreationRelease } from './scaffold.js';

// Export a reviewed application source snapshot, never synthesize its auth,
// persistence or domain callbacks from binding names. Caller supplies the real
// package/lock/entrypoint and surface registration; they remain app-owned.
export function buildCompositionExport(composition, surfaces, applicationFiles) {
  const report = validateComposition(composition, surfaces);
  if (!report.valid) throw new Error(report.errors.join(' '));
  const catalog = verifyCreationRelease();
  const files = Object.create(null);
  for (const [path, bytes] of Object.entries(applicationFiles)) {
    if (!/^[a-zA-Z0-9_./-]+$/.test(path) || path.startsWith('/') || path.split('/').some(part => !part || part === '.' || part === '..') || path.startsWith('vendor/foundation/') || path === 'composition.json' || /(^|\/)\.env(?:\.|$)/.test(path))
      throw new Error(`Unsafe, reserved or credential file path: ${path}`);
    if (!(typeof bytes === 'string' || bytes instanceof Uint8Array)) throw new Error(`Invalid file content: ${path}`);
    files[path] = Buffer.from(bytes);
  }
  for (const required of ['package.json', 'package-lock.json', 'index.html'])
    if (!files[required]) throw new Error(`Supply the real application file: ${required}`);
  const pkg = JSON.parse(files['package.json']), lock = JSON.parse(files['package-lock.json']);
  if (pkg.name !== lock.packages?.['']?.name || !isDeepStrictEqual(pkg.dependencies || {}, lock.packages[''].dependencies || {}) || !isDeepStrictEqual(pkg.devDependencies || {}, lock.packages[''].devDependencies || {}))
    throw new Error('Application package and lockfile disagree.');
  if (pkg.dependencies?.ajv !== catalog.dependencies.ajv) throw new Error('Pin the supported AJV runtime in the application package and lockfile before exporting.');
  files['composition.json'] = Buffer.from(JSON.stringify(composition, null, 2) + '\n');
  const source = profileFiles();
  for (const name of ['LICENSE', 'creation/composition.js', 'creation/composition.d.ts', 'creation/composition-schema.js', 'creation/composition-validator.js', 'creation/catalog.json']) {
    if (!source[name]) throw new Error(`Missing canonical composition file: ${name}`);
    files['vendor/foundation/' + name] = source[name];
  }
  return files;
}
