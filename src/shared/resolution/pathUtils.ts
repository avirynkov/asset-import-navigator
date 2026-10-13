/**
 * Path-string helpers for shared resolution.
 * Absolute paths, forward-slash normalized. No Node fs.
 */

export function normalizePath(p: string): string {
  if (!p) {
    return '';
  }
  const s = p.replace(/\\/g, '/');
  const isAbsolute = s.startsWith('/') || /^[A-Za-z]:\//.test(s);
  const parts = s.split('/');
  const out: string[] = [];
  for (const part of parts) {
    if (part === '' || part === '.') {
      if (part === '' && out.length === 0) {
        out.push('');
      }
      continue;
    }
    if (part === '..') {
      if (out.length > 0 && out[out.length - 1] !== '..' && out[out.length - 1] !== '') {
        out.pop();
      } else if (!isAbsolute) {
        out.push('..');
      }
      continue;
    }
    out.push(part);
  }
  if (out.length === 0) {
    return isAbsolute ? '/' : '.';
  }
  let result = out.join('/');
  if (isAbsolute && !result.startsWith('/') && !/^[A-Za-z]:\//.test(result)) {
    result = '/' + result;
  }
  // Preserve Windows drive absolute form: C:/...
  if (/^[A-Za-z]:$/.test(result)) {
    result += '/';
  }
  return result === '' && isAbsolute ? '/' : result;
}

export function dirname(p: string): string {
  const n = normalizePath(p);
  if (n === '/' || /^[A-Za-z]:\/$/.test(n)) {
    return n;
  }
  const idx = n.lastIndexOf('/');
  if (idx <= 0) {
    return n.startsWith('/') ? '/' : '.';
  }
  if (/^[A-Za-z]:\//.test(n) && idx === 2) {
    return n.slice(0, 3);
  }
  return n.slice(0, idx);
}

export function joinPath(...parts: string[]): string {
  if (parts.length === 0) {
    return '';
  }
  const filtered = parts.filter((p) => p !== '');
  if (filtered.length === 0) {
    return '';
  }
  return normalizePath(filtered.join('/'));
}

/** Walk from file path upward, yielding each directory including the file's directory. */
export function* walkAncestors(filePath: string): Generator<string> {
  let dir = dirname(normalizePath(filePath));
  const seen = new Set<string>();
  while (dir && !seen.has(dir)) {
    seen.add(dir);
    yield dir;
    if (dir === '/' || /^[A-Za-z]:\/$/.test(dir)) {
      break;
    }
    const next = dirname(dir);
    if (next === dir) {
      break;
    }
    dir = next;
  }
}

export function isRelativeSpecifier(specifier: string): boolean {
  return specifier.startsWith('./') || specifier.startsWith('../');
}

export function resolveRelative(importerPath: string, relativeSpecifier: string): string {
  return joinPath(dirname(importerPath), relativeSpecifier);
}
