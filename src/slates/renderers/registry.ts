import { BasicSlateRenderer } from '../basic-slate-renderer';
import { VhsSlateRenderer } from './vhs-slate-renderer';
import { basicRendererName } from '../slate-spec';

const CUSTOM: Record<string, new () => BasicSlateRenderer> = {
  vhs: VhsSlateRenderer,
};

export function rendererNames(): string[] {
  return Object.keys(CUSTOM);
}

/** Nonzero renderer name selects a subclass. Otherwise the basic renderer. */
export function resolveRenderer(
  name: string | undefined | null,
): BasicSlateRenderer {
  const key = basicRendererName(name);
  if (!key) return new BasicSlateRenderer();
  const Custom = CUSTOM[key];
  if (!Custom) {
    throw new Error(`No slate renderer "${key}"`);
  }
  return new Custom();
}
