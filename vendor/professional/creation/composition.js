import catalog from './catalog.json' with { type: 'json' };
const getCatalog = () => catalog;
import validator from './composition-validator.js';
export { compositionSchema } from './composition-schema.js';

// Composition describes navigation and versioned surfaces only. Application code
// owns DOM/React rendering, data, permissions and the actual callback functions.
export function createComposition(name, screens) {
  const catalog = getCatalog();
  return { schemaVersion: 2, name, foundation: { version: catalog.foundationVersion, catalogDigest: catalog.sourceDigest }, screens: structuredClone(screens) };
}
export function validateComposition(value, surfaces, catalog = getCatalog()) {
  if (!validator(value)) return { valid: false, errors: validator.errors.map(error => `${error.instancePath || '/'} ${error.message}`) };
  const errors = [];
  if (value.foundation.version !== catalog.foundationVersion || value.foundation.catalogDigest !== catalog.sourceDigest)
    errors.push('Review the Foundation pin before adoption; upgrades are never implicit.');
  const ids = new Set(), paths = new Set();
  for (const screen of value.screens) {
    if (ids.has(screen.id) || paths.has(screen.path)) errors.push('Screen IDs and paths must be unique.');
    ids.add(screen.id); paths.add(screen.path);
    const surface = Object.hasOwn(surfaces, screen.surface) ? surfaces[screen.surface] : undefined;
    if (!surface || surface.version !== screen.version) { errors.push(`${screen.id}: unavailable surface version.`); continue; }
    const declared = surface.bindings;
    if (!Array.isArray(declared) || declared.some(key => typeof key !== 'string')) { errors.push(`${screen.id}: invalid application surface contract.`); continue; }
    if (Object.keys(screen.bindings).length !== declared.length || declared.some(key => !Object.hasOwn(screen.bindings, key)) || Object.entries(screen.bindings).some(([key, binding]) => !declared.includes(key) || typeof binding !== 'string' || !/^[a-zA-Z][a-zA-Z0-9.]{0,99}$/.test(binding)))
      errors.push(`${screen.id}: supply exactly the surface's declared callback bindings.`);
  }
  if (!paths.has('/')) errors.push('A composition needs a root screen.');
  return { valid: errors.length === 0, errors };
}
export function resolveSurface(composition, screenId, surfaces, callbacks) {
  const report = validateComposition(composition, surfaces);
  if (!report.valid) throw new Error(report.errors.join(' '));
  const screen = composition.screens.find(item => item.id === screenId);
  if (!screen) throw new Error('Unknown screen.');
  const surface = surfaces[screen.surface], bindings = Object.create(null);
  for (const [key, binding] of Object.entries(screen.bindings)) {
    if (!Object.hasOwn(callbacks, binding) || typeof callbacks[binding] !== 'function') throw new Error(`Missing application callback: ${binding}`);
    bindings[key] = callbacks[binding];
  }
  return { screen, surface, bindings: Object.freeze(bindings) };
}

// Each mount has its own detached lifetime. A late async mount cannot overwrite
// the new screen; its returned cleanup still runs. No global router is installed.
export function compositionHost(element) {
  let current = null;
  const dispose = () => {
    const previous = current;
    if (!previous) return;
    current = null;
    previous.controller.abort();
    previous.node.remove();
    previous.cleanup?.();
  };
  return {
    async show(composition, screenId, surfaces, callbacks) {
      const resolved = resolveSurface(composition, screenId, surfaces, callbacks);
      if (typeof resolved.surface.mount !== 'function') throw new Error('Surface has no application mount.');
      dispose();
      const node = element.ownerDocument.createElement('div');
      node.dataset.compositionScreen = screenId;
      const entry = { node, controller: new AbortController(), cleanup: null };
      current = entry;
      element.append(node);
      try {
        const cleanup = await resolved.surface.mount({ element: node, bindings: resolved.bindings, signal: entry.controller.signal });
        if (cleanup !== undefined && typeof cleanup !== 'function') throw new Error('Surface mount must return a cleanup function or undefined.');
        if (entry.controller.signal.aborted) cleanup?.();
        else entry.cleanup = cleanup;
      } catch (error) {
        if (current === entry) dispose();
        throw error;
      }
    },
    dispose,
  };
}
