import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { KU } from '../src/lib/ku';
import { FA } from '../src/lib/fa';

/**
 * Arabic is the source language and English is the inline fallback passed to
 * t(ar, en). Sorani and Persian live in lazy dictionaries whose keys are the
 * Arabic source strings. There is no separate ar.ts/en.ts by design.
 */
function keysOf(file: string): Set<string> {
  const text = readFileSync(file, 'utf8');
  const keys = new Set<string>();
  for (const match of text.matchAll(/^\s*'((?:\\.|[^'])*)':/gm)) {
    keys.add(match[1].replace(/\\'/g, "'"));
  }
  return keys;
}

function sourceFiles(): string[] {
  const files: string[] = [];
  function walk(dir: string): void {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      const stat = statSync(full);
      if (stat.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(name)) files.push(full);
    }
  }
  walk(join(process.cwd(), 'src'));
  return files.filter((file) => !file.endsWith('ku.ts') && !file.endsWith('fa.ts'));
}

function usedKeys(files: string[]): Set<string> {
  const used = new Set<string>();
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;
      for (const match of line.matchAll(/\bt\(\s*'([^']*(?:\\'[^']*)*)'\s*,\s*'([^']*(?:\\'[^']*)*)'/g)) {
        used.add(match[1].replace(/\\'/g, "'").replace(/\\n/g, '\n'));
      }
      for (const match of line.matchAll(/\bt\(\s*"([^"]+)"\s*,\s*"([^"]+)"/g)) used.add(match[1]);
      for (const match of line.matchAll(/\b\w+Ar:\s*'([^']+)'/g)) used.add(match[1]);
      for (const match of line.matchAll(/\b(?:ar|titleAr|bodyAr):\s*'([^']+)'/g)) used.add(match[1]);
    }
  }
  return used;
}

const allSource = sourceFiles()
  .map((file) => readFileSync(file, 'utf8'))
  .join('\n');

describe('i18n dictionaries', () => {
  it('have exactly the same keys in Sorani and Persian', () => {
    expect(Object.keys(KU).sort()).toEqual(Object.keys(FA).sort());
  });

  it('have no empty translations', () => {
    expect(Object.values(KU).every((value) => value.trim().length > 0)).toBe(true);
    expect(Object.values(FA).every((value) => value.trim().length > 0)).toBe(true);
  });

  it('cover every statically referenced Arabic t() key', () => {
    const missing = [...usedKeys(sourceFiles())].filter(
      (key) => !Object.prototype.hasOwnProperty.call(KU, key) || !Object.prototype.hasOwnProperty.call(FA, key)
    );
    expect(missing).toEqual([]);
  });

  it('has no unused dictionary key', () => {
    const present = (key: string): boolean => {
      const single = key.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      const double = key.replace(/"/g, '\\"');
      return (
        allSource.includes(`'${single}'`) ||
        allSource.includes(`"${double}"`) ||
        allSource.includes('`' + key + '`') ||
        allSource.includes(key.replace(/\n/g, '\\n'))
      );
    };
    expect(Object.keys(KU).filter((key) => !present(key))).toEqual([]);
  });
});
