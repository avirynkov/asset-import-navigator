import { describe, expect, it } from 'vitest';
import { resolveConfiguredAliasCandidate } from '../../../shared/resolution/configuredAliasResolver';

describe('resolveConfiguredAliasCandidate (RES-04)', () => {
  it('maps longest-prefix alias to absolute path', () => {
    const aliases = {
      '@': '/ws/src',
      '@assets/': '/ws/public/assets/',
    };
    expect(resolveConfiguredAliasCandidate('@assets/icon.svg', aliases)).toBe(
      '/ws/public/assets/icon.svg',
    );
  });

  it('prefers longer key', () => {
    const aliases = {
      '@': '/short',
      '@/': '/ws/src/',
    };
    expect(resolveConfiguredAliasCandidate('@/assets/icon.svg', aliases)).toBe(
      '/ws/src/assets/icon.svg',
    );
  });

  it('returns undefined when no alias matches', () => {
    expect(resolveConfiguredAliasCandidate('@/x.svg', {})).toBeUndefined();
  });
});
