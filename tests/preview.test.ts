import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { seed } from '../shared/recipes.js';
let vite: Awaited<ReturnType<typeof createServer>>;
let Preview: React.ComponentType<any>;
before(async () => {
  vite = await createServer({ server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
  ({ Preview } = await vite.ssrLoadModule('/src/product.tsx'));
});
after(async () => { await vite?.close(); });
const render = (data: any, module = 'blueprint') => renderToStaticMarkup(React.createElement(Preview, { data, module }));
test('blueprint preview uses selected screen content, not the unrelated pattern', () => {
  const data = seed('Selection contract');
  data.blueprint.screens[0].title = 'Actual selected screen';
  assert.match(render(data), /Actual selected screen/);
  assert.doesNotMatch(render(data), /Review your next release/);
  data.blueprintScreen = 'review';
  assert.match(render(data), /Review changes/);
  assert.match(render(data), /Accept changes/);
  assert.doesNotMatch(render(data), /Actual selected screen/);
  assert.match(render(data, 'patterns'), /Review your next release/);
});
test('unsupported preview states fall back to selected screen contract', () => {
  const data = seed();
  data.state = 'running';
  assert.match(render(data), /Fictional state fixture · ready/);
  data.blueprintScreen = 'removed-screen';
  assert.match(render(data), /Untitled interface/);
});
test('titles are escaped and malformed historical screen entries do not crash preview', () => {
  const data = seed();
  data.blueprint.screens[0].title = '<script>untrusted</script>';
  assert.match(render(data), /&lt;script&gt;untrusted&lt;\/script&gt;/);
  assert.doesNotMatch(render(data), /<script>untrusted/);
  data.blueprint.screens = [null] as any;
  assert.doesNotThrow(() => render(data));
  assert.match(render(data), /Resolve the blueprint errors/);
  assert.doesNotMatch(render(data), /Fictional state fixture/);
});
