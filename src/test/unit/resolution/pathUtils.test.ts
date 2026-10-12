import { describe, expect, it } from 'vitest';
import {
  dirname,
  isRelativeSpecifier,
  joinPath,
  normalizePath,
  resolveRelative,
  walkAncestors,
} from '../../../shared/resolution/pathUtils';

describe('pathUtils', () => {
  it('normalizes slashes and dots', () => {
    expect(normalizePath('/a/b/../c')).toBe('/a/c');
    expect(normalizePath('a\\b\\c')).toBe('a/b/c');
  });

  it('dirname and joinPath', () => {
    expect(dirname('/proj/src/App.tsx')).toBe('/proj/src');
    expect(joinPath('/proj/src', './Card.module.scss')).toBe('/proj/src/Card.module.scss');
  });

  it('detects relative specifiers', () => {
    expect(isRelativeSpecifier('./x.svg')).toBe(true);
    expect(isRelativeSpecifier('../x.svg')).toBe(true);
    expect(isRelativeSpecifier('@/x.svg')).toBe(false);
  });

  it('resolveRelative against importer', () => {
    expect(resolveRelative('/proj/src/Card.tsx', './Card.module.scss')).toBe(
      '/proj/src/Card.module.scss',
    );
  });

  it('walkAncestors yields parents', () => {
    const dirs = [...walkAncestors('/proj/src/app/File.tsx')];
    expect(dirs[0]).toBe('/proj/src/app');
    expect(dirs).toContain('/proj');
    expect(dirs).toContain('/');
  });
});
