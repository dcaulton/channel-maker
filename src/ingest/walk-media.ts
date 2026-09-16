import { readdir } from 'node:fs/promises';
import path from 'node:path';

const EXTENSIONS = new Set(['.mkv', '.mp4', '.m4v', '.avi', '.ts', '.m2ts']);

export async function walkMedia(root: string): Promise<string[]> {
  const out: string[] = [];

  async function visit(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await visit(full);
        continue;
      }
      if (
        entry.isFile() &&
        EXTENSIONS.has(path.extname(entry.name).toLowerCase())
      ) {
        out.push(full);
      }
    }
  }

  await visit(root);
  out.sort();
  return out;
}

export function toSourceUrl(
  filePath: string,
  root: string,
  publicBase?: string,
): string {
  if (!publicBase) {
    return filePath;
  }
  const rel = path.relative(root, filePath).split(path.sep).join('/');
  const encoded = rel
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `${publicBase.replace(/\/$/, '')}/${encoded}`;
}
