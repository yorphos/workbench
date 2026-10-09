const text = { type: 'string', minLength: 1, maxLength: 200 };
const id = { type: 'string', pattern: '^[a-z][a-z0-9-]{0,59}$' };
export const compositionSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object', additionalProperties: false,
  required: ['schemaVersion', 'name', 'foundation', 'screens'],
  properties: {
    schemaVersion: { const: 2 }, name: text,
    foundation: {
      type: 'object', additionalProperties: false, required: ['version', 'catalogDigest'],
      properties: { version: text, catalogDigest: text },
    },
    screens: {
      type: 'array', minItems: 1, maxItems: 32,
      items: {
        type: 'object', additionalProperties: false,
        required: ['id', 'path', 'title', 'surface', 'version', 'bindings'],
        properties: {
          id, title: text, surface: id,
          path: { type: 'string', maxLength: 200, pattern: '^/(?:[a-z][a-z0-9-]*(?:/[a-z][a-z0-9-]*)*)?$' },
          version: { type: 'integer', minimum: 1, maximum: 10000 },
          bindings: { type: 'object', maxProperties: 32, propertyNames: { pattern: '^[a-zA-Z][a-zA-Z0-9]{0,59}$' }, additionalProperties: { type: 'string', pattern: '^[a-zA-Z][a-zA-Z0-9.]{0,99}$' } },
        },
      },
    },
  },
};
