import { timingSafeEqual, createPrivateKey, createPublicKey, sign, verify, randomUUID } from 'node:crypto';

/** Trust only the deployment proxy, never an email supplied by a browser. */
export function integrationIdentity(headers, secret) {
  const get = name => typeof headers.get === 'function' ? headers.get(name) : headers[name];
  const supplied = get('x-portfolio-secret') || '';
  if (typeof secret !== 'string' || secret.length < 32 || typeof supplied !== 'string') return null;
  const a = Buffer.from(secret), b = Buffer.from(supplied);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const subject = get('x-portfolio-user'), email = get('x-portfolio-email'), role = get('x-portfolio-role');
  if (typeof subject !== 'string' || !subject || subject.length > 256 || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+$/.test(email) || !['admin', 'member'].includes(role)) return null;
  return { subject, email: email.toLowerCase(), role };
}

/** Ecosystem service-to-service identity. Default deny; every failure returns null. */
const SERVICE_HEADER = 'X-Portfolio-Service';
const DEFAULT_TTL_SECONDS = 60;
const DEFAULT_SKEW_SECONDS = 60;
// Canonical payload key order, shared byte-for-byte with python/identity.py.
const PAYLOAD_KEYS = ['v', 'iss', 'aud', 'scp', 'm', 'p', 'iat', 'exp', 'jti'];

const readHeader = (headers, name) => {
  if (headers && typeof headers.get === 'function') {
    const value = headers.get(name);
    return value == null ? undefined : value;
  }
  if (!headers || typeof headers !== 'object') return undefined;
  const wanted = name.toLowerCase();
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() !== wanted) continue;
    const value = headers[key];
    return Array.isArray(value) ? value[0] : value;
  }
  return undefined;
};

const isName = value => typeof value === 'string' && value.length > 0;
const isEpoch = value => Number.isSafeInteger(value) && value >= 0;
const secondsFrom = value => typeof value === 'function' ? value() : Number.isInteger(value) ? value : Math.floor(Date.now() / 1000);
const b64urlEncode = value => Buffer.from(value).toString('base64url');
const b64urlDecode = value => Buffer.from(value, 'base64url');

/** Sign a short-lived, audience/method/path/scope-bound token. `key` is base64 DER PKCS#8. */
export function serviceToken({ service, key, audience, scope = [], method, path, ttlSeconds = DEFAULT_TTL_SECONDS, now = () => Math.floor(Date.now() / 1000), jti } = {}) {
  const issuedAt = secondsFrom(now);
  const payload = {
    v: 1,
    iss: service,
    aud: audience,
    scp: Array.isArray(scope) ? [...scope] : [],
    m: method,
    p: path,
    iat: issuedAt,
    exp: issuedAt + ttlSeconds,
    jti: jti ?? randomUUID(),
  };
  const ordered = {};
  for (const name of PAYLOAD_KEYS) ordered[name] = payload[name];
  const encoded = b64urlEncode(Buffer.from(JSON.stringify(ordered), 'utf8'));
  const signingInput = `v1.${encoded}`;
  const privateKey = createPrivateKey({ key: Buffer.from(key, 'base64'), format: 'der', type: 'pkcs8' });
  return `${signingInput}.${b64urlEncode(sign(null, Buffer.from(signingInput, 'ascii'), privateKey))}`;
}

/** Verify an inbound service identity. Fail-closed: any failure returns null, never a throw. */
export function serviceIdentity(headers, check = {}) {
  try {
    if (!check || typeof check !== 'object') return null;
    const supplied = readHeader(headers, SERVICE_HEADER);
    if (!isName(supplied)) return null;
    const parts = supplied.split('.');
    if (parts.length !== 3 || parts[0] !== 'v1' || !parts[1] || !parts[2]) return null;
    let payload;
    try {
      payload = JSON.parse(b64urlDecode(parts[1]).toString('utf8'));
    } catch {
      return null;
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
    const { v, iss, aud, scp, m, p, iat, exp, jti } = payload;
    if (v !== 1 || !isName(iss) || !isName(aud) || !Array.isArray(scp) || !scp.every(isName)) return null;
    if (!isName(m) || !isName(p) || !isEpoch(iat) || !isEpoch(exp) || exp < iat || !isName(jti)) return null;

    const trust = check.trust, allow = check.allow;
    if (!trust || typeof trust !== 'object' || !Object.prototype.hasOwnProperty.call(trust, iss)) return null;
    if (aud !== check.service) return null;
    if (m !== check.method || p !== check.path) return null;
    if (!Array.isArray(allow) || !allow.includes(iss)) return null;
    if (check.scope != null && (!Array.isArray(check.scope) || !check.scope.every(s => isName(s) && scp.includes(s)))) return null;
    const skew = Number.isInteger(check.maxSkewSeconds) && check.maxSkewSeconds >= 0 ? check.maxSkewSeconds : DEFAULT_SKEW_SECONDS;
    const current = secondsFrom(check.now);
    if (current < iat - skew || current > exp + skew) return null;

    const publicDer = trust[iss];
    if (!isName(publicDer)) return null;
    const publicKey = createPublicKey({ key: Buffer.from(publicDer, 'base64'), format: 'der', type: 'spki' });
    if (!verify(null, Buffer.from(`${parts[0]}.${parts[1]}`, 'ascii'), publicKey, b64urlDecode(parts[2]))) return null;
    return { service: iss, audience: aud, scope: [...scp], expiresAt: exp };
  } catch {
    return null;
  }
}

/** Outbound headers when this app is provisioned with an ecosystem service key. */
export function serviceHeaders({ audience, scope = [], method, path } = {}, env = process.env) {
  try {
    const source = env && typeof env === 'object' ? env : {};
    const service = source.ECOSYSTEM_SERVICE_ID, key = source.ECOSYSTEM_SERVICE_KEY;
    if (!isName(service) || !isName(key) || !isName(audience)) return {};
    const ttl = Number.parseInt(source.ECOSYSTEM_TOKEN_TTL, 10);
    const ttlSeconds = Number.isSafeInteger(ttl) && ttl > 0 ? ttl : DEFAULT_TTL_SECONDS;
    return { [SERVICE_HEADER]: serviceToken({ service, key, audience, scope, method, path, ttlSeconds }) };
  } catch {
    return {};
  }
}

/** Receiver allow-list from deployment config. Accepts a JSON array or a comma-separated
 * string; absent or malformed config denies everything. `serviceIdentity` still verifies the
 * caller signature, audience, method, path and scope. */
export function ecosystemAllow(env = process.env) {
  const source = env && typeof env === 'object' ? env : {};
  const raw = source.ECOSYSTEM_ALLOWED_SERVICES;
  if (typeof raw !== 'string' || !raw.trim()) return [];
  const trimmed = raw.trim();
  if (!trimmed.startsWith('[') && !trimmed.startsWith('{'))
    return trimmed.split(',').map(part => part.trim()).filter(isName);
  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed.filter(isName) : [];
  } catch {
    return [];
  }
}
