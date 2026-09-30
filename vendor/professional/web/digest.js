/**
 * Deterministic canonical JSON serialization and SHA-256 digests.
 * Recursively sorts all object keys to produce stable, tamper-evident content hashes.
 */
import { createHash } from 'node:crypto';

function canonicalize(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  const sorted = {};
  for (const key of Object.keys(value).sort()) {
    sorted[key] = canonicalize(value[key]);
  }
  return sorted;
}

/** Stable JSON with object keys sorted recursively at every depth. */
export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

export function sha256Hex(data) {
  return createHash('sha256').update(typeof data === 'string' ? data : canonicalJson(data), 'utf8').digest('hex');
}

/** SHA-256 of the recursive canonical JSON of any value. */
export function canonicalDigest(value) {
  return sha256Hex(canonicalJson(value));
}
