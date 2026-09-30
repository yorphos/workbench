/** Server-only contracts for explicitly exported tools and standing owner grants.
 * Not an authorizer by itself: receivers also verify ordinary service identity.
 * Grants are installed by the owner, never accepted from an agent's request.
 */
import { createHash, createPrivateKey, createPublicKey, sign, verify, randomUUID } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import canonicalize from 'canonicalize';

export class AgentAccessError extends Error {
  constructor(code, status = 403) { super(code); this.name = 'AgentAccessError'; this.code = code; this.status = status; }
}
const fail = (code, status) => { throw new AgentAccessError(code, status); };
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
export const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const text = value => typeof value === 'string' && value.length > 0 && value.length <= 256;
const id = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,255}$/.test(value);
const list = value => Array.isArray(value) && value.length <= 512 && value.every(text);
const forbiddenKeys = new Set(['__proto__', 'prototype', 'constructor']);
export const AGENT_CONTRACT_VERSION = 1;
export const DELEGATION_PREFIX = 'yrp-delegation-v1';
export const ASSERTION_TTL_SECONDS = 30;
export const ASSERTION_SKEW_SECONDS = 5;

/** Stable JSON with bounded nesting and no lossy undefined/non-finite values. */
export function canonicalJSON(value) {
  let nodes = 0;
  function walk(item, depth) {
    if (++nodes > 20000 || depth > 24) fail('json_too_complex', 422);
    if (typeof item === 'string' && !item.isWellFormed()) fail('invalid_json_value', 422);
    if (item === null || typeof item === 'boolean' || typeof item === 'string') return;
    if (typeof item === 'number' && Number.isFinite(item) && (!Number.isInteger(item) || Number.isSafeInteger(item))) return;
    if (Array.isArray(item)) {
      for (let i = 0; i < item.length; i++) { if (!own(item, i)) fail('invalid_json_value', 422); walk(item[i], depth + 1); }
      return;
    }
    if (!isRecord(item)) fail('invalid_json_value', 422);
    for (const key of Object.keys(item)) {
      if (forbiddenKeys.has(key) || !key.isWellFormed()) fail('unsafe_json_key', 422);
      walk(item[key], depth + 1);
    }
  }
  walk(value, 0);
  const encoded = canonicalize(value);
  if (Buffer.byteLength(encoded) > 256 * 1024) fail('json_too_large', 413);
  return encoded;
}
export const inputDigest = value => createHash('sha256').update(canonicalJSON(value)).digest('hex');

// A deliberately closed JSON Schema subset. Unsupported validation keywords are
// rejected at publication, not ignored. No $ref fetching or code evaluation.
const schemaKeys = new Set(['$schema', 'type', 'properties', 'required', 'additionalProperties', 'items', 'enum', 'const', 'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'minLength', 'maxLength', 'minItems', 'maxItems', 'minProperties', 'maxProperties', 'title', 'description']);
const types = new Set(['object', 'array', 'string', 'integer', 'number', 'boolean', 'null']);
const ajv = new Ajv2020({ strict: true, allErrors: false, coerceTypes: false, useDefaults: false, removeAdditional: false, addUsedSchema: false, validateFormats: false });
const validators = new Map();

/** The walker limits schema complexity; Ajv owns schema and instance semantics. */
export function compileSchema(schema) {
  const key = canonicalJSON(schema);
  if (validators.has(key)) return validators.get(key).validate;
  let count = 0;
  function visit(node, depth) {
    if (!isRecord(node) || ++count > 256 || depth > 12) fail('unsupported_tool_schema', 422);
    const kind = Array.isArray(node.type) && node.type.length === 2 && node.type[1] === 'null' ? node.type[0] : node.type;
    if (Object.keys(node).some(key => !schemaKeys.has(key)) || !types.has(kind)) fail('unsupported_tool_schema', 422);
    if (node.$schema !== undefined && node.$schema !== 'https://json-schema.org/draft/2020-12/schema') fail('unsupported_tool_schema', 422);
    if (own(node, 'enum') && (!Array.isArray(node.enum) || node.enum.length === 0 || node.enum.length > 256)) fail('unsupported_tool_schema', 422);
    if (own(node, 'enum')) node.enum.forEach(value => canonicalJSON(value));
    if (own(node, 'const')) canonicalJSON(node.const);
    for (const key of ['minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum']) {
      if (own(node, key) && (!['number', 'integer'].includes(kind) || !Number.isFinite(node[key]))) fail('unsupported_tool_schema', 422);
    }
    for (const key of ['minLength', 'maxLength', 'minItems', 'maxItems']) {
      if (own(node, key) && (!Number.isSafeInteger(node[key]) || node[key] < 0 || node[key] > 262144 || !(key.endsWith('Length') ? kind === 'string' : kind === 'array'))) fail('unsupported_tool_schema', 422);
    }
    if (kind === 'string' && !own(node, 'maxLength') && !own(node, 'enum') && !own(node, 'const')) fail('unbounded_tool_schema', 422);
    if (kind === 'object') {
      if (!isRecord(node.properties) || Object.keys(node.properties).some(key => forbiddenKeys.has(key))) fail('unsupported_tool_schema', 422);
      if (node.required !== undefined && (!list(node.required) || new Set(node.required).size !== node.required.length || !node.required.every(key => own(node.properties, key)))) fail('unsupported_tool_schema', 422);
      if (node.additionalProperties !== false && node.additionalProperties !== true) fail('unsupported_tool_schema', 422);
      if (node.additionalProperties && (!Number.isSafeInteger(node.maxProperties) || node.maxProperties > 128 || node.maxProperties < 0)) fail('unbounded_tool_schema', 422);
      Object.values(node.properties).forEach(child => visit(child, depth + 1));
    } else if (['properties', 'required', 'additionalProperties'].some(key => own(node, key))) fail('unsupported_tool_schema', 422);
    if (kind === 'array') {
      if (!Number.isSafeInteger(node.maxItems) || node.maxItems > 4096 || node.maxItems < 0) fail('unbounded_tool_schema', 422);
      visit(node.items, depth + 1);
    }
    else if (own(node, 'items')) fail('unsupported_tool_schema', 422);
  }
  visit(schema, 0);
  const copy = JSON.parse(key);
  let validate;
  try { validate = ajv.compile(copy); } catch { fail('unsupported_tool_schema', 422); }
  if (validators.size >= 128) { const oldest = validators.keys().next().value; ajv.removeSchema(validators.get(oldest).schema); validators.delete(oldest); }
  validators.set(key, { schema: copy, validate });
  return validate;
}
export function assertSchema(schema) { compileSchema(schema); return schema; }

/** Validate both on gateway dispatch and receiver entry; never coerce arguments. */
export function validateInput(schema, value) {
  const validate = compileSchema(schema);
  canonicalJSON(value);
  if (!validate(value)) fail('invalid_tool_arguments', 422);
  return value;
}

/** Opt-in external metadata. Never infer a schema from the legacy I/O hints. */
export function agentTool(capability) {
  const metadata = capability?.agent;
  if (!isRecord(metadata) || metadata.schemaVersion !== 1 || metadata.enabled !== true) fail('capability_not_exported', 404);
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(metadata.name ?? '') || metadata.delegation !== true) fail('invalid_agent_descriptor', 422);
  if (typeof capability.id !== 'string' || !/^[A-Za-z0-9._-]+:[A-Za-z0-9._-]+$/.test(capability.id) || !Number.isSafeInteger(capability.version) || capability.version < 1) fail('invalid_agent_descriptor', 422);
  if (metadata.contractVersion !== AGENT_CONTRACT_VERSION) fail('unsupported_operation_contract', 422);
  const app = capability.id.split(':')[0];
  if (capability.auth?.mode !== 'service' || !text(capability.auth.scope) || !list(capability.auth.allowedCallers) || !capability.auth.allowedCallers.length || !capability.auth.allowedCallers.every(id)) fail('invalid_agent_authorization', 422);
  if (!['read', 'proposal', 'action'].includes(capability.kind) || metadata.executor !== app || ![app, 'none'].includes(metadata.chargeOwner)) fail('invalid_agent_descriptor', 422);
  const effects = capability.effects;
  if (!isRecord(effects) || !['reads', 'mutates', 'external'].every(key => list(effects[key])) || !['none', 'reserve'].includes(effects.cost?.kind) || !['safe', 'blocked', 'manual_review'].includes(capability.retry)) fail('invalid_agent_effects', 422);
  const mutation = capability.kind === 'action' || effects.mutates.length > 0 || effects.external.length > 0;
  const transport = capability.transport;
  if (!isRecord(transport) || !['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(transport.method) || typeof transport.path !== 'string' || !/^\/(?!\/)[A-Za-z0-9_./{}-]*$/.test(transport.path) || transport.path.split('/').some(part => ['.', '..'].includes(part))) fail('invalid_agent_transport', 422);
  assertSchema(metadata.inputSchema);
  if (metadata.inputSchema.type !== 'object' || metadata.inputSchema.additionalProperties !== false) fail('invalid_agent_descriptor', 422);
  if (!Array.isArray(metadata.resourceFields) || !metadata.resourceFields.every(key => text(key) && own(metadata.inputSchema.properties, key) && metadata.inputSchema.properties[key].type === 'string' && metadata.inputSchema.required?.includes(key))) fail('invalid_agent_descriptor', 422);
  assertSchema(metadata.outputSchema);
  if (metadata.outputSchema.type !== 'object') fail('invalid_agent_descriptor', 422);
  const fields = Object.keys(metadata.inputSchema.properties);
  const bindings = metadata.bindings;
  if (!isRecord(bindings) || !isRecord(bindings.path) || !isRecord(bindings.query) || !list(bindings.body)) fail('invalid_agent_bindings', 422);
  if ([...Object.keys(bindings.path), ...Object.keys(bindings.query)].some(name => !/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(name))) fail('invalid_agent_bindings', 422);
  const mapped = [...Object.values(bindings.path), ...Object.values(bindings.query), ...bindings.body];
  if (new Set(mapped).size !== mapped.length || mapped.length !== fields.length || mapped.some(field => !fields.includes(field))) fail('invalid_agent_bindings', 422);
  const pathFields = [...transport.path.matchAll(/\{([A-Za-z][A-Za-z0-9_-]*)\}/g)].map(match => match[1]);
  if (pathFields.length !== Object.keys(bindings.path).length || !pathFields.every(field => own(bindings.path, field)) || transport.path.replace(/\{[A-Za-z][A-Za-z0-9_-]*\}/g, '').match(/[{}]/)) fail('invalid_agent_bindings', 422);
  for (const field of [...Object.values(bindings.path), ...Object.values(bindings.query)]) {
    if (!['string', 'integer', 'number', 'boolean'].includes(metadata.inputSchema.properties[field]?.type)) fail('invalid_agent_bindings', 422);
  }
  for (const field of Object.values(bindings.path)) if (!metadata.inputSchema.required?.includes(field)) fail('invalid_agent_bindings', 422);
  if (['GET', 'HEAD'].includes(transport.method) && bindings.body.length) fail('invalid_agent_bindings', 422);
  if (!list(metadata.constraintFields) || new Set(metadata.constraintFields).size !== metadata.constraintFields.length || metadata.constraintFields.some(field => !schemaField(metadata.inputSchema, field))) fail('invalid_agent_constraints', 422);
  if (!isRecord(metadata.operations) || !['lookup', 'status', 'cancel'].every(key => own(metadata.operations, key) && (metadata.operations[key] === null || /^[A-Za-z0-9._-]+:[A-Za-z0-9._-]+$/.test(metadata.operations[key])))) fail('invalid_agent_operations', 422);
  if (mutation && (!metadata.operations.lookup || !metadata.operations.status || capability.retry !== 'manual_review')) fail('invalid_agent_operations', 422);
  if (mutation && (capability.idempotency?.key !== 'required' || !text(capability.idempotency.field) || !metadata.inputSchema.required?.includes(capability.idempotency.field) || metadata.inputSchema.properties[capability.idempotency.field]?.type !== 'string')) fail('mutation_requires_idempotency', 422);
  return {
    name: metadata.name,
    description: typeof capability.description === 'string' ? capability.description.slice(0, 4000) : capability.id,
    inputSchema: structuredClone(metadata.inputSchema),
    outputSchema: structuredClone(metadata.outputSchema),
  };
}

function schemaField(schema, path) {
  if (!text(path) || path.split('.').some(part => forbiddenKeys.has(part))) return null;
  let field = schema;
  for (const key of path.split('.')) { if (!own(field.properties ?? {}, key)) return null; field = field.properties[key]; }
  return field;
}
export function inputField(input, path) {
  let value = input;
  for (const key of path.split('.')) { if (!isRecord(value) || !own(value, key)) return undefined; value = value[key]; }
  return value;
}

/** Fixed descriptor bindings only. Sign the returned concrete path including query. */
export function bindAgentRequest(capability, input) {
  agentTool(capability);
  validateInput(capability.agent.inputSchema, input);
  const { bindings } = capability.agent;
  let path = capability.transport.path;
  for (const [parameter, field] of Object.entries(bindings.path)) {
    const value = String(input[field]);
    if (!value || value === '.' || value === '..') fail('invalid_tool_arguments', 422);
    path = path.replace(`{${parameter}}`, encodeURIComponent(value));
  }
  const query = new URLSearchParams();
  for (const key of Object.keys(bindings.query).sort()) {
    const value = input[bindings.query[key]];
    if (value !== undefined) query.set(key, String(value));
  }
  if (query.size) path += '?' + query.toString();
  const body = {};
  for (const field of bindings.body) if (own(input, field)) body[field] = input[field];
  return { method: capability.transport.method, path, body: bindings.body.length ? body : null };
}

/** Read one owner-configured file or inline value, with no caller-selected path. */
export function readConfig(env, prefix) {
  let raw;
  if (env[`${prefix}_FILE`]) {
    const path = env[`${prefix}_FILE`];
    const stat = statSync(path);
    if (!stat.isFile() || stat.size > 1024 * 1024) fail('configuration_unavailable', 503);
    raw = readFileSync(path, 'utf8');
  } else raw = env[`${prefix}_JSON`];
  if (typeof raw !== 'string' || Buffer.byteLength(raw) > 1024 * 1024) fail('configuration_unavailable', 503);
  try { return JSON.parse(raw); } catch { fail('configuration_unavailable', 503); }
}
export function loadGrants(env = process.env) {
  try {
    const config = readConfig(env, 'AGENT_GRANTS');
    if (config?.schemaVersion !== 1 || !Array.isArray(config.grants) || config.grants.length > 256 || !Array.isArray(config.clients) || config.clients.length > 256) fail('configuration_unavailable', 503);
    const clients = new Map();
    for (const client of config.clients) {
      if (!isRecord(client) || !id(client.id) || !id(client.owner) || typeof client.enabled !== 'boolean' || clients.has(client.id)) fail('configuration_unavailable', 503);
      clients.set(client.id, client);
    }
    const seen = new Set();
    for (const grant of config.grants) {
      if (!isRecord(grant) || !id(grant.id) || seen.has(grant.id) || !Number.isSafeInteger(grant.revision) || grant.revision < 1 || !id(grant.owner) || !id(grant.client) || !id(grant.issuer) || !list(grant.audiences) || !list(grant.capabilities) || !Number.isSafeInteger(grant.expiresAt) || grant.expiresAt < 0 || typeof grant.enabled !== 'boolean' || !isRecord(grant.resources) || !Object.values(grant.resources).every(list) || !isRecord(grant.constraints)) fail('configuration_unavailable', 503);
      if (grant.capabilities.includes('*') && grant.futureCapabilities !== true) fail('configuration_unavailable', 503);
      if (own(grant, 'futureCapabilities') && typeof grant.futureCapabilities !== 'boolean') fail('configuration_unavailable', 503);
      for (const [field, constraint] of Object.entries(grant.constraints)) {
        if (!text(field) || field.split('.').some(part => forbiddenKeys.has(part)) || !isRecord(constraint) || !Object.keys(constraint).length || Object.keys(constraint).some(key => !['allowed', 'maximum'].includes(key))) fail('configuration_unavailable', 503);
        if (own(constraint, 'allowed') && (!list(constraint.allowed) || !constraint.allowed.length)) fail('configuration_unavailable', 503);
        if (own(constraint, 'maximum') && (typeof constraint.maximum !== 'number' || !Number.isFinite(constraint.maximum) || constraint.maximum <= 0)) fail('configuration_unavailable', 503);
      }
      const client = clients.get(grant.client);
      if (!client || client.owner !== grant.owner) fail('configuration_unavailable', 503);
      if (!client.enabled) grant.enabled = false;
      seen.add(grant.id);
    }
    return config.grants;
  } catch { fail('configuration_unavailable', 503); }
}

/** Returns the configured grant, never authorization copied from the request. */
export function authorizeGrant(grants, { grantId, client, issuer, audience, capability, input, now = Math.floor(Date.now() / 1000) }) {
  agentTool(capability);
  if (!capability.auth.allowedCallers.includes(issuer)) fail('delegation_denied');
  const grant = grants.find(entry => entry.id === grantId);
  const permits = (values, value) => Array.isArray(values) && (values.includes(value) || values.includes('*'));
  if (!grant || !grant.enabled || grant.expiresAt <= now || grant.client !== client || grant.issuer !== issuer || !permits(grant.audiences, audience) || !permits(grant.capabilities, capability.id)) fail('delegation_denied');
  for (const field of capability.agent.resourceFields) {
    const values = grant.resources[field];
    if (!Array.isArray(values) || values.length === 0) fail('delegation_denied');
    if (input !== undefined && (typeof input[field] !== 'string' || !permits(values, input[field]))) fail('resource_denied');
  }
  if (grant.capabilities.includes('*') && grant.futureCapabilities !== true) fail('delegation_denied');
  for (const field of capability.agent.constraintFields) {
    const constraint = grant.constraints?.[field];
    if (!isRecord(constraint) || (!own(constraint, 'allowed') && !own(constraint, 'maximum'))) fail('delegation_denied');
    if (input !== undefined) {
      const value = inputField(input, field);
      if (own(constraint, 'allowed') && !constraint.allowed.includes(value)) fail('policy_denied');
      if (own(constraint, 'maximum') && (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > constraint.maximum)) fail('limit_denied');
    }
  }
  if (input !== undefined) validateInput(capability.agent.inputSchema, input);
  return grant;
}

export function delegationHeaders({ grant, capability, audience, method, path, input, operationId, now = Math.floor(Date.now() / 1000) }, env = process.env) {
  if (!id(operationId) || env.ECOSYSTEM_SERVICE_ID !== grant.issuer || grant.expiresAt <= now) fail('delegation_denied');
  agentTool(capability);
  const payload = { v: 1, iss: grant.issuer, aud: audience, owner: grant.owner, client: grant.client, grantId: grant.id, grantRevision: grant.revision, capabilityId: capability.id, capabilityVersion: capability.version, operationContractVersion: capability.agent.contractVersion, method, path, digest: inputDigest(input), operationId, iat: now, exp: Math.min(now + ASSERTION_TTL_SECONDS, grant.expiresAt), jti: randomUUID() };
  const encoded = Buffer.from(canonicalJSON(payload)).toString('base64url');
  const message = `${DELEGATION_PREFIX}.${encoded}`;
  const key = createPrivateKey({ key: Buffer.from(env.ECOSYSTEM_SERVICE_KEY, 'base64'), format: 'der', type: 'pkcs8' });
  if (key.asymmetricKeyType !== 'ed25519') fail('invalid_signing_key', 503);
  return { 'X-Portfolio-Delegation': `${message}.${sign(null, Buffer.from(message), key).toString('base64url')}` };
}

/** Called only AFTER the receiver verifies the normal portfolio service token. */
export function verifyDelegation(headers, { callerService, audience, capability, method, path, input, now = Math.floor(Date.now() / 1000) }, env = process.env) {
  try {
    const raw = typeof headers?.get === 'function' ? headers.get('x-portfolio-delegation') : headers?.['x-portfolio-delegation'] ?? headers?.['X-Portfolio-Delegation'];
    if (typeof raw !== 'string' || raw.length > 8192 || !/^yrp-delegation-v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(raw)) fail('delegation_denied');
    const [version, encoded, signature] = raw.split('.');
    if (Buffer.from(encoded, 'base64url').toString('base64url') !== encoded || Buffer.from(signature, 'base64url').toString('base64url') !== signature) fail('delegation_denied');
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    const ring = JSON.parse(env.ECOSYSTEM_TRUST_KEYS ?? '{}');
    if (!isRecord(ring) || !own(ring, callerService) || payload.iss !== callerService) fail('delegation_denied');
    const key = createPublicKey({ key: Buffer.from(ring[callerService], 'base64'), format: 'der', type: 'spki' });
    if (key.asymmetricKeyType !== 'ed25519' || !verify(null, Buffer.from(`${version}.${encoded}`), key, Buffer.from(signature, 'base64url'))) fail('delegation_denied');
    if (payload.v !== 1 || payload.aud !== audience || payload.capabilityId !== capability.id || payload.capabilityVersion !== capability.version || payload.operationContractVersion !== capability.agent.contractVersion || payload.method !== method || payload.path !== path || payload.digest !== inputDigest(input) || !id(payload.operationId) || !id(payload.jti) || !id(payload.owner) || !id(payload.client) || !id(payload.grantId) || !Number.isSafeInteger(payload.grantRevision) || payload.grantRevision < 1 || !Number.isSafeInteger(payload.iat) || payload.iat < 0 || !Number.isSafeInteger(payload.exp) || payload.exp <= now || payload.iat > now + ASSERTION_SKEW_SECONDS || payload.exp <= payload.iat || payload.exp - payload.iat > ASSERTION_TTL_SECONDS) fail('delegation_denied');
    const grant = authorizeGrant(loadGrants(env), { grantId: payload.grantId, client: payload.client, issuer: callerService, audience, capability, input, now });
    if (grant.owner !== payload.owner || grant.revision !== payload.grantRevision || payload.exp > grant.expiresAt) fail('delegation_denied');
    const operationField = capability.idempotency?.field;
    if (capability.idempotency?.key === 'required' && input[operationField] !== payload.operationId) fail('delegation_denied');
    return { owner: grant.owner, client: grant.client, grantId: grant.id, grantRevision: grant.revision, issuer: callerService, operationId: payload.operationId, inputDigest: payload.digest, constraints: structuredClone(grant.constraints) };
  } catch { fail('delegation_denied'); }
}
