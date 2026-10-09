export type Callback = (...args: any[]) => any;
export interface Surface<B extends { [K in keyof B]: Callback }> {
  version: number;
  bindings: (keyof B & string)[];
  mount(context: { element: HTMLElement; bindings: B; signal: AbortSignal }): void | (() => void) | Promise<void | (() => void)>;
}
export interface Composition {
  schemaVersion: 2;
  name: string;
  foundation: { version: string; catalogDigest: string };
  screens: { id: string; path: string; title: string; surface: string; version: number; bindings: Record<string, string> }[];
}
export type SurfaceRegistry = Record<string, Surface<any>>;
export function createComposition(name: string, screens: Composition['screens']): Composition;
export function validateComposition(value: unknown, surfaces: SurfaceRegistry, catalog?: { foundationVersion: string; sourceDigest: string }): { valid: boolean; errors: string[] };
export function resolveSurface(composition: Composition, screenId: string, surfaces: SurfaceRegistry, callbacks: Record<string, Callback>): { screen: Composition['screens'][number]; surface: Surface<any>; bindings: Readonly<Record<string, Callback>> };
export function compositionHost(element: HTMLElement): { show(composition: Composition, screenId: string, surfaces: SurfaceRegistry, callbacks: Record<string, Callback>): Promise<void>; dispose(): void };
