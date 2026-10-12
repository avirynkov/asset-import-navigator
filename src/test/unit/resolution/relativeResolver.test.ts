import { describe, expect, it } from 'vitest';
import { resolveRelativeCandidate } from '../../../shared/resolution/relativeResolver';

describe('resolveRelativeCandidate (RES-01)', () => {
  it('resolves ./ against importer directory', () => {
    expect(
      resolveRelativeCandidate('/proj/src/components/Card.tsx', './Card.module.scss'),
    ).toBe('/proj/src/components/Card.module.scss');
  });

  it('resolves ../', () => {
    expect(
      resolveRelativeCandidate('/proj/src/components/Card.tsx', '../assets/icon.svg'),
    ).toBe('/proj/src/assets/icon.svg');
  });

  it('returns undefined for non-relative', () => {
    expect(resolveRelativeCandidate('/proj/src/App.tsx', '@/assets/icon.svg')).toBeUndefined();
  });
});
