import { defaultTheme } from "../shared/model.js";
const string = (maxLength) => ({ type: "string", maxLength, minLength: 1 });
const colors = {
  type: "object",
  additionalProperties: false,
  required: Object.keys(defaultTheme.light),
  properties: Object.fromEntries(
    Object.keys(defaultTheme.light).map((k) => [k, string(7)]),
  ),
};
export const blueprintSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  additionalProperties: false,
  required: [
    "schemaVersion",
    "product",
    "foundation",
    "runtime",
    "domain",
    "screens",
    "bindings",
    "theme",
  ],
  properties: {
    schemaVersion: { const: 1 },
    product: {
      type: "object",
      additionalProperties: false,
      required: ["id", "name", "mark"],
      properties: { id: string(60), name: string(120), mark: string(4) },
    },
    foundation: {
      type: "object",
      additionalProperties: false,
      required: ["version", "catalogDigest"],
      properties: { version: string(40), catalogDigest: string(80) },
    },
    runtime: {
      type: "object",
      additionalProperties: false,
      required: ["frontend", "backend", "persistence", "auth"],
      properties: {
        frontend: { enum: ["react", "svelte", "native"] },
        backend: { enum: ["node24", "python", "worker"] },
        persistence: { enum: ["sqlite", "adapter", "device"] },
        auth: { enum: ["google", "discord", "device"] },
      },
    },
    domain: {
      type: "object",
      additionalProperties: false,
      required: ["adapter"],
      properties: { adapter: string(100) },
    },
    screens: {
      type: "array",
      minItems: 1,
      maxItems: 12,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "id",
          "path",
          "recipe",
          "recipeVersion",
          "title",
          "description",
          "states",
        ],
        properties: {
          id: string(60),
          path: string(100),
          recipe: string(80),
          recipeVersion: { type: "integer", minimum: 1, maximum: 10000 },
          title: string(200),
          description: { type: "string", maxLength: 3000 },
          states: {
            type: "array",
            minItems: 1,
            maxItems: 20,
            items: string(40),
          },
        },
      },
    },
    bindings: {
      type: "object",
      maxProperties: 32,
      additionalProperties: string(100),
    },
    theme: {
      type: "object",
      additionalProperties: false,
      required: ["name", "font", "size", "spacing", "radius", "light", "dark"],
      properties: {
        name: string(120),
        font: { enum: ["DM Sans", "system-ui", "Georgia"] },
        size: { type: "number", minimum: 12, maximum: 24 },
        spacing: { type: "number", minimum: 8, maximum: 40 },
        radius: { type: "number", minimum: 0, maximum: 24 },
        light: colors,
        dark: colors,
      },
    },
  },
};
